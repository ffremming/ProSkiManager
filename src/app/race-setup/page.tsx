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
  const [roles, setRoles] = useState<Record<string, string>>(racePrep?.roles || {});
  const [tactic, setTactic] = useState<RacePrep["tactic"]>(racePrep?.tactic || "PROTECT_LEADER");
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [localCourses, setLocalCourses] = useState(raceCourses);
  const [localConditions, setLocalConditions] = useState(raceConditions);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});

  const conditions = localConditions[raceId];
  const course = localCourses[raceId];

  const skis = useMemo(() => equipment.items.filter((i) => i.type === "SKI"), [equipment.items]);
  const waxes = useMemo(() => equipment.items.filter((i) => i.type === "WAX"), [equipment.items]);
  const assignedIds = useMemo(() => new Set(Object.values(slotAssignments).filter(Boolean)), [slotAssignments]);
  const bench = useMemo(() => athletes.filter((a) => !assignedIds.has(a.id)), [athletes, assignedIds]);

  const formationSlots = useMemo(
    () => [
      { id: "slot-captain", label: "Captain", role: "CAPTAIN", detail: "Calls tactics, steady engine." },
      { id: "slot-climber", label: "Mountain Domestique", role: "CLIMBER", detail: "Paces on climbs, protects leader." },
      { id: "slot-sprinter", label: "Sprinter", role: "SPRINTER", detail: "Saves legs for final kicks and sprints." },
      { id: "slot-enforcer", label: "Wind Blocker", role: "DOMESTIQUE", detail: "Shields pack, drags breakaways." },
      { id: "slot-guardian", label: "Lead-out", role: "DOMESTIQUE", detail: "Positions sprinter, keeps tempo high." },
    ],
    []
  );

  const assignToSlot = (slotId: string, athleteId: string, role: string) => {
    setSlotAssignments((prev) => ({ ...prev, [slotId]: athleteId }));
    setLineup((prev) => (prev.includes(athleteId) ? prev : [...prev, athleteId]));
    setRoles((prev) => ({ ...prev, [athleteId]: role }));
  };

  const clearSlot = (slotId: string) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const onDrop = (slotId: string, role: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const athleteId = e.dataTransfer.getData("text/plain");
    if (athleteId) {
      assignToSlot(slotId, athleteId, role);
    }
  };

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
    setRoles((prev) => {
      const next = { ...prev };
      Object.entries(formation.roles || {}).forEach(([slotId, role]) => {
        const athleteId = formation.slots[slotId];
        if (athleteId) next[athleteId] = role;
      });
      return next;
    });
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
    setLineup((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(id)) {
        setSlotAssignments((slots) => {
          const updated = { ...slots };
          Object.entries(updated).forEach(([slotId, athleteId]) => {
            if (athleteId === id) delete updated[slotId];
          });
          return updated;
        });
      }
      return next;
    });
  };

  const save = () => {
    setRacePrep({
      raceId,
      lineup: lineup.length ? lineup : athletes.map((a) => a.id), // fallback to full roster if empty
      skiChoice,
      waxChoice,
      pacing,
      roles,
      tactic,
      conditions,
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

        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-300">Formation board</div>
              <div className="text-sm text-slate-400">Drag skiers into tactical slots like Football Manager.</div>
              {lineup.length < 6 && (
                <div className="mt-1 text-xs text-amber-200">Add more skiers: low lineup size can hurt race performance.</div>
              )}
              {!roles || !lineup.some((id) => (roles[id] || athletes.find((a) => a.id === id)?.role) === "CAPTAIN") && (
                <div className="mt-1 text-xs text-amber-200">Tip: set a Captain and specialist roles to trigger bonuses.</div>
              )}
            </div>
            <div className="text-xs text-slate-300">Lineup size: {lineup.length}</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-blue-200/80 mb-2">Battle Plan</div>
              <div className="grid gap-2">
                {formationSlots.map((slot) => {
                  const athleteId = slotAssignments[slot.id];
                  const athlete = athleteId ? athletes.find((a) => a.id === athleteId) : null;
                  return (
                    <div
                      key={slot.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDrop(slot.id, slot.role, e)}
                      className="relative flex items-center justify-between rounded border border-white/10 bg-white/5 p-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{slot.label}</div>
                        <div className="text-[11px] text-slate-400">{slot.detail}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {athlete ? (
                          <div className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-100">
                            {athlete.name}
                          </div>
                        ) : (
                          <div className="rounded border border-dashed border-white/20 px-2 py-1 text-xs text-slate-400">
                            Drop skier
                          </div>
                        )}
                        {athlete && (
                          <button
                            onClick={() => clearSlot(slot.id)}
                            className="text-[11px] text-amber-200 hover:text-white"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-blue-200/80 mb-2">Bench & reserves</div>
              <div className="grid gap-2">
                {bench.map((a) => (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                    className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-blue-300/50 hover:bg-white/10"
                  >
                    <div>
                      <div className="font-semibold">{a.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {roles[a.id] || a.role} · Form {a.state.form} · Fatigue {a.state.fatigue}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLineup(a.id)}
                      className={`rounded px-2 py-1 text-[11px] ${
                        lineup.includes(a.id) ? "bg-blue-500 text-white" : "bg-white/10 text-slate-200"
                      }`}
                    >
                      {lineup.includes(a.id) ? "In lineup" : "Toggle"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-blue-200/80 mb-2">Roles overview</div>
            <div className="grid gap-2 md:grid-cols-2">
              {athletes.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    lineup.includes(a.id)
                      ? "border-blue-400 bg-blue-500/10 text-blue-100"
                      : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-slate-400">
                      Base role: {a.role} · Assigned: {roles[a.id] || "Auto"}
                    </div>
                    <div className="mt-1 flex gap-2 text-[11px] text-slate-300">
                      <select
                        className="rounded bg-slate-800 px-2 py-1"
                        value={roles[a.id] || a.role}
                        onChange={(e) => setRoles((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      >
                        <option value="CAPTAIN">Captain</option>
                        <option value="CLIMBER">Climber</option>
                        <option value="SPRINTER">Sprinter</option>
                        <option value="DOMESTIQUE">Domestique</option>
                      </select>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={lineup.includes(a.id)}
                    onChange={() => toggleLineup(a.id)}
                    className="h-4 w-4"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
