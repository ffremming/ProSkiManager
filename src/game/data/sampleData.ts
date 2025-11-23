import {
  Athlete,
  FacilityLevels,
  FinanceState,
  GameState,
  Prospect,
  RaceCourse,
  SeasonRace,
  Sponsor,
  StaffMember,
  Team,
  EquipmentInventory,
  TransferCandidate,
  ScoutAssignment,
  RaceConditions,
} from "../domain/types";
import { athletePool, teamNames } from "./athletePool";

const okState = {
  form: 0,
  fatigue: 20,
  morale: 70,
  health: "OK" as const,
};

const excludedTopTeams = [
  "team-team-ragde-charge",
  "team-team-ramudden",
  "team-team-aker-d-hlie",
  "team-lager-157-ski-team",
  "team-team-eksj-hus",
];

function buildTeams(): { teams: Record<string, Team>; athletes: Record<string, Athlete> } {
  const baseAthletes: Record<string, Athlete> = {};
  const femaleOverrides = new Set<string>([
    "Emilie Fleten",
    "Anniken Gjerde Alnes",
    "Ida Dahl",
    "Magni Smedås",
    "Silje Theodorsen",
    "Kati Roivas",
    "Jenny Larsson",
  ]);
  athletePool.forEach((a) => {
    const gender: "M" | "F" | undefined = femaleOverrides.has(a.name) ? "F" : a.gender || undefined;
    baseAthletes[a.id] = { ...a, gender, state: { ...okState } };
  });

  const teams: Record<string, Team> = {};
  Object.entries(teamNames).forEach(([teamId, teamName]) => {
    const roster = athletePool.filter((a) => a.teamId === teamId).map((a) => a.id);
    teams[teamId] = {
      id: teamId,
      name: teamName,
      budget: 200_000,
      athletes: roster,
      reputation: 60,
    };
  });

  return { teams, athletes: baseAthletes };
}

export function pickRandomUnderdogTeam(teamIds: string[]) {
  const candidates = teamIds.filter((id) => !excludedTopTeams.includes(id));
  const pool = candidates.length ? candidates : teamIds;
  return pool[Math.floor(Math.random() * pool.length)];
}

const defaultStaff: StaffMember[] = [
  { id: "coach-1", name: "Lena Berg", role: "COACH", skill: 78, salary: 6000, focus: "ENDURANCE" },
  { id: "wax-1", name: "Mads Iversen", role: "WAX", skill: 74, salary: 4500 },
  { id: "physio-1", name: "Sara Holm", role: "PHYSIO", skill: 80, salary: 5000, focus: "RECOVERY" },
  { id: "scout-1", name: "Jonas Dahl", role: "SCOUT", skill: 70, salary: 4000 },
];

const defaultFacilities: FacilityLevels = {
  trainingCenter: 2,
  recoveryCenter: 2,
  altitudeAccess: 1,
};

const defaultSponsors: Sponsor[] = [
  {
    id: "sp-main",
    name: "Nordic Energy",
    tier: "MAIN",
    weeklyIncome: 12000,
    goal: { description: "Top 10 at Vasaloppet", targetWeek: 4, bonus: 30000 },
  },
  { id: "sp-co", name: "GlideWax Co", tier: "CO", weeklyIncome: 5000 },
  { id: "sp-eq", name: "SnowTech Skis", tier: "EQUIPMENT", weeklyIncome: 3000 },
];

const defaultEquipment: EquipmentInventory = {
  items: [
    { id: "ski-1", name: "SnowTech Glide", type: "SKI", grip: 60, glide: 80, cost: 1200, stock: 8 },
    { id: "ski-2", name: "Nordic GripPro", type: "SKI", grip: 80, glide: 65, cost: 1000, stock: 6 },
    { id: "wax-1", name: "GlideWax Cold", type: "WAX", grip: 55, glide: 75, cost: 200, stock: 20 },
  ],
};

const defaultTransferList: TransferCandidate[] = [
  { athleteId: "ath-haakon-holden", askingPrice: 15000, status: "LISTED", interest: 60 },
  { athleteId: "ath-mikael-gunnulfsen", askingPrice: 22000, status: "LISTED", interest: 45 },
  { athleteId: "ath-runar-skaug-mathisen", askingPrice: 32000, status: "NOT_FOR_SALE", interest: 30 },
];

const defaultScoutAssignments: ScoutAssignment[] = [
  { id: "scout-job-1", region: "Norway", weeksRemaining: 4, focus: "BALANCED" },
];

const defaultProspects: Prospect[] = [
  {
    id: "pros-1",
    name: "Emil Hagen",
    age: 19,
    potentialRange: [78, 90],
    role: "CAPTAIN",
    region: "Norway",
    notes: "Promising engine; needs technique work.",
  },
  {
    id: "pros-2",
    name: "Sanna Grön",
    age: 20,
    potentialRange: [75, 88],
    role: "SPRINTER",
    region: "Sweden",
    notes: "Fast finisher; low endurance ceiling.",
  },
];

export const raceConditions: Record<string, RaceConditions> = {
  vasaloppet: { temperatureC: -8, snow: "COLD", windKph: 5 },
  marcialonga: { temperatureC: -2, snow: "FRESH", windKph: 8 },
  jizerska: { temperatureC: -5, snow: "COLD", windKph: 6 },
  birken: { temperatureC: -4, snow: "FRESH", windKph: 10 },
  reistad: { temperatureC: -6, snow: "ICY", windKph: 12 },
  are: { temperatureC: -3, snow: "FRESH", windKph: 7 },
};

// Simple race courses placeholder.
export const raceCourses: Record<string, RaceCourse> = {
  vasaloppet: {
    id: "vasaloppet",
    name: "Vasaloppet",
    totalDistance: 90_000,
    segments: [
      { distance: 20_000, gradient: 2, difficulty: 2, isSprint: false, isClimb: false },
      { distance: 25_000, gradient: 4, difficulty: 4, isSprint: false, isClimb: true },
      { distance: 30_000, gradient: 1, difficulty: 2, isSprint: true, isClimb: false },
      { distance: 15_000, gradient: -2, difficulty: 1, isSprint: false, isClimb: false },
    ],
    sprints: [30000],
    climbs: [25000],
  },
  marcialonga: {
    id: "marcialonga",
    name: "Marcialonga",
    totalDistance: 70_000,
    segments: [
      { distance: 15_000, gradient: 1, difficulty: 2, isSprint: false, isClimb: false },
      { distance: 20_000, gradient: 3, difficulty: 3, isSprint: false, isClimb: true },
      { distance: 20_000, gradient: -1, difficulty: 2, isSprint: true, isClimb: false },
      { distance: 15_000, gradient: 5, difficulty: 4, isSprint: false, isClimb: true },
    ],
    sprints: [35000],
    climbs: [20000, 55000],
  },
  jizerska: {
    id: "jizerska",
    name: "Jizerská 50",
    totalDistance: 50_000,
    segments: [
      { distance: 15_000, gradient: 2, difficulty: 3, isSprint: false, isClimb: true },
      { distance: 20_000, gradient: 1, difficulty: 2, isSprint: true, isClimb: false },
      { distance: 15_000, gradient: -1, difficulty: 1, isSprint: false, isClimb: false },
    ],
    sprints: [25000],
    climbs: [10000],
  },
  birken: {
    id: "birken",
    name: "Birkebeinerrennet",
    totalDistance: 54_000,
    segments: [
      { distance: 18_000, gradient: 3, difficulty: 3, isSprint: false, isClimb: true },
      { distance: 18_000, gradient: 0, difficulty: 2, isSprint: true, isClimb: false },
      { distance: 18_000, gradient: -2, difficulty: 2, isSprint: false, isClimb: false },
    ],
    sprints: [30000],
    climbs: [15000],
  },
  reistad: {
    id: "reistad",
    name: "Reistadløpet",
    totalDistance: 50_000,
    segments: [
      { distance: 12_000, gradient: 5, difficulty: 4, isSprint: false, isClimb: true },
      { distance: 20_000, gradient: 1, difficulty: 2, isSprint: true, isClimb: false },
      { distance: 18_000, gradient: -3, difficulty: 3, isSprint: false, isClimb: false },
    ],
    sprints: [22000],
    climbs: [8000],
  },
  are: {
    id: "are",
    name: "Årefjällsloppet",
    totalDistance: 65_000,
    segments: [
      { distance: 20_000, gradient: 2, difficulty: 3, isSprint: false, isClimb: true },
      { distance: 25_000, gradient: 0, difficulty: 2, isSprint: true, isClimb: false },
      { distance: 20_000, gradient: -1, difficulty: 2, isSprint: false, isClimb: false },
    ],
    sprints: [30000],
    climbs: [15000],
  },
};

export const seasonRaces: SeasonRace[] = [
  { id: "race-1", courseId: "marcialonga", week: 3, type: "HILLY", prizeMoney: 40_000 },
  { id: "race-2", courseId: "jizerska", week: 4, type: "HILLY", prizeMoney: 30_000 },
  { id: "race-3", courseId: "vasaloppet", week: 5, type: "MARATHON", prizeMoney: 50_000 },
  { id: "race-4", courseId: "birken", week: 7, type: "HILLY", prizeMoney: 35_000 },
  { id: "race-5", courseId: "reistad", week: 9, type: "CLIMB", prizeMoney: 35_000 },
  { id: "race-6", courseId: "are", week: 11, type: "MARATHON", prizeMoney: 45_000 },
];

export const financeTemplate: FinanceState = {
  balance: 300_000,
  weeklyIncome: 20_000,
  weeklyExpenses: 0,
  history: [],
};

export function createInitialState(playerTeamId?: string): GameState {
  const { teams, athletes } = buildTeams();
  const chosenTeamId = playerTeamId || pickRandomUnderdogTeam(Object.keys(teams));
  return {
    currentWeek: 1,
    seasonLengthWeeks: 16,
    hasStarted: false,
    playerTeamId: chosenTeamId,
    teams,
    athletes,
    finance: { ...financeTemplate },
    staff: defaultStaff,
    facilities: defaultFacilities,
    sponsors: defaultSponsors,
    equipment: defaultEquipment,
    transferList: defaultTransferList,
    scoutAssignments: defaultScoutAssignments,
    prospects: defaultProspects,
    racePrep: undefined,
    trainingPlans: [],
    seasonRaces,
    pastResults: [],
    standings: { athletes: {}, teams: {} },
  };
}

export const baseInitialState = createInitialState();
