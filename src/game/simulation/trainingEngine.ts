import {
  Athlete,
  GameState,
  WeeklyTrainingPlan,
  clamp,
} from "../domain/types";

// Applies training plans for one week and returns a new state snapshot.
export function applyWeeklyTraining(state: GameState): GameState {
  const newState: GameState = { ...state, athletes: { ...state.athletes } };

  const plansByAthlete: Record<string, WeeklyTrainingPlan> = {};
  state.trainingPlans.forEach((plan) => {
    plansByAthlete[plan.athleteId] = plan;
  });

  for (const athleteId of Object.keys(state.athletes)) {
    const athlete = { ...state.athletes[athleteId] };
    const plan = plansByAthlete[athleteId];
    if (!plan) continue;

    const updated = applyPlan(athlete, plan, state);
    newState.athletes[athleteId] = updated;
  }

  return newState;
}

function applyPlan(athlete: Athlete, plan: WeeklyTrainingPlan, state: GameState): Athlete {
  const coachBonus = getCoachBonus(state);
  const recoveryBonus = getRecoveryBonus(state);
  let fatigueGain = 0;
  let formDelta = 0;
  const statGain = { endurance: 0, climbing: 0, flat: 0, sprint: 0 };

  for (const session of plan.sessions) {
    switch (session.intensity) {
      case "EASY":
        fatigueGain += 3;
        formDelta += 1;
        break;
      case "MEDIUM":
        fatigueGain += 6;
        break;
      case "HARD":
        fatigueGain += 10;
        formDelta -= 2;
        break;
      case "REST":
        fatigueGain -= 8 * recoveryBonus;
        formDelta += 2;
        break;
    }

    if (session.intensity !== "REST") {
      switch (session.focus) {
        case "ENDURANCE":
          statGain.endurance += 0.2 * coachBonus;
          break;
        case "CLIMB":
          statGain.climbing += 0.2 * coachBonus;
          break;
        case "SPEED":
          statGain.sprint += 0.2 * coachBonus;
          break;
      }
    }
  }

  athlete.state = {
    ...athlete.state,
    fatigue: clamp(athlete.state.fatigue + fatigueGain, 0, 100),
    form: clamp(athlete.state.form + formDelta, -20, 20),
  };

  athlete.baseStats = {
    ...athlete.baseStats,
    endurance: cappedGain(athlete.baseStats.endurance, statGain.endurance, athlete.potential),
    climbing: cappedGain(athlete.baseStats.climbing, statGain.climbing, athlete.potential),
    flat: cappedGain(athlete.baseStats.flat, statGain.flat, athlete.potential),
    sprint: cappedGain(athlete.baseStats.sprint, statGain.sprint, athlete.potential),
  };

  return athlete;
}

function cappedGain(current: number, gain: number, potential: number) {
  return clamp(current + gain, 0, potential);
}

function getCoachBonus(state: GameState) {
  const coach = state.staff.find((s) => s.role === "COACH");
  const facility = state.facilities.trainingCenter || 1;
  const base = coach ? 1 + coach.skill / 200 : 1;
  return base + facility * 0.05;
}

function getRecoveryBonus(state: GameState) {
  const physio = state.staff.find((s) => s.role === "PHYSIO");
  const facility = state.facilities.recoveryCenter || 1;
  const base = physio ? 1 + physio.skill / 300 : 1;
  return base + facility * 0.05;
}
