 "use client";

import Link from "next/link";
import { seasonRaces } from "../game/data/sampleData";
import { useGameStore } from "../state/gameStore";
import { useMemo } from "react";

export default function Home() {
  const { hasStarted, pastResults, startNextRace, currentWeek, racePrep, finance } = useGameStore((s) => ({
    hasStarted: s.hasStarted,
    pastResults: s.pastResults,
    startNextRace: s.startNextRace,
    currentWeek: s.currentWeek,
    finance: s.finance,
    racePrep: s.racePrep,
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

  const nextAction = useMemo(() => {
    if (!hasStarted) {
      return { label: "Start a new game", href: "/new-game", cta: "Begin", description: "Pick a team to kick off your season." };
    }
    if (nextRace) {
      const hasPrepLineup = racePrep?.lineup?.length;
      return hasPrepLineup
        ? { label: `Race week ${nextRace.week}`, href: `/race/${nextRace.id}`, cta: "Start next race", action: startNextRace, description: "You’re ready to race. Jump into the sim." }
        : { label: "Set race lineup", href: "/race-setup", cta: "Race prep", description: "Assign lineup, skis, wax, and tactics before racing." };
    }
    return { label: "Season complete", href: "/standings", cta: "View standings", description: "Check points and plan transfers." };
  }, [hasStarted, nextRace, racePrep, startNextRace]);

  const readiness = useMemo(() => {
    if (!hasStarted || !nextRace) return [];
    const statuses: { label: string; ok: boolean; hint: string }[] = [];
    const prepLineup = racePrep?.lineup || [];
    statuses.push({
      label: prepLineup.length >= 6 ? "Lineup ready" : "Lineup incomplete",
      ok: prepLineup.length >= 6,
      hint: prepLineup.length ? `${prepLineup.length} skiers selected` : "No skiers selected",
    });
    statuses.push({
      label: racePrep?.tactic ? `Tactic: ${racePrep.tactic.replace("_", " ")}` : "No tactic set",
      ok: Boolean(racePrep?.tactic),
      hint: "Set in Race prep",
    });
    statuses.push({
      label: racePrep?.skiChoice || racePrep?.waxChoice ? "Gear picked" : "Auto gear",
      ok: true,
      hint: racePrep?.skiChoice || racePrep?.waxChoice ? "Custom gear" : "Using auto gear",
    });
    return statuses;
  }, [hasStarted, nextRace, racePrep]);

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
            <div className="text-lg font-semibold">${finance.balance.toLocaleString()} balance</div>
            <p className="text-slate-400 text-sm mt-2">
              Weekly net: ${(finance.weeklyIncome - finance.weeklyExpenses).toLocaleString()} · Income ${finance.weeklyIncome.toLocaleString()} / Expenses ${finance.weeklyExpenses.toLocaleString()}
            </p>
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

        <section className="card flex flex-col gap-3 border border-white/10 bg-white/5 shadow-lg shadow-blue-900/20">
          <div className="text-xs uppercase tracking-[0.3em] text-blue-200/80">Next step</div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-lg font-semibold text-slate-100">{nextAction.label}</div>
              <div className="text-sm text-slate-300 max-w-xl">{nextAction.description}</div>
            </div>
            {nextAction.action ? (
              <button
                onClick={nextAction.action}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
              >
                {nextAction.cta}
              </button>
            ) : (
              <Link
                href={nextAction.href}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
              >
                {nextAction.cta}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <Link href="/team" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
              Formation
            </Link>
            <Link href="/race-setup" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
              Race prep
            </Link>
            <Link href="/transfers" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
              Transfers
            </Link>
          </div>
          {readiness.length > 0 && (
            <div className="mt-2 grid gap-2 text-xs">
              {readiness.map((r) => (
                <div
                  key={r.label}
                  className={`flex items-center justify-between rounded-md px-2 py-1 ${
                    r.ok ? "bg-emerald-500/10 text-emerald-100" : "bg-amber-500/10 text-amber-100"
                  }`}
                >
                  <span>{r.label}</span>
                  <span className="text-[11px] text-white/80">{r.hint}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
