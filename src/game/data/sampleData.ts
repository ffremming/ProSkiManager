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
  TransferRequest,
  TransferAd,
} from "../domain/types";
import { GameDataGateway, getGameDataGateway, setGameDataGateway } from "./gameDataGateway";
import { athletePool, teamNames } from "./athletePool";
import generatedSkiers from "./generated/skiers.generated.json";
import generatedTeams from "./generated/teams.generated.json";
import generatedAthleteImages from "./generated/athleteImages.generated.json";

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

  // Merge metadata from generated skiers (name/born/ranking) onto existing athletes by slug of name.
  const byName = Object.fromEntries(
    Object.values(baseAthletes).map((a) => [slugify(a.name), a.id])
  );
  const imagesBySlug = new Map<string, string>();
  (generatedAthleteImages as any[]).forEach((p) => {
    const key = slugify(p.athleteId || p.id || p.name || "");
    if (!key) return;
    const normalizeLocal = (loc: string) => {
      if (!loc) return loc;
      // strip any absolute prefixes and /public segment
      const cleaned = loc.replace(/^.*public\//, "").replace(/^\/?/, "/");
      return cleaned.startsWith("/public/") ? cleaned.replace("/public", "") : cleaned;
    };
    if (p.local) {
      imagesBySlug.set(key, normalizeLocal(p.local));
    } else if (p.url) {
      imagesBySlug.set(key, p.url);
    }
  });

  (generatedSkiers as any[]).forEach((s) => {
    const slug = slugify(s.name || "");
    const id = byName[slug];
    if (id && baseAthletes[id]) {
      baseAthletes[id] = {
        ...baseAthletes[id],
        // Keep stats; update name if needed.
        name: s.name || baseAthletes[id].name,
        photo: imagesBySlug.get(slug) || imagesBySlug.get(slugify(id)) || (baseAthletes[id] as any).photo,
        // Store extra info in traits for quick display.
        traits: Array.from(
          new Set([
            ...(baseAthletes[id].traits || []),
            s.ranking ? `Ranking: ${s.ranking}` : null,
            s.proTourEvents ? `Pro Tour: ${s.proTourEvents}` : null,
            s.challengers ? `Challengers: ${s.challengers}` : null,
            s.born ? `Born: ${s.born}` : null,
          ].filter(Boolean) as string[])
        ),
      };
    }
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

  // Inject logos from generated teams if downloaded.
  const teamLogoMap = new Map<string, string>();
  (generatedTeams as any[]).forEach((t) => {
    if (t.name) {
      const slug = slugify(t.name);
      teamLogoMap.set(slug, `/team-logos/${slug}.png`);
    }
  });

  Object.values(teams).forEach((team) => {
    const slug = slugify(team.name);
    const logo = teamLogoMap.get(slug);
    if (logo) {
      (team as any).logo = logo;
    }
  });

  return { teams, athletes: baseAthletes };
}

function slugify(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
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
    { id: "ski-3", name: "Feather Carbon", type: "SKI", grip: 68, glide: 85, cost: 1500, stock: 4 },
    { id: "wax-2", name: "KickMax Warm", type: "WAX", grip: 80, glide: 60, cost: 180, stock: 14 },
    { id: "wax-3", name: "Midnight Fluoro", type: "WAX", grip: 65, glide: 88, cost: 260, stock: 10 },
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

type SeedDataSnapshot = {
  teams: Record<string, Team>;
  athletes: Record<string, Athlete>;
  staff: StaffMember[];
  facilities: FacilityLevels;
  sponsors: Sponsor[];
  equipment: EquipmentInventory;
  transferList: TransferCandidate[];
  transferRequests: TransferRequest[];
  transferAds: Record<string, TransferAd>;
  scoutAssignments: ScoutAssignment[];
  prospects: Prospect[];
  raceCourses: Record<string, RaceCourse>;
  raceConditions: Record<string, RaceConditions>;
  seasonRaces: SeasonRace[];
  financeTemplate: FinanceState;
};

const { teams: seedTeams, athletes: seedAthletes } = buildTeams();

const seedSnapshot: SeedDataSnapshot = {
  teams: seedTeams,
  athletes: seedAthletes,
  staff: defaultStaff,
  facilities: defaultFacilities,
  sponsors: defaultSponsors,
  equipment: defaultEquipment,
  transferList: defaultTransferList,
  transferRequests: [],
  transferAds: {},
  scoutAssignments: defaultScoutAssignments,
  prospects: defaultProspects,
  raceCourses,
  raceConditions,
  seasonRaces,
  financeTemplate,
};

class InMemoryGameDataGateway implements GameDataGateway {
  constructor(private readonly snapshot: SeedDataSnapshot) {}

  fetchTeams() {
    return Promise.resolve({ ...this.snapshot.teams });
  }
  fetchAthletes() {
    return Promise.resolve({ ...this.snapshot.athletes });
  }
  fetchStaff() {
    return Promise.resolve([...this.snapshot.staff]);
  }
  fetchFacilities() {
    return Promise.resolve({ ...this.snapshot.facilities });
  }
  fetchSponsors() {
    return Promise.resolve([...this.snapshot.sponsors]);
  }
  fetchEquipment() {
    return Promise.resolve({ items: [...this.snapshot.equipment.items] });
  }
  fetchTransferList() {
    return Promise.resolve([...this.snapshot.transferList]);
  }
  fetchScoutAssignments() {
    return Promise.resolve([...this.snapshot.scoutAssignments]);
  }
  fetchProspects() {
    return Promise.resolve([...this.snapshot.prospects]);
  }
  fetchSeasonRaces() {
    return Promise.resolve([...this.snapshot.seasonRaces]);
  }
  fetchFinanceTemplate() {
    return Promise.resolve({ ...this.snapshot.financeTemplate, history: [] });
  }
  fetchRaceConditions() {
    return Promise.resolve({ ...this.snapshot.raceConditions });
  }
  fetchRaceCourses() {
    return Promise.resolve({ ...this.snapshot.raceCourses });
  }
}

const seedGateway = new InMemoryGameDataGateway(seedSnapshot);
setGameDataGateway(seedGateway);

export function buildInitialStateFromSnapshot(snapshot: SeedDataSnapshot, playerTeamId?: string): GameState {
  const teams = Object.fromEntries(
    Object.entries(snapshot.teams).map(([id, team]) => [id, { ...team, athletes: [...team.athletes] }])
  );
  const athletes = Object.fromEntries(
    Object.entries(snapshot.athletes).map(([id, athlete]) => [id, { ...athlete, state: { ...athlete.state } }])
  );
  const chosenTeamId = playerTeamId || pickRandomUnderdogTeam(Object.keys(teams));
  return {
    currentWeek: 1,
    seasonLengthWeeks: 16,
    hasStarted: false,
    playerTeamId: chosenTeamId,
    teams,
    athletes,
    finance: { ...snapshot.financeTemplate },
    staff: snapshot.staff.map((s) => ({ ...s })),
    facilities: { ...snapshot.facilities },
    sponsors: snapshot.sponsors.map((s) => ({ ...s, goal: s.goal ? { ...s.goal } : undefined })),
    equipment: { items: snapshot.equipment.items.map((i) => ({ ...i })) },
    transferList: snapshot.transferList.map((t) => ({ ...t })),
    transferRequests: snapshot.transferRequests.map((t) => ({ ...t })),
    transferAds: { ...snapshot.transferAds },
    scoutAssignments: snapshot.scoutAssignments.map((s) => ({ ...s })),
    prospects: snapshot.prospects.map((p) => ({ ...p })),
    racePrep: undefined,
    trainingPlans: [],
    seasonRaces: snapshot.seasonRaces,
    pastResults: [],
    standings: { athletes: {}, teams: {} },
    formations: {},
  };
}

export async function loadInitialState(playerTeamId?: string, gateway: GameDataGateway = getGameDataGateway()) {
  const [
    teams,
    athletes,
    staff,
    facilities,
    sponsors,
    equipment,
    transferList,
    scoutAssignments,
    prospects,
    raceCoursesData,
    raceConditionsData,
    seasonRaceData,
    financeState,
  ] = await Promise.all([
    gateway.fetchTeams(),
    gateway.fetchAthletes(),
    gateway.fetchStaff(),
    gateway.fetchFacilities(),
    gateway.fetchSponsors(),
    gateway.fetchEquipment(),
    gateway.fetchTransferList(),
    gateway.fetchScoutAssignments(),
    gateway.fetchProspects(),
    gateway.fetchRaceCourses(),
    gateway.fetchRaceConditions(),
    gateway.fetchSeasonRaces(),
    gateway.fetchFinanceTemplate(),
  ]);

  // Update reference exports for the rest of the app when using non-seed gateway.
  Object.assign(raceCourses, raceCoursesData);
  Object.assign(raceConditions, raceConditionsData);
  seasonRaces.splice(0, seasonRaces.length, ...seasonRaceData);

  const snapshot: SeedDataSnapshot = {
    teams,
    athletes,
    staff,
    facilities,
    sponsors,
    equipment,
    transferList,
    transferRequests: [],
    transferAds: {},
    scoutAssignments,
    prospects,
    raceCourses: raceCoursesData,
    raceConditions: raceConditionsData,
    seasonRaces: seasonRaceData,
    financeTemplate: financeState,
  };

  return buildInitialStateFromSnapshot(snapshot, playerTeamId);
}

export function createInitialState(playerTeamId?: string): GameState {
  // Uses seed snapshot synchronously; swap to loadInitialState for async gateways.
  return buildInitialStateFromSnapshot(seedSnapshot, playerTeamId);
}

export const baseInitialState = createInitialState();

export function configureGameDataGateway(gateway: GameDataGateway) {
  setGameDataGateway(gateway);
}
