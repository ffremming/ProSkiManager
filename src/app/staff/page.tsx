"use client";

import { useGameStore } from "../../state/gameStore";

export default function StaffPage() {
  const { staff, facilities } = useGameStore((s) => ({
    staff: s.staff,
    facilities: s.facilities,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Staff & Facilities</p>
          <h1 className="text-3xl font-semibold">Backroom team</h1>
          <p className="text-slate-300">Coaches, wax techs, physios, and facility levels impacting training and recovery.</p>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          {staff.map((member) => (
            <div key={member.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{member.name}</div>
                  <div className="text-xs text-slate-400">{member.role}</div>
                </div>
                <div className="text-xs text-slate-300">Skill {member.skill}</div>
              </div>
              {member.focus && <div className="text-xs text-slate-400 mt-1">Focus: {member.focus}</div>}
              <div className="text-xs text-slate-400">Salary ${member.salary.toLocaleString()}</div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm uppercase tracking-wide text-slate-300">Facilities</div>
          <div className="mt-2 grid gap-2 md:grid-cols-3 text-sm">
            <FacilityCard label="Training center" level={facilities.trainingCenter} />
            <FacilityCard label="Recovery center" level={facilities.recoveryCenter} />
            <FacilityCard label="Altitude access" level={facilities.altitudeAccess} />
          </div>
        </section>
      </div>
    </main>
  );
}

function FacilityCard({ label, level }: { label: string; level: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
      <div className="text-slate-200 font-semibold">{label}</div>
      <div className="text-xs text-slate-400">Level {level} / 5</div>
    </div>
  );
}
