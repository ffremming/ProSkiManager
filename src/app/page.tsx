 "use client";

import Link from "next/link";
import { seasonRaces } from "../game/data/sampleData";
import { useGameStore } from "../state/gameStore";
import { useMemo } from "react";

export default function Home() {
  const { hasStarted, pastResults, startNextRace, currentWeek } = useGameStore((s) => ({
    hasStarted: s.hasStarted,
    pastResults: s.pastResults,
    startNextRace: s.startNextRace,
    currentWeek: s.currentWeek,
  }));

  const gameLinks = useMemo(
    () =>
      hasStarted
        ? [
            { href: "/team", label: "My team" },
            { href: "/teams", label: "All teams" },
            { href: "/training", label: "Training" },
            { href: "/staff", label: "Staff" },
            { href: "/sponsors", label: "Sponsors" },
            { href: "/transfers", label: "Transfers" },
            { href: "/scouting", label: "Scouting" },
            { href: "/race-setup", label: "Race prep" },
            { href: "/standings", label: "Standings" },
          ]
        : [],
    [hasStarted]
  );

  const completed = new Set(pastResults.map((r) => r.raceId));
  const racesToShow = hasStarted ? seasonRaces.filter((r) => !completed.has(r.id)) : [];
  const nextRace = racesToShow[0];

  return (
    <main className="min-h-screen px-6 py-10 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="uppercase tracking-[0.4em] text-xs text-blue-200/80">Ski Classics Manager</p>
          <h1 className="text-4xl font-semibold">Race control center</h1>
          <p className="text-slate-300 max-w-2xl">
            Manage your long-distance ski team: training, finances, and race simulations with a 3D race
            viewer. Start a fresh save, pick a team (or random), and go racing.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card flex flex-col gap-2">
            <div className="text-sm text-slate-300 mb-1">Team</div>
            <div className="text-lg font-semibold">Team management</div>
            <p className="text-slate-400 text-sm mt-2">
              {hasStarted ? "See your roster and every Ski Classics team." : "Start a new game to access management."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/new-game"
                className="inline-flex rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400"
              >
                New game
              </Link>
              {gameLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/20"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-slate-300 mb-1">Finance</div>
            <div className="text-lg font-semibold">$300k balance</div>
            <p className="text-slate-400 text-sm mt-2">Weekly income/expenses simulated in the store.</p>
          </div>
          <div className="card">
            <div className="text-sm text-slate-300 mb-1">Season</div>
            <div className="text-lg font-semibold">Race calendar</div>
            <p className="text-slate-400 text-sm mt-2">
              {hasStarted ? "Access full calendar and race prep." : "Start a game to unlock races."}
            </p>
          </div>
        </section>

        {hasStarted && (
          <section className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-300">Race simulations</div>
                <div className="text-lg font-semibold">
                  {nextRace ? `Next: Week ${nextRace.week}` : "Season complete"}
                </div>
                {nextRace && <div className="text-slate-300 text-sm">Current week: {currentWeek}</div>}
              </div>
              {nextRace && (
                <button
                  onClick={startNextRace}
                  className="px-4 py-2 rounded-md bg-blue-500 text-white font-medium"
                >
                  Start next race
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {racesToShow.map((race) => (
                <Link key={race.id} href={`/race/${race.id}`} className="card hover:bg-white/10 transition-colors">
                  <div className="text-sm text-slate-300">{race.type}</div>
                  <div className="text-lg font-semibold">{race.courseId}</div>
                  <div className="text-slate-400 text-sm">Week {race.week}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
