"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGameStore } from "../../../state/gameStore";
import generatedSkiers from "../../../game/data/generated/skiers.generated.json";

export default function AthleteProfile({ params }: { params: { athleteId: string } }) {
  const { athletes, teams } = useGameStore((s) => ({ athletes: s.athletes, teams: s.teams }));
  const athlete = athletes[params.athleteId];
  const team = athlete ? teams[athlete.teamId] : undefined;

  const meta = useMemo(() => {
    if (!athlete) return null;
    const slug = slugify(athlete.name);
    return (generatedSkiers as any[]).find((s) => slugify(s.name) === slug);
  }, [athlete]);

  if (!athlete) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] p-6 text-slate-100">
        <div className="mx-auto max-w-4xl">
          <div className="text-lg font-semibold mb-2">Athlete not found</div>
          <Link href="/" className="text-blue-300 underline">Go home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] p-6 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {athlete.photo ? (
              <img
                src={athlete.photo as string}
                alt={athlete.name}
                className="h-24 w-24 rounded-full object-cover bg-white/10"
                loading="lazy"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-white/10" />
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200/80">Athlete</p>
              <h1 className="text-3xl font-semibold">{athlete.name}</h1>
              <div className="text-slate-300 text-sm">{team?.name || "No team"} · {athlete.role}</div>
            </div>
          </div>
          <Link href="/team" className="rounded bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/20">Back</Link>
        </div>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-slate-300">Stats</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <Stat label="Endurance" value={athlete.baseStats.endurance} />
            <Stat label="Climbing" value={athlete.baseStats.climbing} />
            <Stat label="Flat" value={athlete.baseStats.flat} />
            <Stat label="Sprint" value={athlete.baseStats.sprint} />
            <Stat label="Technique" value={athlete.baseStats.technique} />
            <Stat label="Race IQ" value={athlete.baseStats.raceIQ} />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 space-y-1">
          <div className="font-semibold text-slate-100">Vitals</div>
          <div>Age: {athlete.age}</div>
          <div>Potential: {athlete.potential}</div>
          <div>Form: {athlete.state.form} · Fatigue: {athlete.state.fatigue} · Morale: {athlete.state.morale}</div>
          {meta && (
            <>
              {meta.born && <div>Born: {meta.born}</div>}
              {meta.ranking && <div>{meta.ranking}</div>}
              {meta.proTourEvents && <div>Pro Tour Events: {meta.proTourEvents}</div>}
              {meta.challengers && <div>Challengers: {meta.challengers}</div>}
            </>
          )}
        </section>

        {athlete.traits?.length ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <div className="font-semibold text-slate-100 mb-2">Traits</div>
            <div className="flex flex-wrap gap-2">
              {athlete.traits.map((t) => (
                <span key={t} className="rounded bg-white/10 px-2 py-1">{t}</span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-xs uppercase tracking-[0.12em] text-blue-200/80">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function slugify(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
