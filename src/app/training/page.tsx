"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "../../state/gameStore";
import { WeeklyTrainingPlan } from "../../game/domain/types";

const loads = ["EASY", "MEDIUM", "HARD", "REST"] as const;
const focuses = ["ENDURANCE", "CLIMB", "SPEED"] as const;

export default function TrainingPage() {
  const { athletes, setPlans, currentPlans } = useGameStore((state) => {
    const teamId = state.playerTeamId || Object.keys(state.teams)[0];
    const team = state.teams[teamId];
    return {
      athletes: team.athletes.map((id) => state.athletes[id]).filter(Boolean),
      setPlans: state.setTrainingPlans,
      currentPlans: state.trainingPlans,
    };
  });

  const [plans, setLocalPlans] = useState<Record<string, WeeklyTrainingPlan>>(() => {
    const map: Record<string, WeeklyTrainingPlan> = {};
    currentPlans.forEach((p) => (map[p.athleteId] = p));
    return map;
  });

  const apply = () => {
    setPlans(Object.values(plans));
  };

  const update = (athleteId: string, intensity: WeeklyTrainingPlan["sessions"][number]["intensity"], focus: WeeklyTrainingPlan["sessions"][number]["focus"]) => {
    const sessions = [
      { day: 1, intensity, focus },
      { day: 3, intensity, focus },
      { day: 5, intensity, focus },
    ];
    setLocalPlans((prev) => ({
      ...prev,
      [athleteId]: { athleteId, sessions },
    }));
  };

  const grouped = useMemo(() => {
    const roles = Array.from(new Set(["CAPTAIN", "SPRINTER", "CLIMBER", "DOMESTIQUE"]));
    return roles.map((role) => ({
      role,
      athletes: athletes.filter((a) => a.role === role),
    }));
  }, [athletes]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Training</p>
            <h1 className="text-3xl font-semibold">Weekly plans</h1>
            <p className="text-slate-300">Set load & focus per athlete. Save templates coming later.</p>
          </div>
          <button
            onClick={apply}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
          >
            Apply plans
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {grouped.map((group) => (
            <div key={group.role} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-200">{group.role}</div>
              <div className="space-y-2">
                {group.athletes.map((athlete) => {
                  const current = plans[athlete.id];
                  const currentIntensity = current?.sessions[0]?.intensity || "MEDIUM";
                  const currentFocus = current?.sessions[0]?.focus || "ENDURANCE";
                  return (
                    <div key={athlete.id} className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
                      <div className="text-sm font-semibold text-slate-100">{athlete.name}</div>
                      <div className="text-xs text-slate-400">Form {athlete.state.form} · Fatigue {athlete.state.fatigue}</div>
                      <div className="mt-2 flex flex-col gap-2 text-xs">
                        <label className="flex items-center gap-2">
                          <span className="w-16 text-slate-300">Load</span>
                          <select
                            className="flex-1 rounded bg-slate-800 px-2 py-1"
                            value={currentIntensity}
                            onChange={(e) => update(athlete.id, e.target.value as any, currentFocus)}
                          >
                            {loads.map((l) => (
                              <option key={l}>{l}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2">
                          <span className="w-16 text-slate-300">Focus</span>
                          <select
                            className="flex-1 rounded bg-slate-800 px-2 py-1"
                            value={currentFocus}
                            onChange={(e) => update(athlete.id, currentIntensity, e.target.value as any)}
                          >
                            {focuses.map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
