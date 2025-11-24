import { Athlete, RaceCourse, RaceSnapshot, clamp, RacePrep, RaceConditions, EquipmentInventory } from "../domain/types";

export type RaceInput = {
  course: RaceCourse;
  athletes: Athlete[];
  prep?: RacePrep;
  conditions?: RaceConditions;
  equipment?: EquipmentInventory;
};

// Generates snapshots for a single race to drive the visual layer.
export function simulateRace(input: RaceInput): RaceSnapshot[] {
  const snapshots: RaceSnapshot[] = [];
  const dt = 2; // seconds per tick.

  let t = 0;
  let state = input.athletes.map((athlete, idx) => ({
    id: athlete.id,
    distance: 0,
    energy: 100,
    laneOffset: mapLaneOffset(idx),
    athlete,
    effort: 1,
  }));

  const totalDistance = input.course.totalDistance;
  const tactic = input.prep?.tactic || "PROTECT_LEADER";
  const roleMap: Record<string, string> = input.prep?.roles || {};
  const gear = resolveGear(input);
  const conditions = input.conditions;

  const pacing = input.prep?.pacing || "STEADY";

  while (state.some((s) => s.distance < totalDistance)) {
    const groups = computeGroups(state);
    const snapshotAthletes = state.map((s) => ({
      id: s.id,
      distance: s.distance,
      laneOffset: s.laneOffset,
      energy: s.energy,
      effort: s.effort,
      groupId: groups.map[s.id],
    }));
    snapshots.push({
      t,
      athletes: snapshotAthletes,
    });

    state = state.map((s) =>
      advanceAthlete(s, dt, input.course, totalDistance, tactic, pacing, gear, conditions, groups, roleMap)
    );
    t += dt;
  }

  return snapshots;
}

type AthleteRuntime = {
  id: string;
  distance: number;
  energy: number;
  laneOffset: number;
  athlete: Athlete;
  effort: number;
};

function advanceAthlete(
  state: AthleteRuntime,
  dt: number,
  course: RaceCourse,
  totalDistance: number,
  tactic: string,
  pacing: RacePrep["pacing"] | undefined,
  gear: GearModifiers,
  conditions: RaceConditions | undefined,
  groups: ReturnType<typeof computeGroups>,
  roleMap: Record<string, string>
): AthleteRuntime {
  const stats = state.athlete.baseStats;
  const { form, fatigue, morale } = state.athlete.state;
  const segment = getSegmentForDistance(course, state.distance);
  const role = roleMap[state.id];

  const terrainFactor =
    segment.gradient > 2
      ? stats.climbing
      : segment.gradient < -2
      ? stats.technique
      : stats.flat;

  let power =
    (stats.endurance * 0.5 + terrainFactor * 0.4 + form * 0.2 - fatigue * 0.3 + morale * 0.1) /
    100;

  // Gender adjustment (females slightly slower overall while preserving relative differences)
  if (state.athlete.gender === "F") {
    power *= 0.9;
  }

  // Drafting and group effects
  const groupId = groups.map[state.id];
  const groupInfo = groups.info[groupId] || { leader: state.id, size: 1 };
  const isLeader = groupInfo.leader === state.id;
  const packBonus = isLeader ? 0.97 : 1.05;
  power *= packBonus;

  // Tactic influence
  const tacticEffort = tactic === "AGGRESSIVE" ? 1.15 : tactic === "DEFENSIVE" ? 0.9 : 1;
  power *= tacticEffort;
  const pacingEffort = pacing === "AGGRESSIVE" ? 1.08 : pacing === "DEFENSIVE" ? 0.94 : 1;
  power *= pacingEffort;
  const effort = tacticEffort * pacingEffort;

  // Role bonuses/penalties based on course profile
  if (role === "CAPTAIN") power *= 1.04;
  if (role === "SPRINTER" && segment.isSprint) power *= 1.08;
  if (role === "CLIMBER" && segment.isClimb) power *= 1.08;
  if (role === "DOMESTIQUE" && groupInfo.size > 1 && !isLeader) power *= 1.03;

  // Gear and conditions influence
  power *= gear.glideMod;
  const energyPenalty = gear.gripMod;

  if (conditions) {
    if (conditions.snow === "COLD") power *= 0.98;
    if (conditions.snow === "ICY") power *= 0.99;
    if (conditions.snow === "FRESH") power *= 0.97;
    if (conditions.windKph > 10) power *= 0.99;
  }

  power *= (state.energy / 100) ** 0.7;

  const speed = Math.max(0.5, power * 7); // m/s tuned later.

  const energyCost =
    dt *
    0.08 *
    segment.difficulty *
    (1 + Math.max(0, segment.gradient) / 10) *
    (pacing === "AGGRESSIVE" ? 1.2 : pacing === "DEFENSIVE" ? 0.85 : 1);

  const distance = Math.min(totalDistance, state.distance + speed * dt);
  const energy = clamp(state.energy - energyCost - energyPenalty, 0, 100);

  return { ...state, distance, energy, effort };
}

function getSegmentForDistance(course: RaceCourse, distance: number) {
  let covered = 0;
  for (const seg of course.segments) {
    if (distance <= covered + seg.distance) return seg;
    covered += seg.distance;
  }
  return course.segments[course.segments.length - 1];
}

type GearModifiers = { gripMod: number; glideMod: number };
function resolveGear(input: RaceInput): GearModifiers {
  const ski = input.equipment?.items.find((i) => i.id === input.prep?.skiChoice);
  const wax = input.equipment?.items.find((i) => i.id === input.prep?.waxChoice);
  const grip = ski?.grip ?? 70;
  const glide = ski?.glide ?? 70;
  const waxGrip = wax?.grip ?? 70;
  const waxGlide = wax?.glide ?? 70;

  const gripMod = (140 - (grip + waxGrip)) / 500; // better grip => lower penalty
  const glideMod = 0.9 + ((glide + waxGlide) / 200) * 0.2; // 0.9..1.1
  return { gripMod, glideMod };
}

function computeGroups(state: AthleteRuntime[]) {
  const sorted = [...state].sort((a, b) => b.distance - a.distance);
  const map: Record<string, number> = {};
  const info: Record<number, { leader: string; size: number }> = {};
  let groupId = 0;
  let lastDistance = Infinity;

  sorted.forEach((s) => {
    const gap = lastDistance - s.distance;
    if (gap > 8) {
      groupId += 1;
      lastDistance = s.distance;
    }
    map[s.id] = groupId;
    if (!info[groupId]) {
      info[groupId] = { leader: s.id, size: 0 };
    }
    info[groupId].size += 1;
  });

  return { map, info };
}

function mapLaneOffset(idx: number) {
  const laneSpacing = 0.7;
  const lane = idx % 6;
  const side = lane % 2 === 0 ? -1 : 1;
  const magnitude = Math.floor(lane / 2) + 0.5;
  return side * magnitude * laneSpacing;
}
