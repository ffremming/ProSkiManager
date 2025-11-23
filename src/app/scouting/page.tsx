"use client";

import { useGameStore } from "../../state/gameStore";

export default function ScoutingPage() {
  const { assignments, prospects } = useGameStore((s) => ({
    assignments: s.scoutAssignments,
    prospects: s.prospects,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Scouting & Youth</p>
          <h1 className="text-3xl font-semibold">Assignments & Prospects</h1>
          <p className="text-slate-300">Scouts working regions; prospects identified for future signings.</p>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm uppercase tracking-wide text-slate-300">Assignments</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {assignments.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-100">{a.region}</div>
                  <div className="text-xs text-slate-400">{a.weeksRemaining} weeks left</div>
                </div>
                <div className="text-xs text-slate-300">Focus: {a.focus}</div>
              </div>
            ))}
            {assignments.length === 0 && <div className="text-sm text-slate-300">No active assignments.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm uppercase tracking-wide text-slate-300">Prospects</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {prospects.map((p) => (
              <div key={p.id} className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.role}</div>
                </div>
                <div className="text-xs text-slate-300">
                  Age {p.age} · Potential {p.potentialRange[0]}-{p.potentialRange[1]}
                </div>
                <div className="text-xs text-slate-400">Region: {p.region}</div>
                {p.notes && <div className="text-xs text-slate-400 mt-1">{p.notes}</div>}
              </div>
            ))}
            {prospects.length === 0 && <div className="text-sm text-slate-300">No prospects yet.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
