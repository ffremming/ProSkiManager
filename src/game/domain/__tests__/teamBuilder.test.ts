import { buildTeamFromBudget } from "../teamBuilder";
import { Athlete } from "../types";

const pool: Athlete[] = [
  {
    id: "a1",
    name: "Strong",
    age: 25,
    potential: 90,
    role: "CAPTAIN",
    baseStats: {
      endurance: 85,
      climbing: 82,
      flat: 80,
      sprint: 70,
      technique: 78,
      raceIQ: 80,
    },
    state: { form: 0, fatigue: 10, morale: 70, health: "OK" },
    contract: { salaryPerWeek: 9000, weeksRemaining: 52 },
    teamId: "free",
  },
  {
    id: "a2",
    name: "Value",
    age: 24,
    potential: 85,
    role: "SPRINTER",
    baseStats: {
      endurance: 75,
      climbing: 72,
      flat: 76,
      sprint: 82,
      technique: 72,
      raceIQ: 74,
    },
    state: { form: 0, fatigue: 10, morale: 70, health: "OK" },
    contract: { salaryPerWeek: 4000, weeksRemaining: 52 },
    teamId: "free",
  },
];

describe("buildTeamFromBudget", () => {
  it("fits athletes under budget and assigns teamId", () => {
    const { team, athletes, remainingBudget } = buildTeamFromBudget("t1", "Test", 10_000, pool);
    expect(team.id).toBe("t1");
    expect(Object.keys(athletes).length).toBeGreaterThan(0);
    Object.values(athletes).forEach((a) => expect(a.teamId).toBe("t1"));
    expect(remainingBudget).toBeGreaterThanOrEqual(0);
  });
});
