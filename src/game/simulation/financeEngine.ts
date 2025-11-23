import { GameState } from "../domain/types";

// Updates weekly balance based on income and salaries.
export function applyWeeklyFinance(state: GameState): GameState {
  const newState: GameState = { ...state, finance: { ...state.finance } };

  const salary = Object.values(state.athletes).reduce(
    (sum, a) => sum + a.contract.salaryPerWeek,
    0
  );

  const income = state.finance.weeklyIncome;
  const delta = income - salary;

  newState.finance = {
    ...newState.finance,
    balance: newState.finance.balance + delta,
    weeklyExpenses: salary,
    history: [
      ...newState.finance.history,
      {
        week: state.currentWeek,
        delta,
        reason: "Weekly finances",
      },
    ],
  };

  return newState;
}
