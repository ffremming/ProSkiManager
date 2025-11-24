import {
  Athlete,
  EquipmentInventory,
  FacilityLevels,
  FinanceState,
  Prospect,
  RaceConditions,
  RaceCourse,
  SeasonRace,
  ScoutAssignment,
  Sponsor,
  StaffMember,
  Team,
  TransferCandidate,
} from "../domain/types";

// Data access abstraction so we can swap in a real database later.
export interface GameDataGateway {
  fetchTeams(): Promise<Record<string, Team>>;
  fetchAthletes(): Promise<Record<string, Athlete>>;
  fetchStaff(): Promise<StaffMember[]>;
  fetchFacilities(): Promise<FacilityLevels>;
  fetchSponsors(): Promise<Sponsor[]>;
  fetchEquipment(): Promise<EquipmentInventory>;
  fetchTransferList(): Promise<TransferCandidate[]>;
  fetchScoutAssignments(): Promise<ScoutAssignment[]>;
  fetchProspects(): Promise<Prospect[]>;
  fetchSeasonRaces(): Promise<SeasonRace[]>;
  fetchFinanceTemplate(): Promise<FinanceState>;
  fetchRaceConditions(): Promise<Record<string, RaceConditions>>;
  fetchRaceCourses(): Promise<Record<string, RaceCourse>>;
}

let activeGateway: GameDataGateway | null = null;

export function setGameDataGateway(gateway: GameDataGateway) {
  activeGateway = gateway;
}

export function getGameDataGateway(): GameDataGateway {
  if (!activeGateway) {
    throw new Error("GameDataGateway not configured");
  }
  return activeGateway;
}
