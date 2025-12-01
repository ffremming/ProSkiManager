import { clamp, RaceCourse, RacePrep, RaceConditions } from "../../domain/types";
import { AthleteRuntime } from "./types";
import { GearModifiers } from "./gear";
import { computeGroups, Grouping } from "./grouping";

export function advanceAthlete(
  state: AthleteRuntime,
  dt: number,
  course: RaceCourse,
  totalDistance: number,
  tactic: string,
  pacing: RacePrep["pacing"] | undefined,
  gear: GearModifiers,
  conditions: RaceConditions | undefined,
  groups: Grouping,
  roleMap: Record<string, string>,
  orders?: RacePrep["orders"]
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

  if (state.athlete.gender === "F") power *= 0.9;

  const groupId = groups.map[state.id];
  const groupInfo = groups.info[groupId] || { leader: state.id, size: 1 };
  const aheadDistance = groups.laneAhead[state.id];
  const isLeader = groupInfo.leader === state.id;
  power *= isLeader ? 0.98 : 1.06;

  const tacticEffort = tactic === "AGGRESSIVE" ? 1.15 : tactic === "DEFENSIVE" ? 0.9 : 1;
  const pacingEffort = pacing === "AGGRESSIVE" ? 1.08 : pacing === "DEFENSIVE" ? 0.94 : 1;
  const effort = tacticEffort * pacingEffort;
  power *= tacticEffort * pacingEffort;

  if (role === "CAPTAIN") power *= 1.04;
  if (role === "SPRINTER" && segment.isSprint) power *= 1.08;
  if (role === "CLIMBER" && segment.isClimb) power *= 1.08;
  if (role === "DOMESTIQUE" && groupInfo.size > 1 && !isLeader) power *= 1.03;

  if (orders?.protectLeader && role === "DOMESTIQUE" && groupInfo.size > 1) power *= 1.02;
  if (orders?.sprintFocus && segment.isSprint && role === "SPRINTER") power *= 1.05;
  if (orders?.climbFocus && segment.isClimb && role === "CLIMBER") power *= 1.05;
  if (orders?.aggression === "LOW") power *= 0.97;
  if (orders?.aggression === "HIGH") power *= 1.03;

  power *= gear.glideMod;
  const energyPenalty = gear.gripMod;

  if (conditions) {
    if (conditions.snow === "COLD") power *= 0.98;
    if (conditions.snow === "ICY") power *= 0.99;
    if (conditions.snow === "FRESH") power *= 0.97;
    if (conditions.windKph > 10) power *= 0.99;
  }

  power *= (state.energy / 100) ** 0.7;

  // Nudge baseline speed up so races play back at a snappier pace and better match the visual scale.
  let speed = Math.max(1.2, power * 9);

  const energyCostBase =
    dt *
    0.08 *
    segment.difficulty *
    (1 + Math.max(0, segment.gradient) / 10) *
    (pacing === "AGGRESSIVE" ? 1.2 : pacing === "DEFENSIVE" ? 0.85 : 1);
  const energyCost = energyCostBase * (isLeader ? 1.08 : 0.9);

  let distance = Math.min(totalDistance, state.distance + speed * dt);
  const minGap = 0.8;
  if (aheadDistance !== undefined) {
    const limit = Math.max(state.distance + 0.5, aheadDistance - minGap);
    if (distance > limit) {
      distance = limit;
      speed = Math.max(1.2, (distance - state.distance) / dt);
    }
  }
  const energy = clamp(state.energy - energyCost - energyPenalty, 0, 100);

  return { ...state, distance, energy, effort };
}

export function getSegmentForDistance(course: RaceCourse, distance: number) {
  let covered = 0;
  for (const seg of course.segments) {
    if (distance <= covered + seg.distance) return seg;
    covered += seg.distance;
  }
  return course.segments[course.segments.length - 1];
}

export function mapLaneOffset(idx: number) {
  const offsets = [-0.6, 0, 0.6];
  return offsets[idx % offsets.length];
}
