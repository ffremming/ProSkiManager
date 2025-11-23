import { createInitialState, pickRandomUnderdogTeam } from "../sampleData";
import { athletePool, teamNames } from "../athletePool";

describe("createInitialState", () => {
  it("creates state with player team and athletes", () => {
    const state = createInitialState();
    expect(state.playerTeamId).toBeTruthy();
    const team = state.teams[state.playerTeamId];
    expect(team).toBeDefined();
    expect(team.athletes.length).toBeGreaterThan(0);
  });
});

describe("pickRandomUnderdogTeam", () => {
  it("avoids excluded teams when possible", () => {
    const ids = Object.keys(teamNames);
    const chosen = pickRandomUnderdogTeam(ids);
    expect(ids).toContain(chosen);
  });

  it("falls back when no candidates", () => {
    const chosen = pickRandomUnderdogTeam([]);
    expect(chosen).toBeUndefined();
  });
});

describe("athletePool integrity", () => {
  it("has unique ids", () => {
    const ids = athletePool.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
