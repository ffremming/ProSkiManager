import { RaceSnapshot, RacePrep, RaceConditions } from "../domain/types";
import { RaceInput, RaceStartState, AthleteRuntime } from "./race/types";
import { computeGroups } from "./race/grouping";
import { resolveGear } from "./race/gear";
import { advanceAthlete, mapLaneOffset } from "./race/advance";

type SimulatorOptions = {
  dt?: number;
  startTime?: number;
};

class RaceSimulator {
  private state: AthleteRuntime[];
  private snapshots: RaceSnapshot[] = [];
  private t: number;
  private readonly totalDistance: number;
  private readonly tactic: string;
  private readonly roleMap: Record<string, string>;
  private readonly pacing: RacePrep["pacing"] | undefined;
  private readonly orders: RacePrep["orders"] | undefined;
  private readonly gear = resolveGear(this.input);
  private readonly conditions: RaceConditions | undefined;
  private readonly dt: number;

  constructor(private input: RaceInput, startState?: RaceStartState[], options: SimulatorOptions = {}) {
    this.totalDistance = input.course.totalDistance;
    this.tactic = input.prep?.tactic || "PROTECT_LEADER";
    this.roleMap = input.prep?.roles || {};
    this.orders = input.prep?.orders;
    this.pacing = input.prep?.pacing || "STEADY";
    this.conditions = input.conditions;
    this.dt = options.dt ?? 2;
    this.t = options.startTime ?? 0;

    const athleteLookup = Object.fromEntries(input.athletes.map((a) => [a.id, a]));
    this.state = (startState || input.athletes.map((a, idx) => ({ id: a.id, distance: 0, energy: 100, laneOffset: mapLaneOffset(idx), athlete: a, effort: 1 })))
      .map((s, idx) => ({
        ...s,
        athlete: athleteLookup[s.id],
        laneOffset: s.laneOffset ?? mapLaneOffset(idx),
        effort: s.effort ?? 1,
      }))
      .filter((s) => s.athlete);
  }

  run(): RaceSnapshot[] {
    // Capture initial state at current time.
    this.snapshots.push(this.snapshot(this.state));

    const maxIterations = 25_000; // safety to avoid infinite loops on bad data.
    let iterations = 0;
    while (this.state.some((s) => s.distance < this.totalDistance) && iterations < maxIterations) {
      const groups = computeGroups(this.state);
      this.state = this.state.map((s) => ({ ...s, laneOffset: groups.lanes[s.id] ?? s.laneOffset }));

      this.state = this.state.map((s) =>
        advanceAthlete(
          s,
          this.dt,
          this.input.course,
          this.totalDistance,
          this.tactic,
          this.pacing,
          this.gear,
          this.conditions,
          groups,
          this.roleMap,
          this.orders
        )
      );

      this.t += this.dt;
      this.snapshots.push(this.snapshot(this.state));
      iterations += 1;
    }
    return this.snapshots;
  }

  private snapshot(state: AthleteRuntime[]): RaceSnapshot {
    const groups = computeGroups(state);
    return {
      t: this.t,
      athletes: state.map((s) => ({
        id: s.id,
        distance: s.distance,
        laneOffset: groups.lanes[s.id] ?? s.laneOffset,
        energy: s.energy,
        effort: s.effort,
        groupId: groups.map[s.id],
      })),
    };
  }
}

// Generates snapshots for a single race to drive the visual layer.
export function simulateRace(input: RaceInput, options: SimulatorOptions = {}): RaceSnapshot[] {
  return new RaceSimulator(input, undefined, options).run();
}

export function continueRace(
  input: RaceInput & { startState: RaceStartState[]; startTime?: number },
  options: SimulatorOptions = {}
): RaceSnapshot[] {
  return new RaceSimulator(input, input.startState, { dt: options.dt ?? 2, startTime: options.startTime ?? input.startTime }).run();
}

// Expose helpers for testing and reuse
export { computeGroups, resolveGear, mapLaneOffset, advanceAthlete };
