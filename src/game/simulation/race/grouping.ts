import { AthleteRuntime } from "./types";

export type Grouping = ReturnType<typeof computeGroups>;

export function computeGroups(state: AthleteRuntime[]) {
  const sorted = [...state].sort((a, b) => b.distance - a.distance);
  const map: Record<string, number> = {};
  const info: Record<number, { leader: string; size: number }> = {};
  const lanes: Record<string, number> = {};
  const laneAhead: Record<string, number> = {};
  const lastInLaneDistance: Record<number, number | undefined> = { 0: undefined, 1: undefined, 2: undefined };
  let groupId = 0;
  let lastDistance = Infinity;

  sorted.forEach((s) => {
    const gap = lastDistance - s.distance;
    if (gap > 8) {
      groupId += 1;
      lastDistance = s.distance;
      // Reset lane memory when starting a new group so spacing is isolated per pack.
      lastInLaneDistance[0] = undefined;
      lastInLaneDistance[1] = undefined;
      lastInLaneDistance[2] = undefined;
    }
    map[s.id] = groupId;
    if (!info[groupId]) info[groupId] = { leader: s.id, size: 0 };
    info[groupId].size += 1;

    const orderInGroup = info[groupId].size - 1;
    const offsets = [-0.6, 0, 0.6];
    const lane = orderInGroup % offsets.length;
    lanes[s.id] = offsets[lane];

    const prevDist = lastInLaneDistance[lane];
    if (prevDist !== undefined) {
      laneAhead[s.id] = prevDist;
    }
    lastInLaneDistance[lane] = s.distance;
  });

  return { map, info, lanes, laneAhead };
}
