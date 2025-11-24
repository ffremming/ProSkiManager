import { RaceConditions, RaceCourse, SeasonRace } from "../domain/types";
import { getGameDataGateway } from "./gameDataGateway";
import { raceCourses as seedCourses, raceConditions as seedConditions, seasonRaces as seedSeason } from "./sampleData";

export type ReferenceData = {
  raceCourses: Record<string, RaceCourse>;
  raceConditions: Record<string, RaceConditions>;
  seasonRaces: SeasonRace[];
};

let cached: ReferenceData | null = null;
let inflight: Promise<ReferenceData> | null = null;

export function primeReferenceData(data: ReferenceData) {
  cached = data;
}

export async function loadReferenceData(): Promise<ReferenceData> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const gateway = getGameDataGateway();
      const [raceCourses, raceConditions, seasonRaces] = await Promise.all([
        gateway.fetchRaceCourses(),
        gateway.fetchRaceConditions(),
        gateway.fetchSeasonRaces(),
      ]);
      cached = { raceCourses, raceConditions, seasonRaces };
      return cached;
    } catch (err) {
      // Fallback to seed data if gateway fails; useful for offline dev.
      cached = {
        raceCourses: seedCourses,
        raceConditions: seedConditions,
        seasonRaces: seedSeason,
      };
      return cached;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
