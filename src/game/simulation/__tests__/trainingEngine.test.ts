import { applyWeeklyTraining } from "../trainingEngine";
import { GameState, WeeklyTrainingPlan } from "../../domain/types";

const baseAthlete = {
  id: "a1",
  name: "Test Skier",
  age: 25,
  potential: 90,
  role: "CAPTAIN" as const,
  baseStats: {
    endurance: 70,
    climbing: 70,
    flat: 70,
    sprint: 70,
    technique: 70,
    raceIQ: 70,
  },
  state: { form: 0, fatigue: 10, morale: 70, health: "OK" as const },
  contract: { salaryPerWeek: 1000, weeksRemaining: 52 },
  teamId: "t1",
};

const baseState: GameState = {
  currentWeek: 1,
  seasonLengthWeeks: 10,
  hasStarted: true,
  playerTeamId: "t1",
  teams: {
    t1: { id: "t1", name: "Test", budget: 100000, athletes: ["a1"], reputation: 50 },
  },
  athletes: { a1: baseAthlete },
  finance: { balance: 0, weeklyIncome: 0, weeklyExpenses: 0, history: [] },
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

describe("applyWeeklyTraining", () => {
  it("adjusts fatigue and form according to plan", () => {
    const plan: WeeklyTrainingPlan = {
      athleteId: "a1",
      sessions: [
        { day: 0, intensity: "HARD", focus: "ENDURANCE" },
        { day: 1, intensity: "REST", focus: "ENDURANCE" },
        { day: 2, intensity: "EASY", focus: "CLIMB" },
      ],
    };

    const updated = applyWeeklyTraining({ ...baseState, trainingPlans: [plan] });
    const athlete = updated.athletes["a1"];
    expect(athlete.state.fatigue).toBeGreaterThan(baseAthlete.state.fatigue);
    expect(athlete.state.form).not.toBe(0);
    expect(athlete.baseStats.endurance).toBeGreaterThan(70);
    expect(athlete.baseStats.climbing).toBeGreaterThan(70);
  });
});
