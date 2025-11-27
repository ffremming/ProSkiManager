"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "../../state/gameStore";

export default function TransfersPage() {
  const {
    transferList,
    transferRequests,
    transferAds,
    athletes,
    teams,
    finance,
    standings,
    refreshTransferMarket,
    buyTransferTarget,
    listPlayerForTransfer,
    acceptTransferRequest,
    declineTransferRequest,
  } = useGameStore((s) => ({
    transferList: s.transferList,
    transferRequests: s.transferRequests,
    transferAds: s.transferAds,
    athletes: s.athletes,
    teams: s.teams,
    finance: s.finance,
    standings: s.standings,
    refreshTransferMarket: s.refreshTransferMarket,
    buyTransferTarget: s.buyTransferTarget,
    listPlayerForTransfer: s.listPlayerForTransfer,
    acceptTransferRequest: s.acceptTransferRequest,
    declineTransferRequest: s.declineTransferRequest,
  }));
  const playerTeamId = useGameStore((s) => s.playerTeamId || Object.keys(s.teams)[0]);
  const myRoster = useMemo(
    () => Object.values(athletes).filter((a) => a.teamId === playerTeamId),
    [athletes, playerTeamId]
  );
  const [listingId, setListingId] = useState<string>("");
  const [asking, setAsking] = useState<number>(15000);
  const [note, setNote] = useState<string>("");

  const listed = useMemo(
    () => transferList.filter((t) => t.status !== "NOT_FOR_SALE").map((t) => ({ ...t, athlete: athletes[t.athleteId] })),
    [transferList, athletes]
  );
  const incoming = useMemo(
    () => transferRequests.map((r) => ({ ...r, athlete: athletes[r.athleteId], fromTeam: teams[r.fromTeamId] })),
    [transferRequests, athletes, teams]
  );
  const activeAds = useMemo(() => Object.values(transferAds || {}), [transferAds]);

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
            <div className="rounded-md bg-white/5 px-3 py-2 text-slate-200">Balance: ${finance.balance.toLocaleString("en-US")}</div>
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="font-semibold text-slate-100">Post an annonse for your skier</div>
            <div className="mt-2 grid gap-2 md:grid-cols-[1.1fr,0.9fr,1fr]">
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
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={asking}
                  onChange={(e) => setAsking(Number(e.target.value))}
                  className="w-28 flex-1 rounded bg-slate-800 px-2 py-1"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Short sales pitch (optional)"
                  className="flex-1 rounded bg-slate-800 px-2 py-1"
                />
              </div>
              <button
                onClick={() => {
                  if (!listingId) return;
                  listPlayerForTransfer(listingId, asking, note);
                  setNote("");
                }}
                disabled={!listingId}
                className="rounded-md bg-white/10 px-3 py-1 font-semibold text-slate-100 transition enabled:hover:bg-white/20 disabled:opacity-50"
              >
                Publish annonse
              </button>
            </div>
            {activeAds.length > 0 && (
              <div className="mt-2 text-xs text-slate-300">
                Active annonser:{" "}
                <span className="text-slate-100">
                  {activeAds.map((ad) => {
                    const a = athletes[ad.athleteId];
                    return a ? `${a.name} ($${ad.askingPrice.toLocaleString("en-US")})` : ad.athleteId;
                  }).join(", ")}
                </span>
              </div>
            )}
          </div>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">Finance snapshot</div>
            <div>Balance ${finance.balance.toLocaleString("en-US")}</div>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-300">
            <div>Weekly income ${finance.weeklyIncome.toLocaleString("en-US")}</div>
            <div>Weekly expenses ${finance.weeklyExpenses.toLocaleString("en-US")}</div>
            <div>Net ${(finance.weeklyIncome - finance.weeklyExpenses).toLocaleString("en-US")}</div>
          </div>
        {finance.history.slice(-3).length > 0 && (
          <div className="mt-2 text-xs text-slate-400">
            Recent entries:
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {finance.history.slice(-3).map((h, idx) => (
                  <li key={`${h.reason}-${idx}`}>
                    Week {h.week}: {h.reason} ({h.delta >= 0 ? "+" : ""}{h.delta.toLocaleString("en-US")})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Incoming requisitions</div>
              <div className="font-semibold">Offers from other teams</div>
            </div>
            <div className="text-xs text-slate-300">New offers arrive when you refresh the market or post an annonse.</div>
          </div>
          {incoming.length === 0 ? (
            <div className="mt-2 text-slate-300">No active offers. Post an annonse above to attract bids.</div>
          ) : (
            <div className="mt-3 grid gap-2">
              {incoming.map((req) => {
                const disabled = req.status !== "PENDING";
                return (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {req.athlete?.name || req.athleteId} → {req.fromTeam?.name || req.fromTeamId}
                      </div>
                      <div className="text-xs text-slate-300">
                        Offer ${req.offer.toLocaleString("en-US")} · Week {req.week} · {req.note || "No note"}
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => acceptTransferRequest(req.id)}
                        disabled={disabled}
                        className={`rounded-md px-3 py-1 font-semibold ${
                          disabled
                            ? "bg-white/5 text-slate-400"
                            : "bg-emerald-500 text-white hover:-translate-y-0.5 hover:bg-emerald-400"
                        }`}
                      >
                        {req.status === "ACCEPTED" ? "Accepted" : "Accept & sell"}
                      </button>
                      <button
                        onClick={() => declineTransferRequest(req.id)}
                        disabled={disabled}
                        className={`rounded-md px-3 py-1 font-semibold ${
                          disabled
                            ? "bg-white/5 text-slate-400"
                            : "bg-white/10 text-slate-100 hover:bg-white/20"
                        }`}
                      >
                        {req.status === "DECLINED" ? "Declined" : "Decline"}
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  <div className="text-xs text-slate-300">${item.askingPrice.toLocaleString("en-US")}</div>
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
