"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Athlete } from "../../game/domain/types";
import { useGameStore } from "../../state/gameStore";

type Props = {
  teamId?: string;
  showBackLink?: boolean;
};

export function TeamDetail({ teamId, showBackLink }: Props) {
  const { team, athletes, standings } = useGameStore((state) => {
    const id = teamId || state.playerTeamId || Object.keys(state.teams)[0];
    const t = state.teams[id];
    const roster = (t?.athletes || []).map((aid) => state.athletes[aid]).filter(Boolean);
    return { team: t, athletes: roster, standings: state.standings };
  });

  const roleGroups = useMemo(() => {
    const groups: Record<string, Athlete[]> = { CAPTAIN: [], SPRINTER: [], DOMESTIQUE: [] };
    athletes.forEach((a) => groups[a.role].push(a));
    return groups;
  }, [athletes]);

  if (!team) {
    return (
      <div className="p-6 text-slate-200">
        <div className="text-lg font-semibold">Team not found</div>
        {showBackLink && (
          <Link href="/teams" className="text-blue-300 underline">
            Back to all teams
          </Link>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Team</p>
            <h1 className="text-3xl font-semibold">{team.name}</h1>
            <p className="text-slate-300">
              {athletes.length} skiers · Budget ${team.budget.toLocaleString()}
            </p>
            {showBackLink && (
              <Link href="/teams" className="text-sm text-blue-300 underline">
                Back to all teams
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <ActionButton href="/race/race-1" label="Set race lineup" />
            <ActionButton href="#" label="Open training planner (stub)" />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <FeatureCard title="Training" subtitle="Load & focus">
            Assign weekly plans to influence form/fatigue. (Hook this to the training engine.)
          </FeatureCard>
          <FeatureCard title="Transfers" subtitle="Trade or sign">
            Bring in skiers from the pool, balance salaries vs budget.
          </FeatureCard>
          <FeatureCard title="Gear" subtitle="Skis, wax, equipment">
            Manage race-day gear to influence glide vs grip; apply per-race later.
          </FeatureCard>
        </section>

        <section className="card border border-white/10 bg-white/5 p-4 shadow-lg shadow-blue-900/20">
          <div className="flex items-center justify-between pb-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-300">Roster</div>
              <div className="text-lg font-semibold text-slate-50">Captains, sprinters, domestiques</div>
            </div>
            <div className="text-sm text-slate-400">{athletes.length} skiers · Team points {standings.teams[team.id] || 0}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(["CAPTAIN", "SPRINTER", "DOMESTIQUE"] as const).map((role) => (
              <div key={role} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-200">{role}</div>
                  <div className="text-xs text-slate-400">{roleGroups[role].length} skiers</div>
                </div>
                <div className="space-y-2">
                  {roleGroups[role].map((a) => (
                    <AthleteCard key={a.id} athlete={a} points={standings.athletes[a.id] || 0} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="card border border-white/10 bg-white/5 shadow-lg shadow-blue-900/20">
      <div className="text-sm text-slate-300">{subtitle}</div>
      <div className="text-xl font-semibold text-slate-50">{title}</div>
      <div className="mt-2 text-sm text-slate-300">{children}</div>
    </div>
  );
}

function AthleteCard({ athlete, points }: { athlete: Athlete; points: number }) {
  const stats = athlete.baseStats;
  const topStats = [
    { key: "endurance", label: "End" },
    { key: "climbing", label: "Climb" },
    { key: "flat", label: "Flat" },
    { key: "sprint", label: "Sprint" },
  ] as const;

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-100">{athlete.name}</div>
          <div className="text-xs text-slate-400">
            Age {athlete.age} · Salary ${athlete.contract.salaryPerWeek.toLocaleString()}
          </div>
        </div>
        <div className="rounded-md bg-blue-500/20 px-2 py-1 text-[11px] font-semibold text-blue-100">{athlete.role}</div>
      </div>
      <div className="mt-1 text-xs text-slate-300">Points: {points}</div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
        {topStats.map((s) => (
          <StatBar key={s.key} label={s.label} value={stats[s.key]} />
        ))}
      </div>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 text-slate-300">{label}</div>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <div className="w-10 text-right text-slate-200">{Math.round(value)}</div>
    </div>
  );
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
    >
      {label}
    </Link>
  );
}
