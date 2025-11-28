"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Athlete, Role } from "../../game/domain/types";
import { useGameStore } from "../../state/gameStore";
import { useHasHydrated } from "../../state/useHasHydrated";
import { TeamLogo } from "./TeamLogo";

type Props = {
  teamId?: string;
  showBackLink?: boolean;
};

export function TeamDetail({ teamId, showBackLink }: Props) {
  const hydrated = useHasHydrated();
  if (!hydrated) return null;

  const { team, athletes, standings, formation, setFormation, playerTeamId } = useGameStore((state) => {
    const id = teamId || state.playerTeamId || Object.keys(state.teams)[0];
    const t = state.teams[id];
    const roster = (t?.athletes || []).map((aid) => state.athletes[aid]).filter(Boolean);
    return {
      team: t,
      athletes: roster,
      standings: state.standings,
      formation: state.formations?.[id],
      setFormation: state.setFormation,
      playerTeamId: state.playerTeamId,
    };
  });
  const isPlayerTeam = team?.id === (playerTeamId || Object.keys(useGameStore.getState().teams)[0]);

  const saveFormation = () => {
    if (!team) return;
    const filteredSlots = Object.fromEntries(
      Object.entries(slotAssignments).filter(([, val]) => Boolean(val))
    ) as Record<string, string>;
    setFormation?.(team.id, filteredSlots, slotRoles);
  };

  const roleGroups = useMemo(() => {
    const roles = Array.from(new Set(["CAPTAIN", "SPRINTER", "CLIMBER", "DOMESTIQUE"]));
    const groups: Record<string, Athlete[]> = {};
    roles.forEach((r) => (groups[r] = []));
    athletes.forEach((a) => {
      if (!groups[a.role]) groups[a.role] = [];
      groups[a.role].push(a);
    });
    return groups;
  }, [athletes]);

  const initialAssignments = useMemo(() => {
    if (formation?.slots) return formation.slots;
    const pick = (role: string) => athletes.find((a) => a.role === role)?.id;
    const helpers = athletes.filter((a) => a.role === "DOMESTIQUE").map((a) => a.id);
    return {
      slotCaptain: pick("CAPTAIN"),
      slotSprinter: pick("SPRINTER"),
      slotClimber: pick("CLIMBER"),
      slotAnchor: helpers[0],
      slotHelper2: helpers[1],
      slotFlex1: helpers[2],
      slotFlex2: helpers[3],
      slotFlex3: helpers[4],
    } as Record<string, string | undefined>;
  }, [athletes, formation]);

  const [slotAssignments, setSlotAssignments] = useState<Record<string, string | undefined>>(initialAssignments);

  const assignedIds = useMemo(() => new Set(Object.values(slotAssignments).filter(Boolean) as string[]), [slotAssignments]);
  const bench = useMemo(() => athletes.filter((a) => !assignedIds.has(a.id)), [athletes, assignedIds]);

  const slots = useMemo(
    () => [
      { id: "slotCaptain", label: "Captain", hint: "Calls tactics, controls pace", role: "CAPTAIN", gridStyle: { gridColumn: "2 / span 2", gridRow: "1" } },
      { id: "slotSprinter", label: "Sprinter", hint: "Finisher, fast flats", role: "SPRINTER", gridStyle: { gridColumn: "1", gridRow: "2" } },
      { id: "slotClimber", label: "Climber", hint: "Drives ascents", role: "CLIMBER", gridStyle: { gridColumn: "4", gridRow: "2" } },
      { id: "slotAnchor", label: "Helper", hint: "Keeps tempo & shields", role: "DOMESTIQUE", gridStyle: { gridColumn: "2", gridRow: "2" } },
      { id: "slotHelper2", label: "Helper", hint: "Fetches bottles, chases", role: "DOMESTIQUE", gridStyle: { gridColumn: "3", gridRow: "2" } },
      { id: "slotFlex1", label: "Wildcard", hint: "Extra engine or sprinter", role: "DOMESTIQUE", gridStyle: { gridColumn: "1", gridRow: "3" } },
      { id: "slotFlex2", label: "Support", hint: "Shadows leader, bridges gaps", role: "DOMESTIQUE", gridStyle: { gridColumn: "4", gridRow: "3" } },
      { id: "slotFlex3", label: "Shield", hint: "Blocks wind, patrols attacks", role: "DOMESTIQUE", gridStyle: { gridColumn: "2 / span 2", gridRow: "3" } },
    ],
    []
  );

  const slotRoles: Record<string, Role> = useMemo(
    () => Object.fromEntries(slots.map((s) => [s.id, s.role] as const)),
    [slots]
  );

  const assign = (slotId: string, athleteId: string) => {
    setSlotAssignments((prev) => ({ ...prev, [slotId]: athleteId }));
  };

  const clearSlot = (slotId: string) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const onDrop = (slotId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const athleteId = e.dataTransfer.getData("text/plain");
    if (athleteId) assign(slotId, athleteId);
  };

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
          <div className="flex items-center gap-3">
            <TeamLogo team={team} size={48} />
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

        {isPlayerTeam && (
        <section className="card border border-white/10 bg-white/5 p-4 shadow-lg shadow-blue-900/20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-300">Race plan</div>
              <div className="text-lg font-semibold text-slate-50">Formation & assignments</div>
              <div className="text-sm text-slate-400">Drag skiers into the tactical plan: captain up top, wings for sprinter/climber, helpers behind.</div>
            </div>
            <div className="text-xs text-slate-300">
              Assigned {assignedIds.size}/{athletes.length}
            </div>
            <button
              onClick={saveFormation}
              className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
            >
              Save formation
            </button>
            <div className="text-[11px] text-slate-300">
              Saved formations auto-fill race prep. Roles (Captain/Sprinter/Climber/Helper) boost race sim performance.
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/70 via-slate-900/40 to-slate-900/20 p-6"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.08), transparent 40%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.08), transparent 35%), linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            }}
          >
            <div className="pointer-events-none absolute inset-x-10 top-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="pointer-events-none absolute inset-x-4 bottom-14 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="grid grid-cols-4 auto-rows-fr gap-3">
              {slots.map((slot) => {
                const athlete = slotAssignments[slot.id]
                  ? athletes.find((a) => a.id === slotAssignments[slot.id])
                  : undefined;
                return (
                  <FormationSlot
                    key={slot.id}
                    slot={slot}
                    athlete={athlete}
                    onDrop={onDrop}
                    onClear={clearSlot}
                    style={slot.gridStyle}
                  />
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-blue-200/80 mb-2">Bench & reserves</div>
            <div className="grid gap-2 md:grid-cols-2">
              {bench.map((a) => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-blue-300/50 hover:bg-white/10"
                >
                  <div className="flex items-center gap-2">
                    {a.photo ? (
                      <img
                        src={a.photo as string}
                        alt={a.name}
                        className="h-10 w-10 rounded-full object-cover bg-white/10"
                        loading="lazy"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-white/10" />
                    )}
                    <div>
                      <div className="font-semibold">
                        <Link href={`/athlete/${a.id}`} className="underline text-blue-200 hover:text-blue-100">
                          {a.name}
                        </Link>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {a.role} · Form {a.state.form} · Fatigue {a.state.fatigue}
                      </div>
                      <MiniStats athlete={a} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-2 py-1 text-[11px] text-slate-200">Drag to assign</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        <section className="card border border-white/10 bg-white/5 p-4 shadow-lg shadow-blue-900/20">
          <div className="flex items-center justify-between pb-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-300">Roster</div>
              <div className="text-lg font-semibold text-slate-50">Skiers</div>
            </div>
            <div className="text-sm text-slate-400">{athletes.length} skiers · Team points {standings.teams[team.id] || 0}</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {athletes.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {a.photo ? (
                      <img
                        src={a.photo as string}
                        alt={a.name}
                        className="h-10 w-10 rounded-full object-cover bg-white/10"
                        loading="lazy"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-white/10" />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        <Link href={`/athlete/${a.id}`} className="underline text-blue-200 hover:text-blue-100">
                          {a.name}
                        </Link>
                      </div>
                      <div className="text-xs text-slate-400">Age {a.age} · Role {a.role}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">Pts {standings.athletes[a.id] || 0}</div>
                </div>
                <MiniStats athlete={a} />
                <CompactStatGrid athlete={a} />
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

function MiniStats({ athlete }: { athlete: Athlete }) {
  const stats = athlete.baseStats;
  const items = [
    { label: "End", value: stats.endurance },
    { label: "Climb", value: stats.climbing },
    { label: "Sprint", value: stats.sprint },
  ];
  return (
    <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-slate-300">
      {items.map((s) => (
        <div key={s.label} className="flex flex-col gap-0.5">
          <span className="uppercase tracking-tight">{s.label}</span>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
              style={{ width: `${Math.min(100, s.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactStatGrid({ athlete }: { athlete: Athlete }) {
  const stats = athlete.baseStats;
  const items = [
    { label: "Flat", value: stats.flat },
    { label: "Tech", value: stats.technique },
    { label: "RaceIQ", value: stats.raceIQ },
  ];
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
      {items.map((s) => (
        <div key={s.label} className="flex flex-col gap-0.5">
          <span className="uppercase tracking-tight">{s.label}</span>
          <div className="h-1.5 w-full rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
              style={{ width: `${Math.min(100, s.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormationSlot({
  slot,
  athlete,
  onDrop,
  onClear,
  style,
}: {
  slot: { id: string; label: string; hint: string; role: string; gridStyle?: React.CSSProperties };
  athlete?: Athlete;
  onDrop: (slotId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onClear: (slotId: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(slot.id, e)}
      style={style}
      className="flex min-h-[110px] flex-col justify-between rounded-2xl border border-white/10 bg-white/5/60 p-2.5 shadow-inner shadow-blue-900/20 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80">{slot.label}</div>
          <div className="text-[11px] text-slate-400">{slot.hint}</div>
        </div>
        {athlete ? (
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-200">
            {slot.role.toLowerCase()}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {athlete ? (
          <>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-50">
                <Link href={`/athlete/${athlete.id}`} className="underline text-blue-200 hover:text-blue-100">
                  {athlete.name}
                </Link>
              </div>
              <MiniStats athlete={athlete} />
            </div>
            <button onClick={() => onClear(slot.id)} className="text-[11px] text-amber-200 hover:text-white">
              Clear
            </button>
          </>
        ) : (
          <div className="w-full rounded border border-dashed border-white/20 px-2 py-2 text-center text-xs text-slate-400">
            Drop {slot.role.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}
