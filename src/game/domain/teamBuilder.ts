import { Athlete, Team } from "./types";

type BuildResult = {
  team: Team;
  athletes: Record<string, Athlete>;
  remainingBudget: number;
};

// Creates a roster under a salary budget using a simple value/price ratio.
export function buildTeamFromBudget(
  teamId: string,
  teamName: string,
  budget: number,
  candidates: Athlete[]
): BuildResult {
  let remaining = budget;
  const roster: Athlete[] = [];

  const scored = candidates.map((a) => ({
    athlete: a,
    score: overallScore(a) / Math.max(1, a.contract.salaryPerWeek),
  }));

  scored
    .sort((a, b) => b.score - a.score)
    .forEach(({ athlete }) => {
      if (athlete.contract.salaryPerWeek <= remaining) {
        const signed = {
          ...athlete,
          teamId,
        };
        remaining -= athlete.contract.salaryPerWeek;
        roster.push(signed);
      }
    });

  const athletes: Record<string, Athlete> = {};
  roster.forEach((a) => {
    athletes[a.id] = a;
  });

  const team: Team = {
    id: teamId,
    name: teamName,
    budget: budget,
    athletes: roster.map((a) => a.id),
    reputation: 55,
  };

  return { team, athletes, remainingBudget: remaining };
}

function overallScore(a: Athlete) {
  const s = a.baseStats;
  return (
    s.endurance * 0.35 +
    s.climbing * 0.25 +
    s.flat * 0.15 +
    s.sprint * 0.1 +
    s.technique * 0.1 +
    s.raceIQ * 0.05
  );
}
