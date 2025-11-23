"use client";

import { useMemo } from "react";
import { useGameStore } from "../../state/gameStore";

export default function StandingsPage() {
  const { standings, teams, athletes } = useGameStore((s) => ({
    standings: s.standings,
    teams: s.teams,
    athletes: s.athletes,
  }));

  const teamTable = useMemo(
    () => Object.entries(standings.teams).sort((a, b) => b[1] - a[1]),
    [standings.teams]
  );

  const athleteTable = useMemo(
    () => Object.entries(standings.athletes).sort((a, b) => b[1] - a[1]),
    [standings.athletes]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Standings</p>
          <h1 className="text-3xl font-semibold">Team & Athlete Points</h1>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm uppercase tracking-wide text-slate-300">Teams</div>
            <div className="mt-2 space-y-1 text-sm">
              {teamTable.map(([teamId, pts], idx) => (
                <div key={teamId} className="flex justify-between">
                  <span>
                    {idx + 1}. {teams[teamId]?.name || teamId}
                  </span>
                  <span className="text-xs text-slate-400">{pts} pts</span>
                </div>
              ))}
              {teamTable.length === 0 && <div className="text-slate-400 text-sm">No points yet.</div>}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm uppercase tracking-wide text-slate-300">Athletes</div>
            <div className="mt-2 space-y-1 text-sm">
              {athleteTable.map(([athId, pts], idx) => (
                <div key={athId} className="flex justify-between">
                  <span>
                    {idx + 1}. {athletes[athId]?.name || athId}
                  </span>
                  <span className="text-xs text-slate-400">{pts} pts</span>
                </div>
              ))}
              {athleteTable.length === 0 && <div className="text-slate-400 text-sm">No points yet.</div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
