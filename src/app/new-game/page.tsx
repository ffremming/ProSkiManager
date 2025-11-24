"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "../../state/gameStore";
import { teamNames } from "../../game/data/athletePool";
import { pickRandomUnderdogTeam } from "../../game/data/sampleData";

const excludedTop = [
  "team-team-ragde-charge",
  "team-team-ramudden",
  "team-team-aker-d-hlie",
  "team-lager-157-ski-team",
  "team-team-eksj-hus",
];

export default function NewGamePage() {
  const router = useRouter();
  const newGame = useGameStore((s) => s.newGame);
  const [selected, setSelected] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const underdogs = useMemo(
    () =>
      Object.entries(teamNames)
        .filter(([id]) => !excludedTop.includes(id))
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const start = async (teamId?: string) => {
    setIsStarting(true);
    setError(null);
    try {
      await newGame(teamId);
      router.push("/team");
    } catch (err) {
      setError("Failed to start a new game. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">New Game</p>
            <h1 className="text-3xl font-semibold">Pick your starting team</h1>
            <p className="text-slate-300">
              Choose an underdog Ski Classics team or roll a random pick. Your state will auto-save locally.
            </p>
          </div>
          <Link href="/team" className="text-sm text-blue-300 underline">
            Back to team
          </Link>
        </header>

        <div className="card border border-white/10 bg-white/5 p-4 shadow-lg shadow-blue-900/20">
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={() => start(pickRandomUnderdogTeam(underdogs.map((u) => u.id)))}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
              disabled={isStarting}
            >
              {isStarting ? "Starting…" : "Random underdog"}
            </button>
            <button
              disabled={!selected || isStarting}
              onClick={() => start(selected || undefined)}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-slate-700 disabled:opacity-50"
            >
              {isStarting ? "Starting…" : "Start with selected"}
            </button>
          </div>
          {error && <div className="mb-2 text-xs text-amber-200">{error}</div>}
          <div className="grid gap-2 sm:grid-cols-2">
            {underdogs.map((team) => (
              <label
                key={team.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  selected === team.id
                    ? "border-blue-400 bg-blue-500/10 text-blue-100"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-blue-300/50 hover:bg-white/10"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{team.name}</span>
                  <span className="text-xs text-slate-400">{team.id.replace("team-", "").toUpperCase()}</span>
                </div>
                <input
                  type="radio"
                  name="team"
                  value={team.id}
                  checked={selected === team.id}
                  onChange={() => setSelected(team.id)}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
