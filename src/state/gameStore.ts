// Game state store skeleton. Wire this to Zustand or your preferred store.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { baseInitialState, createInitialState, raceCourses } from "../game/data/sampleData";
import { GameState } from "../game/domain/types";
import { applyWeeklyFinance } from "../game/simulation/financeEngine";
import { applyWeeklyTraining } from "../game/simulation/trainingEngine";
import { simulateRace } from "../game/simulation/raceEngine";
import { clamp } from "../game/domain/types";

type GameActions = {
  advanceWeek: () => void;
  setTrainingPlans: (plans: GameState["trainingPlans"]) => void;
  startRace: (raceId: string) => void;
  startNextRace: () => void;
  finishRace: () => void;
  newGame: (playerTeamId?: string) => void;
  setStaff?: (staff: GameState["staff"]) => void;
  setRacePrep: (prep: GameState["racePrep"]) => void;
};

type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...baseInitialState,

      advanceWeek: () => {
        const state = get();
        let next: GameState = { ...state };
        next = applyWeeklyTraining(next);
        next = applyWeeklyFinance(next);
        next.currentWeek += 1;
        set(next);
      },

      setTrainingPlans: (plans) => {
        set((state) => ({ ...state, trainingPlans: plans }));
      },

      startRace: (raceId) => {
        const state = get();
        const race = state.seasonRaces.find((r) => r.id === raceId);
        if (!race) return;
        const course = raceCourses[race.courseId];
        if (!course) return;

        const playerTeamId = state.playerTeamId || Object.keys(state.teams)[0];
        const team = state.teams[playerTeamId];
        const prepLineup = state.racePrep?.lineup?.length ? state.racePrep.lineup : team.athletes;
        // Include all athletes in the race to populate full results/standings.
        const allAthletes = Object.values(state.athletes);
        const playerLineup = prepLineup.map((id) => state.athletes[id]).filter(Boolean);
        const lineup = Array.from(new Set([...playerLineup, ...allAthletes]));

        const snapshots = simulateRace({
          course,
          athletes: lineup,
          prep: state.racePrep,
      conditions: state.racePrep?.raceId === raceId ? state.racePrep.conditions : undefined,
      equipment: state.equipment,
    });

        set({
          ...state,
          hasStarted: true,
          activeRace: { raceId, courseId: course.id, snapshots },
        });
      },

      startNextRace: () => {
        const state = get();
        const completed = new Set(state.pastResults.map((r) => r.raceId));
        const upcoming = state.seasonRaces
          .filter((r) => !completed.has(r.id))
          .sort((a, b) => a.week - b.week);
        const next = upcoming[0];
        if (!next) return;

        // Advance weeks to the next race week, applying training/finance each week.
        let tempState: GameState = { ...state, athletes: { ...state.athletes }, finance: { ...state.finance } };
        while (tempState.currentWeek < next.week) {
          tempState = applyWeeklyTraining(tempState);
          tempState = applyWeeklyFinance(tempState);
          tempState.currentWeek += 1;
        }

        set({ ...tempState });
        get().startRace(next.id);
      },

      finishRace: () => {
        const state = get();
        if (!state.activeRace) return;
        const race = state.seasonRaces.find((r) => r.id === state.activeRace?.raceId);
        const finalSnapshot = state.activeRace.snapshots[state.activeRace.snapshots.length - 1];
        const ordered = [...finalSnapshot.athletes].sort((a, b) => b.distance - a.distance);
        const leader = ordered[0];
        const leaderTime = finalSnapshot.t;
        const leaderSpeed = leader.distance > 0 && leaderTime > 0 ? leader.distance / leaderTime : 1;
        const pointsTable = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 1, 1, 1, 1, 1];
        const results = ordered.map((a, idx) => {
          const gap = (leader.distance - a.distance) / Math.max(0.1, leaderSpeed);
          return {
            athleteId: a.id,
            time: leaderTime + gap,
            points: pointsTable[idx] || 0,
            teamId: state.athletes[a.id]?.teamId || "",
          };
        });

        // Update standings
        const standingsAth = { ...state.standings.athletes };
        const standingsTeams = { ...state.standings.teams };
        results.forEach((r) => {
          standingsAth[r.athleteId] = (standingsAth[r.athleteId] || 0) + r.points;
          standingsTeams[r.teamId] = (standingsTeams[r.teamId] || 0) + r.points;
        });

        // Prize money to player team if they placed top 3
        let finance = state.finance;
        if (race) {
          const playerId = state.playerTeamId;
          const topPlayer = results.find((r, idx) => idx < 3 && r.teamId === playerId);
          if (topPlayer) {
            finance = {
              ...finance,
              balance: finance.balance + race.prizeMoney,
              history: [
                ...finance.history,
                {
                  week: state.currentWeek,
                  delta: race.prizeMoney,
                  reason: `Prize money ${race.courseId}`,
                },
              ],
            };
          }
        }

        set({
          ...state,
          finance,
          standings: { athletes: standingsAth, teams: standingsTeams },
          pastResults: [
            ...state.pastResults,
            { raceId: state.activeRace.raceId, results },
          ],
          activeRace: undefined,
        });
      },

      newGame: (playerTeamId) => {
        const next = createInitialState(playerTeamId);
        next.hasStarted = true;
        set(() => ({ ...next }));
      },

      setStaff: (staff) => {
        set((state) => ({ ...state, staff }));
      },

      setRacePrep: (prep) => {
        set((state) => ({ ...state, racePrep: prep }));
      },
    }),
    {
      name: "ski-manager-save",
      partialize: (state) => {
        // Avoid persisting heavy race snapshots to stay within storage limits.
        const { activeRace, ...rest } = state;
        return rest;
      },
    }
  )
);
