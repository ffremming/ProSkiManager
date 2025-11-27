"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useGameStore } from "../../state/gameStore";
import { raceCourses, raceConditions } from "../../game/data/sampleData";
import { loadReferenceData } from "../../game/data/referenceData";
import { RacePrep } from "../../game/domain/types";

export default function RaceSetupPage() {
  const { team, athletes, equipment, racePrep, setRacePrep, formation } = useGameStore((s) => {
    const teamId = s.playerTeamId || Object.keys(s.teams)[0];
    const t = s.teams[teamId];
    return {
      team: t,
      athletes: t.athletes.map((id) => s.athletes[id]).filter(Boolean),
      equipment: s.equipment,
      racePrep: s.racePrep,
      setRacePrep: s.setRacePrep,
      formation: s.formations?.[teamId],
    };
  });

  const [raceId, setRaceId] = useState(() => racePrep?.raceId || raceCourses.vasaloppet.id);
  const [lineup, setLineup] = useState<string[]>(racePrep?.lineup || []);
  const [skiChoice, setSkiChoice] = useState<string | undefined>(racePrep?.skiChoice);
  const [waxChoice, setWaxChoice] = useState<string | undefined>(racePrep?.waxChoice);
  const [pacing, setPacing] = useState<RacePrep["pacing"]>(racePrep?.pacing || "STEADY");
  const [tactic, setTactic] = useState<RacePrep["tactic"]>(racePrep?.tactic || "PROTECT_LEADER");
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [localCourses, setLocalCourses] = useState(raceCourses);
  const [localConditions, setLocalConditions] = useState(raceConditions);
  const [orders, setOrders] = useState<RacePrep["orders"]>(
    racePrep?.orders || {
      label: "Balanced",
      protectLeader: true,
      chaseBreaks: false,
      sprintFocus: false,
      climbFocus: false,
      aggression: "MED",
    }
  );

  const conditions = localConditions[raceId];
  const course = localCourses[raceId];

  const skis = useMemo(() => equipment.items.filter((i) => i.type === "SKI"), [equipment.items]);
  const waxes = useMemo(() => equipment.items.filter((i) => i.type === "WAX"), [equipment.items]);
  const formationLineup = useMemo(() => {
    if (!formation?.slots) return [];
    return Array.from(new Set(Object.values(formation.slots).filter(Boolean)));
  }, [formation]);

  // Load race reference data via gateway for future DB-backed usage.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoadingRef(true);
      setRefError(null);
      try {
        const data = await loadReferenceData();
        if (!mounted) return;
        setLocalCourses(data.raceCourses);
        setLocalConditions(data.raceConditions);
        setRaceId((prev) => (prev ? prev : data.seasonRaces[0]?.courseId || prev));
      } catch (err) {
        setRefError("Failed to load race data; using seed defaults.");
      } finally {
        if (mounted) setIsLoadingRef(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-seed lineup from saved formation if prep is empty.
  useEffect(() => {
    if (racePrep?.lineup?.length) return;
    if (!formation?.slots) return;
    const ordered = Object.values(formation.slots).filter(Boolean);
    if (!ordered.length) return;
    setLineup(ordered);
  }, [formation, racePrep?.lineup]);

  const autoSelectGear = () => {
    if (!conditions) return;
    const cold = conditions.temperatureC <= -5 || conditions.snow === "COLD" || conditions.snow === "ICY";
    const targetSki = cold
      ? [...skis].sort((a, b) => b.grip - a.grip)[0]
      : [...skis].sort((a, b) => b.glide - a.glide)[0];
    const targetWax = cold
      ? [...waxes].sort((a, b) => b.grip - a.grip)[0]
      : [...waxes].sort((a, b) => b.glide - a.glide)[0];
    setSkiChoice(targetSki?.id);
    setWaxChoice(targetWax?.id);
  };

  const toggleLineup = (id: string) => {
    setLineup((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = () => {
    const derivedRoles: Record<string, string> = {};
    lineup.forEach((id) => {
      const found = athletes.find((a) => a.id === id);
      if (found) derivedRoles[id] = found.role;
    });
    // If formation has explicit roles, prefer those.
    Object.entries(formation?.roles || {}).forEach(([slotId, role]) => {
      const aid = formation?.slots?.[slotId];
      if (aid) derivedRoles[aid] = role;
    });

    setRacePrep({
      raceId,
      lineup: lineup.length ? lineup : athletes.map((a) => a.id), // fallback to full roster if empty
      skiChoice,
      waxChoice,
      pacing,
      roles: derivedRoles,
      tactic,
      conditions,
      orders,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Race prep</p>
            <h1 className="text-3xl font-semibold">Lineup & equipment</h1>
            <p className="text-slate-300">Pick lineup, pacing, and skis/wax for the next race.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
            >
              Save setup
            </button>
            <Link
              href={`/race/${raceId}`}
              className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/20"
            >
              Go to race
            </Link>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm font-semibold text-slate-200">Race</div>
            {isLoadingRef && <div className="text-xs text-blue-200 mt-1">Loading race data…</div>}
            {refError && <div className="text-xs text-amber-200 mt-1">{refError}</div>}
            <select
              className="mt-2 w-full rounded bg-slate-800 px-2 py-2 text-sm"
              value={raceId}
              onChange={(e) => setRaceId(e.target.value)}
            >
              {Object.values(localCourses).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {conditions && (
              <div className="mt-3 text-xs text-slate-300">
                <div>Temp: {conditions.temperatureC}°C</div>
                <div>Snow: {conditions.snow}</div>
                <div>Wind: {conditions.windKph} km/h</div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm font-semibold text-slate-200">Pacing</div>
            <div className="mt-2 flex gap-2 text-xs">
              {(["DEFENSIVE", "STEADY", "AGGRESSIVE"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPacing(opt)}
                  className={`rounded-md px-2 py-1 ${
                    pacing === opt ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-200">Tactic</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {(["PROTECT_LEADER", "SPRINT_POINTS", "BREAKAWAY", "SURVIVE"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTactic(opt)}
                  className={`rounded-md px-2 py-1 ${
                    tactic === opt ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {opt.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-200">Strategy presets</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {[
                {
                  label: "Balanced",
                  tactic: "PROTECT_LEADER" as const,
                  pacing: "STEADY" as const,
                  orders: { protectLeader: true, chaseBreaks: false, sprintFocus: false, climbFocus: false, aggression: "MED" as const },
                },
                {
                  label: "Protect captain",
                  tactic: "PROTECT_LEADER" as const,
                  pacing: "DEFENSIVE" as const,
                  orders: { protectLeader: true, chaseBreaks: false, sprintFocus: false, climbFocus: true, aggression: "LOW" as const },
                },
                {
                  label: "Sprint hunt",
                  tactic: "SPRINT_POINTS" as const,
                  pacing: "STEADY" as const,
                  orders: { protectLeader: false, chaseBreaks: true, sprintFocus: true, climbFocus: false, aggression: "MED" as const },
                },
                {
                  label: "Breakaway",
                  tactic: "BREAKAWAY" as const,
                  pacing: "AGGRESSIVE" as const,
                  orders: { protectLeader: false, chaseBreaks: true, sprintFocus: false, climbFocus: false, aggression: "HIGH" as const },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setTactic(preset.tactic);
                    setPacing(preset.pacing);
                    setOrders({ ...preset.orders, label: preset.label });
                  }}
                  className="rounded-md bg-white/10 px-2 py-2 text-left text-slate-200 hover:bg-white/20"
                >
                  <div className="font-semibold">{preset.label}</div>
                  <div className="text-[11px] text-slate-400">Tactic {preset.tactic.replace("_", " ")}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm font-semibold text-slate-200">Equipment</div>
            <button
              onClick={autoSelectGear}
              className="mt-2 mb-2 rounded bg-white/10 px-2 py-1 text-xs text-slate-100 hover:bg-white/20"
            >
              Auto select (conditions)
            </button>
            <label className="mt-2 block text-xs text-slate-300">
              Ski
              <select
                className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-sm"
                value={skiChoice}
                onChange={(e) => setSkiChoice(e.target.value)}
              >
                <option value="">Auto</option>
                {skis.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Grip {s.grip} / Glide {s.glide})
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-xs text-slate-300">
              Wax
              <select
                className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-sm"
                value={waxChoice}
                onChange={(e) => setWaxChoice(e.target.value)}
              >
                <option value="">Auto</option>
                {waxes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Grip {s.grip} / Glide {s.glide})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-300">Lineup</div>
              <div className="text-sm text-slate-400">Uses your formation roles; adjust who starts here.</div>
              {lineup.length < 6 && (
                <div className="mt-1 text-xs text-amber-200">Add more skiers: low lineup size can hurt race performance.</div>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-200">
                <button
                  onClick={() => {
                    if (!formationLineup.length) return;
                    setLineup(formationLineup);
                  }}
                  className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
                >
                  Apply formation lineup
                </button>
                <Link href="/team" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
                  Edit formation
                </Link>
                <button onClick={() => autoSelectGear()} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
                  Auto gear by conditions
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-300">Lineup size: {lineup.length}</div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {athletes.map((a) => (
              <label
                key={a.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  lineup.includes(a.id) ? "border-blue-400 bg-blue-500/10 text-blue-100" : "border-white/10 bg-white/5 text-slate-200"
                }`}
              >
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-slate-400">
                    Role: {a.role} · Form {a.state.form} · Fatigue {a.state.fatigue}
                  </div>
                </div>
                <input type="checkbox" checked={lineup.includes(a.id)} onChange={() => toggleLineup(a.id)} className="h-4 w-4" />
              </label>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
