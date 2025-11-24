// Core types for Ski Classics Manager domain logic.
export type StatValue = number; // 0–100 scale.

export type AthleteStats = {
  endurance: StatValue;
  climbing: StatValue;
  flat: StatValue;
  sprint: StatValue;
  technique: StatValue;
  raceIQ: StatValue;
};

export type AthleteState = {
  form: number; // -20 .. +20 short-term boost/penalty.
  fatigue: number; // 0 .. 100, higher = tired.
  morale: number; // 0 .. 100.
  health: "OK" | "SICK" | "INJURED";
  injury?: {
    type: string;
    weeksRemaining: number;
    severity: "MINOR" | "MAJOR";
  };
};

export type AthleteContract = {
  salaryPerWeek: number;
  weeksRemaining: number;
};

export type Role = "CAPTAIN" | "DOMESTIQUE" | "SPRINTER" | "CLIMBER";

export type Athlete = {
  id: string;
  name: string;
  age: number;
  potential: StatValue; // ceiling for long-term growth.
  role: Role;
  gender?: "M" | "F";
  traits?: string[]; // e.g. diesel, descender, cold-specialist.
  baseStats: AthleteStats;
  state: AthleteState;
  contract: AthleteContract;
  teamId: string;
};

export type Team = {
  id: string;
  name: string;
  budget: number;
  athletes: string[]; // athlete ids.
  reputation: number; // 0..100.
};

export type TrainingIntensity = "EASY" | "MEDIUM" | "HARD" | "REST";
export type TrainingFocus = "ENDURANCE" | "CLIMB" | "SPEED";

export type WeeklyTrainingPlan = {
  athleteId: string;
  sessions: {
    day: number; // 0..6.
    intensity: TrainingIntensity;
    focus: TrainingFocus;
  }[];
};

export type RaceSegment = {
  distance: number; // meters.
  gradient: number; // %.
  difficulty: number; // 1–5 heuristic.
  isSprint: boolean;
  isClimb: boolean;
};

export type RaceCourse = {
  id: string;
  name: string;
  totalDistance: number; // meters.
  segments: RaceSegment[];
  sprints?: number[]; // meters from start.
  climbs?: number[]; // meters from start.
};

export type RaceType = "MARATHON" | "HILLY" | "SPRINTY";

export type SeasonRace = {
  id: string;
  courseId: string;
  week: number; // race occurs this week.
  type: RaceType;
  prizeMoney: number;
};

export type FinanceState = {
  balance: number;
  weeklyIncome: number;
  weeklyExpenses: number;
  history: {
    week: number;
    delta: number;
    reason: string;
  }[];
};

export type StaffRole = "COACH" | "WAX" | "PHYSIO" | "SCOUT";

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  skill: number; // 0-100 effectiveness.
  salary: number;
  focus?: "ENDURANCE" | "CLIMB" | "SPRINT" | "TECHNIQUE" | "RECOVERY";
};

export type FacilityLevels = {
  trainingCenter: number; // 1-5
  recoveryCenter: number;
  altitudeAccess: number;
};

export type Sponsor = {
  id: string;
  name: string;
  tier: "MAIN" | "CO" | "EQUIPMENT";
  weeklyIncome: number;
  goal?: {
    description: string;
    targetWeek: number;
    bonus: number;
  };
};

export type EquipmentItem = {
  id: string;
  name: string;
  type: "SKI" | "WAX";
  grip: number;
  glide: number;
  cost: number;
  stock: number;
};

export type EquipmentInventory = {
  items: EquipmentItem[];
};

export type TransferStatus = "LISTED" | "FREE" | "LOAN" | "NOT_FOR_SALE";

export type TransferCandidate = {
  athleteId: string;
  askingPrice: number;
  status: TransferStatus;
  interest: number; // 0-100 likelihood to join.
};

export type ScoutAssignment = {
  id: string;
  region: string;
  weeksRemaining: number;
  focus: "ENDURANCE" | "SPRINT" | "BALANCED";
};

export type Prospect = {
  id: string;
  name: string;
  age: number;
  potentialRange: [number, number];
  role: Role;
  region: string;
  notes?: string;
};

export type RacePrep = {
  raceId: string;
  lineup: string[]; // athlete ids
  skiChoice?: string; // equipment item id
  waxChoice?: string; // equipment item id
  pacing: "DEFENSIVE" | "STEADY" | "AGGRESSIVE";
  roles?: Record<string, Role>;
  tactic?: "PROTECT_LEADER" | "SPRINT_POINTS" | "BREAKAWAY" | "SURVIVE";
  conditions?: RaceConditions;
};

export type RaceConditions = {
  temperatureC: number;
  snow: "COLD" | "WET" | "ICY" | "FRESH";
  windKph: number;
};

export type RaceSnapshot = {
  t: number; // seconds from gun.
  athletes: {
    id: string;
    distance: number; // meters from start.
    laneOffset: number; // lateral offset for visuals.
    energy: number;
    effort?: number;
    groupId?: number;
  }[];
  gaps?: Record<string, number>; // seconds to leader
};

export type ActiveRaceState = {
  raceId: string;
  courseId: string;
  snapshots: RaceSnapshot[];
  lineup: string[];
  pacing?: RacePrep["pacing"];
  tactic?: RacePrep["tactic"];
  skiChoice?: string;
  waxChoice?: string;
  conditions?: RaceConditions;
};

export type RaceResultSummary = {
  raceId: string;
  results: { athleteId: string; time: number; points: number; teamId: string }[];
  meta?: {
    lineup?: string[];
    pacing?: RacePrep["pacing"];
    tactic?: RacePrep["tactic"];
    skiChoice?: string;
    waxChoice?: string;
    conditions?: RaceConditions;
  };
};

export type Standings = {
  athletes: Record<string, number>; // points
  teams: Record<string, number>; // points
};

export type TeamFormation = {
  slots: Record<string, string>; // slotId -> athleteId
  roles: Record<string, Role>; // slotId -> role label
  lastUpdatedWeek?: number;
};

export type GameState = {
  currentWeek: number;
  seasonLengthWeeks: number;
  hasStarted: boolean;
  playerTeamId: string;
  teams: Record<string, Team>;
  athletes: Record<string, Athlete>;
  finance: FinanceState;
  staff: StaffMember[];
  facilities: FacilityLevels;
  sponsors: Sponsor[];
  equipment: EquipmentInventory;
  transferList: TransferCandidate[];
  scoutAssignments: ScoutAssignment[];
  prospects: Prospect[];
  racePrep?: RacePrep;
  trainingPlans: WeeklyTrainingPlan[];
  seasonRaces: SeasonRace[];
  pastResults: RaceResultSummary[];
  standings: Standings;
  activeRace?: ActiveRaceState;
  formations?: Record<string, TeamFormation>;
};

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
