import { simulateRace } from "../raceEngine";
import { RaceCourse, Athlete } from "../../domain/types";

const course: RaceCourse = {
  id: "test-course",
  name: "Test",
  totalDistance: 1000,
  segments: [
    { distance: 400, gradient: 1, difficulty: 2, isSprint: false, isClimb: false },
    { distance: 300, gradient: 4, difficulty: 3, isSprint: false, isClimb: true },
    { distance: 300, gradient: -2, difficulty: 1, isSprint: true, isClimb: false },
  ],
};

const athlete: Athlete = {
  id: "a1",
  name: "Test Skier",
  age: 26,
  potential: 85,
  role: "CAPTAIN",
  baseStats: {
    endurance: 80,
    climbing: 78,
    flat: 75,
    sprint: 70,
    technique: 74,
    raceIQ: 72,
  },
  state: { form: 0, fatigue: 20, morale: 70, health: "OK" },
  contract: { salaryPerWeek: 1000, weeksRemaining: 52 },
  teamId: "t1",
};

describe("simulateRace", () => {
  it("produces snapshots until finish", () => {
    const snapshots = simulateRace({ course, athletes: [athlete], prep: { raceId: "r", lineup: ["a1"], pacing: "STEADY" } as any });
    expect(snapshots.length).toBeGreaterThan(1);
    const last = snapshots[snapshots.length - 1];
    expect(last.athletes[0].distance).toBeGreaterThanOrEqual(course.totalDistance - 1);
  });
});
