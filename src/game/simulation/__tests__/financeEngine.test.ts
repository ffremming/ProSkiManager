import { applyWeeklyFinance } from "../financeEngine";
import { GameState } from "../../domain/types";

const baseState: GameState = {
  currentWeek: 1,
  seasonLengthWeeks: 10,
  hasStarted: true,
  playerTeamId: "t1",
  teams: {
    t1: { id: "t1", name: "Test", budget: 100000, athletes: ["a1"], reputation: 50 },
  },
  athletes: {
    a1: {
      id: "a1",
      name: "Test Skier",
      age: 25,
      potential: 80,
      role: "CAPTAIN",
      baseStats: {
        endurance: 70,
        climbing: 70,
        flat: 70,
        sprint: 70,
        technique: 70,
        raceIQ: 70,
      },
      state: { form: 0, fatigue: 10, morale: 70, health: "OK" },
      contract: { salaryPerWeek: 2000, weeksRemaining: 52 },
      teamId: "t1",
    },
  },
  finance: { balance: 10000, weeklyIncome: 5000, weeklyExpenses: 0, history: [] },
  staff: [],
  facilities: { trainingCenter: 1, recoveryCenter: 1, altitudeAccess: 0 },
  sponsors: [],
  equipment: { items: [] },
  trainingPlans: [],
  transferList: [],
  scoutAssignments: [],
  prospects: [],
  seasonRaces: [],
  pastResults: [],
};

describe("applyWeeklyFinance", () => {
  it("deducts salary and adds income", () => {
    const updated = applyWeeklyFinance(baseState);
    expect(updated.finance.balance).toBe(10000 + 5000 - 2000);
    expect(updated.finance.weeklyExpenses).toBe(2000);
    expect(updated.finance.history).toHaveLength(1);
  });
});
