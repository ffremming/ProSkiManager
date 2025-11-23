"use client";

import { useGameStore } from "../../state/gameStore";

export default function SponsorsPage() {
  const sponsors = useGameStore((s) => s.sponsors);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Sponsors</p>
          <h1 className="text-3xl font-semibold">Deals & Objectives</h1>
          <p className="text-slate-300">Track income, goals, and bonuses from your partners.</p>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          {sponsors.map((s) => (
            <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{s.name}</div>
                  <div className="text-xs text-slate-400">Tier: {s.tier}</div>
                </div>
                <div className="text-xs text-slate-300">+${s.weeklyIncome.toLocaleString()}/wk</div>
              </div>
              {s.goal && (
                <div className="mt-2 text-xs text-slate-300">
                  Goal: {s.goal.description} (Week {s.goal.targetWeek}) · Bonus ${s.goal.bonus.toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
