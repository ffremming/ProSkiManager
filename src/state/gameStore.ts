// Game state store skeleton. Wire this to Zustand or your preferred store.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { baseInitialState, createInitialState, loadInitialState, raceCourses, raceConditions } from "../game/data/sampleData";
import { Athlete, GameState, Role, TransferCandidate } from "../game/domain/types";
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
  newGame: (playerTeamId?: string) => Promise<void>;
  endGame: () => void;
  refreshTransferMarket: () => void;
  buyTransferTarget: (athleteId: string) => void;
  listPlayerForTransfer: (athleteId: string, askingPrice: number) => void;
  setFormation: (teamId: string, slots: Record<string, string>, slotRoles: Record<string, Role>) => void;
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
        next = applyFatigueHealth(next);
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
        const prepLineup =
          state.racePrep?.raceId === raceId && state.racePrep.lineup?.length
            ? state.racePrep.lineup
            : pickTopLineup(team.athletes.map((id) => state.athletes[id]).filter(Boolean));
        const baseConditions = raceConditions[course.id];
        const prepConditions = state.racePrep?.raceId === raceId ? state.racePrep.conditions : undefined;
        const conditions = prepConditions || baseConditions;
        // Include all athletes in the race to populate full results/standings.
        const allAthletes = Object.values(state.athletes);
        const playerLineup = prepLineup.map((id) => state.athletes[id]).filter(Boolean);
        const lineup = Array.from(new Set([...playerLineup, ...allAthletes]));

        const snapshots = simulateRace({
          course,
          athletes: lineup,
          prep: state.racePrep,
          conditions,
          equipment: state.equipment,
        });

        set({
          ...state,
          hasStarted: true,
          activeRace: {
            raceId,
            courseId: course.id,
            snapshots,
            lineup: prepLineup,
            pacing: state.racePrep?.pacing,
            tactic: state.racePrep?.tactic,
            skiChoice: state.racePrep?.skiChoice,
            waxChoice: state.racePrep?.waxChoice,
            conditions,
          },
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

        // Auto-build race prep from formation if missing lineup.
        const playerTeamId = tempState.playerTeamId || Object.keys(tempState.teams)[0];
        if (!tempState.racePrep?.lineup?.length && tempState.formations?.[playerTeamId]?.slots) {
          const formation = tempState.formations[playerTeamId];
          const lineup = Array.from(new Set(Object.values(formation.slots).filter(Boolean)));
          const roles = Object.fromEntries(
            Object.entries(formation.roles || {}).map(([slotId, role]) => {
              const aid = formation.slots[slotId];
              return aid ? [aid, role] : null;
            }).filter(Boolean) as [string, Role][]
          );
          tempState = { ...tempState, racePrep: { raceId: next.id, lineup, pacing: "STEADY", roles } };
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

        // Apply race impact to player lineup (fatigue/morale)
        const playerTeamId = state.playerTeamId || Object.keys(state.teams)[0];
        const playerLineup = state.activeRace.lineup || state.teams[playerTeamId]?.athletes || [];
        const placements = new Map(results.map((r, idx) => [r.athleteId, idx]));
        const athletes = { ...state.athletes };
        playerLineup.forEach((id) => {
          const athlete = athletes[id];
          if (!athlete) return;
          const place = placements.get(id);
          const moraleDelta =
            place === undefined ? -2 : place < 3 ? 6 : place < 10 ? 3 : place < 20 ? 1 : -1;
          const pacingFatigue =
            state.activeRace.pacing === "AGGRESSIVE" ? 8 : state.activeRace.pacing === "DEFENSIVE" ? 3 : 6;
          const fatigueGain = 10 + pacingFatigue;
          const nextFatigue = clamp(athlete.state.fatigue + fatigueGain, 0, 100);
          const nextMorale = clamp(athlete.state.morale + moraleDelta, 0, 100);
          const health = nextFatigue > 96 ? "SICK" : athlete.state.health;
          athletes[id] = {
            ...athlete,
            state: { ...athlete.state, fatigue: nextFatigue, morale: nextMorale, health },
          };
        });

        set({
          ...state,
          athletes,
          finance,
          standings: { athletes: standingsAth, teams: standingsTeams },
          pastResults: [
            ...state.pastResults,
            {
              raceId: state.activeRace.raceId,
              results,
              meta: {
                lineup: state.activeRace.lineup,
                pacing: state.activeRace.pacing,
                tactic: state.activeRace.tactic,
                skiChoice: state.activeRace.skiChoice,
                waxChoice: state.activeRace.waxChoice,
                conditions: state.activeRace.conditions,
              },
            },
          ],
          activeRace: undefined,
          transferList:
            state.pastResults.length + 1 >= state.seasonRaces.length
              ? buildTransferCandidates(state, state.playerTeamId || Object.keys(state.teams)[0])
              : state.transferList,
        });
      },

      newGame: async (playerTeamId) => {
        const next = await loadInitialState(playerTeamId);
        next.hasStarted = true;
        set(() => ({ ...next }));
      },

      endGame: () => {
        const fresh = createInitialState();
        set(() => ({ ...fresh, hasStarted: false }));
      },

      refreshTransferMarket: () => {
        set((state) => {
          const playerTeamId = state.playerTeamId || Object.keys(state.teams)[0];
          const candidates = buildTransferCandidates(state, playerTeamId);
          return { ...state, transferList: candidates };
        });
      },

      listPlayerForTransfer: (athleteId, askingPrice) => {
        set((state) => {
          const athlete = state.athletes[athleteId];
          if (!athlete) return state;
          const exists = state.transferList.find((t) => t.athleteId === athleteId);
          const updated: TransferCandidate = {
            athleteId,
            askingPrice,
            status: "LISTED",
            interest: clamp(70 - athlete.state.fatigue / 2 + athlete.potential / 4, 10, 95),
          };
          const transferList = exists
            ? state.transferList.map((t) => (t.athleteId === athleteId ? updated : t))
            : [...state.transferList, updated];
          return { ...state, transferList };
        });
      },

      buyTransferTarget: (athleteId) => {
        set((state) => {
          const playerTeamId = state.playerTeamId || Object.keys(state.teams)[0];
          const candidate = state.transferList.find((c) => c.athleteId === athleteId);
          const athlete = state.athletes[athleteId];
          if (!candidate || !athlete) return state;
          const price = candidate.askingPrice;
          if (state.finance.balance < price) return state;

          const finance = {
            ...state.finance,
            balance: state.finance.balance - price,
            history: [
              ...state.finance.history,
              { week: state.currentWeek, delta: -price, reason: `Transfer fee for ${athlete.name}` },
            ],
          };

          const teams = { ...state.teams };
          const oldTeam = teams[athlete.teamId];
          if (oldTeam) {
            oldTeam.athletes = oldTeam.athletes.filter((id) => id !== athleteId);
          }
          const playerTeam = teams[playerTeamId];
          if (playerTeam) {
            playerTeam.athletes = Array.from(new Set([...playerTeam.athletes, athleteId]));
          }

          const updatedAthlete: Athlete = {
            ...athlete,
            teamId: playerTeamId,
            state: { ...athlete.state, morale: clamp(athlete.state.morale + 5, 0, 100) },
          };

          const transferList = state.transferList.filter((c) => c.athleteId !== athleteId);

          return {
            ...state,
            finance,
            teams,
            athletes: { ...state.athletes, [athleteId]: updatedAthlete },
            transferList,
          };
        });
      },

      setStaff: (staff) => {
        set((state) => ({ ...state, staff }));
      },

      setRacePrep: (prep) => {
        set((state) => ({ ...state, racePrep: prep }));
      },

      setFormation: (teamId, slots, slotRoles) => {
        set((state) => {
          const athletes = { ...state.athletes };
          Object.entries(slots).forEach(([slotId, athleteId]) => {
            const athlete = athletes[athleteId];
            if (!athlete) return;
            const assignedRole = slotRoles[slotId] || athlete.role;
            const isMatch = assignedRole === athlete.role;
            const moraleDelta = isMatch ? 4 : -2;
            const formDelta = isMatch ? 1 : -1;
            athletes[athleteId] = {
              ...athlete,
              state: {
                ...athlete.state,
                morale: clamp(athlete.state.morale + moraleDelta, 0, 100),
                form: clamp(athlete.state.form + formDelta, -20, 20),
              },
            };
          });

          const formations = {
            ...(state.formations || {}),
            [teamId]: { slots: { ...slots }, roles: { ...slotRoles }, lastUpdatedWeek: state.currentWeek },
          };

          return { ...state, athletes, formations };
        });
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

function pickTopLineup(athletes: Athlete[], limit = 8): string[] {
  const sorted = [...athletes].sort((a, b) => {
    const score = (ath: Athlete) =>
      ath.baseStats.endurance * 0.35 +
      ath.baseStats.climbing * 0.25 +
      ath.baseStats.flat * 0.2 +
      ath.baseStats.sprint * 0.1 +
      (20 - ath.state.fatigue) * 0.1;
    return score(b) - score(a);
  });
  return sorted.slice(0, limit).map((a) => a.id);
}

function buildTransferCandidates(state: GameState, playerTeamId: string): TransferCandidate[] {
  const standingsPoints = state.standings.athletes;
  const others = Object.values(state.athletes).filter((a) => a.teamId !== playerTeamId);
  const pool = others.slice(0, 40); // limit to top 40 external athletes for market.
  return pool.map((ath) => {
    const value = computeMarketValue(ath, standingsPoints);
    const interest = clamp(60 + (standingsPoints[ath.id] || 0) / 4 - ath.state.fatigue / 2, 10, 95);
    return {
      athleteId: ath.id,
      status: "LISTED",
      askingPrice: Math.round(value),
      interest,
    };
  });
}

function computeMarketValue(athlete: Athlete, standingsPoints: Record<string, number>) {
  const statsScore =
    athlete.baseStats.endurance * 0.35 +
    athlete.baseStats.climbing * 0.25 +
    athlete.baseStats.flat * 0.2 +
    athlete.baseStats.sprint * 0.2;
  const performance = standingsPoints[athlete.id] || 0;
  const ageCurve = athlete.age < 24 ? 1.08 : athlete.age > 34 ? 0.88 : athlete.age > 30 ? 0.94 : 1;
  const potentialBoost = athlete.potential * 10;
  const dynamic = performance * 500; // dynamic price uplift based on last season points.
  const base = 10000 + statsScore * 40 + potentialBoost;
  return base * ageCurve + dynamic;
}

function applyFatigueHealth(state: GameState): GameState {
  const athletes = { ...state.athletes };
  Object.values(athletes).forEach((ath) => {
    let health = ath.state.health;
    let fatigue = ath.state.fatigue;
    let morale = ath.state.morale;

    // Recover if low fatigue.
    if (fatigue < 40 && health !== "OK") {
      health = "OK";
    }

    // Overload risk.
    if (fatigue > 95) {
      health = "SICK";
      morale = clamp(morale - 5, 0, 100);
    }

    // Natural recovery tick.
    if (fatigue > 20) {
      fatigue = Math.max(0, fatigue - 5);
    }

    athletes[ath.id] = {
      ...ath,
      state: { ...ath.state, health, fatigue, morale },
    };
  });

  return { ...state, athletes };
}
