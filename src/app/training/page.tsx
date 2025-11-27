"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "../../state/gameStore";
import { WeeklyTrainingPlan } from "../../game/domain/types";

const loads = ["EASY", "MEDIUM", "HARD", "REST"] as const;
const focuses = ["VO2MAX", "THRESHOLD", "MUSCULAR", "ACCELERATION", "SPRINT_FINISH"] as const;

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

  const presets = useMemo(
    () => ({
      BASE: { load: "MEDIUM" as const, focus: ["VO2MAX", "THRESHOLD", "MUSCULAR"] as const },
      SPEED: { load: "MEDIUM" as const, focus: ["ACCELERATION", "SPRINT_FINISH", "THRESHOLD"] as const },
      RECOVERY: { load: "REST" as const, focus: ["THRESHOLD", "THRESHOLD", "THRESHOLD"] as const },
    }),
    []
  );
  const [activePreset, setActivePreset] = useState<keyof typeof presets>("BASE");

  const apply = () => {
    setPlans(Object.values(plans));
  };

  const update = (
    athleteId: string,
    sessionIdx: number,
    intensity: WeeklyTrainingPlan["sessions"][number]["intensity"],
    focus: WeeklyTrainingPlan["sessions"][number]["focus"]
  ) => {
    setLocalPlans((prev) => {
      const existing = prev[athleteId]?.sessions || [
        { day: 1, intensity: "MEDIUM", focus: "VO2MAX" as const },
        { day: 3, intensity: "MEDIUM", focus: "THRESHOLD" as const },
        { day: 5, intensity: "MEDIUM", focus: "MUSCULAR" as const },
      ];
      const sessions = [...existing];
      sessions[sessionIdx] = { ...sessions[sessionIdx], intensity, focus };
      return { ...prev, [athleteId]: { athleteId, sessions } };
    });
  };

  const applyPresetToAll = (presetKey: keyof typeof presets) => {
    const preset = presets[presetKey];
    setLocalPlans((prev) => {
      const next: Record<string, WeeklyTrainingPlan> = { ...prev };
      athletes.forEach((ath) => {
        next[ath.id] = {
          athleteId: ath.id,
          sessions: [
            { day: 1, intensity: preset.load, focus: preset.focus[0] },
            { day: 3, intensity: preset.load, focus: preset.focus[1] },
            { day: 5, intensity: preset.load, focus: preset.focus[2] },
          ],
        };
      });
      return next;
    });
  };

  const grouped = useMemo(() => [{ role: "ALL", athletes }], [athletes]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Training</p>
            <h1 className="text-3xl font-semibold">Weekly plans</h1>
            <p className="text-slate-300">Pick a preset and tweak per athlete: day 1/3/5 with load + focus.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyPresetToAll(activePreset)}
              className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              Apply preset to all
            </button>
            <button
              onClick={apply}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
            >
              Save plans
            </button>
          </div>
        </header>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold text-slate-200">Presets</div>
          <div className="mt-2 grid gap-2 md:grid-cols-3 text-xs">
            {(Object.keys(presets) as Array<keyof typeof presets>).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setActivePreset(key);
                  applyPresetToAll(key);
                }}
                className={`rounded-md border px-3 py-2 text-left transition ${
                  activePreset === key
                    ? "border-blue-400 bg-blue-500/10 text-blue-100"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-blue-300/50 hover:bg-white/10"
                }`}
              >
                <div className="font-semibold">{key}</div>
                <div className="text-[11px] text-slate-400">
                  Load {presets[key].load} · {presets[key].focus.map((f) => f.replace("_", " ")).join(" / ")}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {grouped.map((group) => (
            <div key={group.role} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-200">{group.role}</div>
              <div className="space-y-2">
                {group.athletes.map((athlete) => {
                  const current = plans[athlete.id];
                  const defaultSessions = [
                    { day: 1, intensity: "MEDIUM", focus: "VO2MAX" as const },
                    { day: 3, intensity: "MEDIUM", focus: "THRESHOLD" as const },
                    { day: 5, intensity: "MEDIUM", focus: "MUSCULAR" as const },
                  ];
                  const sessions = current?.sessions || defaultSessions;
                  return (
                    <div key={athlete.id} className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
                      <div className="text-sm font-semibold text-slate-100">{athlete.name}</div>
                      <div className="text-xs text-slate-400">Form {athlete.state.form} · Fatigue {athlete.state.fatigue}</div>
                      <div className="mt-2 grid gap-2 text-xs">
                        {sessions.map((session, idx) => (
                          <div key={`${athlete.id}-s${idx}`} className="flex items-center gap-2">
                            <span className="w-10 text-slate-300">Day {session.day}</span>
                            <select
                              className="rounded bg-slate-800 px-2 py-1"
                              value={session.intensity}
                              onChange={(e) =>
                                update(athlete.id, idx, e.target.value as any, session.focus)
                              }
                            >
                              {loads.map((l) => (
                                <option key={l}>{l}</option>
                              ))}
                            </select>
                            <select
                              className="flex-1 rounded bg-slate-800 px-2 py-1"
                              value={session.focus}
                              onChange={(e) =>
                                update(athlete.id, idx, session.intensity, e.target.value as any)
                              }
                            >
                              {focuses.map((f) => (
                                <option key={f} value={f}>
                                  {f.replace("_", " ")}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
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
