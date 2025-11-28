"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGameStore } from "../../state/gameStore";
import { TeamLogo } from "../../components/team/TeamLogo";

export default function TeamsPage() {
  const { teams, counts } = useGameStore((state) => {
    const teamsArr = Object.values(state.teams);
    const counts = Object.fromEntries(
      teamsArr.map((t) => [t.id, t.athletes.filter((a) => state.athletes[a]).length])
    );
    return { teams: teamsArr, counts };
  });

  const sorted = useMemo(() => teams.sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Teams</p>
            <h1 className="text-3xl font-semibold">All Ski Classics teams</h1>
            <p className="text-slate-300">Click a team to inspect its roster.</p>
          </div>
          <Link
            href="/team"
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
          >
            My team
          </Link>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((team) => (
            <Link
              key={team.id}
              href={`/team/${team.id}`}
              className="card border border-white/10 bg-white/5 p-4 shadow-lg shadow-blue-900/20 transition hover:-translate-y-1 hover:border-blue-400/50 hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <TeamLogo team={team} size={40} />
                  <div>
                    <div className="text-sm text-slate-300">Roster: {counts[team.id] ?? 0} skiers</div>
                    <div className="text-lg font-semibold text-slate-50">{team.name}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">Budget ${team.budget.toLocaleString("en-US")}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
