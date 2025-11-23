"use client";

import { useMemo } from "react";
import { useGameStore } from "../../state/gameStore";

export default function TransfersPage() {
  const { transferList, athletes, teams } = useGameStore((s) => ({
    transferList: s.transferList,
    athletes: s.athletes,
    teams: s.teams,
  }));

  const listed = useMemo(
    () => transferList.filter((t) => t.status !== "NOT_FOR_SALE").map((t) => ({ ...t, athlete: athletes[t.athleteId] })),
    [transferList, athletes]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Transfers</p>
          <h1 className="text-3xl font-semibold">Market & loans</h1>
          <p className="text-slate-300">Bidding and loans coming soon — this list shows available riders.</p>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          {listed.map((item) => {
            const a = item.athlete;
            if (!a) return null;
            const currentTeam = teams[a.teamId]?.name || "Unknown";
            return (
              <div key={item.athleteId} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{a.name}</div>
                    <div className="text-xs text-slate-400">{a.role} · {currentTeam}</div>
                  </div>
                  <div className="text-xs text-slate-300">${item.askingPrice.toLocaleString()}</div>
                </div>
                <div className="text-xs text-slate-400 mt-1">Interest: {item.interest}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
