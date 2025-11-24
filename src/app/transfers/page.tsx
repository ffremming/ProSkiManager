"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "../../state/gameStore";

export default function TransfersPage() {
  const { transferList, athletes, teams, finance, standings, refreshTransferMarket, buyTransferTarget, listPlayerForTransfer } = useGameStore((s) => ({
    transferList: s.transferList,
    athletes: s.athletes,
    teams: s.teams,
    finance: s.finance,
    standings: s.standings,
    refreshTransferMarket: s.refreshTransferMarket,
    buyTransferTarget: s.buyTransferTarget,
    listPlayerForTransfer: s.listPlayerForTransfer,
  }));
  const playerTeamId = useGameStore((s) => s.playerTeamId || Object.keys(s.teams)[0]);
  const myRoster = useMemo(
    () => Object.values(athletes).filter((a) => a.teamId === playerTeamId),
    [athletes, playerTeamId]
  );
  const [listingId, setListingId] = useState<string>("");
  const [asking, setAsking] = useState<number>(15000);

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
          <p className="text-slate-300">Refresh the market to pull form/points-adjusted prices. Sign riders instantly if you have the cash.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <button
              onClick={refreshTransferMarket}
              className="rounded-md bg-blue-500 px-3 py-2 font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
            >
              Refresh market
            </button>
            <div className="rounded-md bg-white/5 px-3 py-2 text-slate-200">Balance: ${finance.balance.toLocaleString()}</div>
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="font-semibold text-slate-100">List one of your skiers</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                className="rounded bg-slate-800 px-2 py-1"
              >
                <option value="">Select skier</option>
                {myRoster.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1000}
                step={500}
                value={asking}
                onChange={(e) => setAsking(Number(e.target.value))}
                className="w-28 rounded bg-slate-800 px-2 py-1"
              />
              <button
                onClick={() => listingId && listPlayerForTransfer(listingId, asking)}
                disabled={!listingId}
                className="rounded-md bg-white/10 px-3 py-1 font-semibold text-slate-100 transition enabled:hover:bg-white/20 disabled:opacity-50"
              >
                List player
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">Finance snapshot</div>
            <div>Balance ${finance.balance.toLocaleString()}</div>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-300">
            <div>Weekly income ${finance.weeklyIncome.toLocaleString()}</div>
            <div>Weekly expenses ${finance.weeklyExpenses.toLocaleString()}</div>
            <div>Net ${(finance.weeklyIncome - finance.weeklyExpenses).toLocaleString()}</div>
          </div>
          {finance.history.slice(-3).length > 0 && (
            <div className="mt-2 text-xs text-slate-400">
              Recent entries:
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {finance.history.slice(-3).map((h, idx) => (
                  <li key={`${h.reason}-${idx}`}>
                    Week {h.week}: {h.reason} ({h.delta >= 0 ? "+" : ""}{h.delta.toLocaleString()})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          {listed.map((item) => {
            const a = item.athlete;
            if (!a) return null;
            const currentTeam = teams[a.teamId]?.name || "Unknown";
            const affordable = finance.balance >= item.askingPrice;
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
                <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                  <span>Form {a.state.form} · Fatigue {a.state.fatigue}</span>
                  <span>Points {standings.athletes[a.id] || 0}</span>
                </div>
                <button
                  onClick={() => buyTransferTarget(item.athleteId)}
                  disabled={!affordable}
                  className={`mt-3 w-full rounded-md px-3 py-2 text-sm font-semibold transition ${
                    affordable
                      ? "bg-emerald-500 text-white hover:-translate-y-0.5 hover:bg-emerald-400"
                      : "bg-white/5 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {affordable ? "Sign player" : "Insufficient funds"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
