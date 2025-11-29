import { Athlete, RaceCourse, RacePrep, RaceConditions, EquipmentInventory } from "../../domain/types";

export type RaceInput = {
  course: RaceCourse;
  athletes: Athlete[];
  prep?: RacePrep;
  conditions?: RaceConditions;
  equipment?: EquipmentInventory;
};

export type RaceStartState = {
  id: string;
  distance: number;
  energy: number;
  laneOffset: number;
};

export type AthleteRuntime = {
  id: string;
  distance: number;
  energy: number;
  laneOffset: number;
  athlete: Athlete;
  effort: number;
};
