"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "../../../state/gameStore";
import { useHasHydrated } from "../../../state/useHasHydrated";
import { RaceCanvas } from "../../../components/race/RaceCanvas";
import { RaceHud } from "../../../components/race/RaceHud";
import { raceCourses } from "../../../game/data/sampleData";
import { RaceSnapshot } from "../../../game/domain/types";

export default function RacePage({ params }: { params: { raceId: string } }) {
  const hydrated = useHasHydrated();
  if (!hydrated) return null;

  const { activeRace, startRace, finishRace, teams, playerTeamId, athletes, standings, pastResults, racePrep, setRacePrep } =
    useGameStore((state) => ({
      activeRace: state.activeRace,
      startRace: state.startRace,
      finishRace: state.finishRace,
      teams: state.teams,
      playerTeamId: state.playerTeamId,
      athletes: state.athletes,
      standings: state.standings,
      pastResults: state.pastResults,
      racePrep: state.racePrep,
      setRacePrep: state.setRacePrep,
    }));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const [viewTime, setViewTime] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [renderSettings, setRenderSettings] = useState({
    shadows: true,
    treeDensity: 1,
    snowCount: 1,
    dpr: 1.5,
    weather: "clear" as "clear" | "snow" | "fog",
    timeOfDay: "noon" as "noon" | "sunrise" | "dusk",
  });
  const [slopePct, setSlopePct] = useState(0);
  const attemptedStart = useRef(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (activeRace && activeRace.raceId === params.raceId) {
      attemptedStart.current = true;
      return;
    }
    if (attemptedStart.current) return;

    const prepLineup = racePrep?.lineup || [];
    const hasTactic = (racePrep?.tactic || "").length > 0;
    const playerTeam = teams[playerTeamId || Object.keys(teams)[0]];
    const fallbackLineup = playerTeam?.athletes || [];
    if (!prepLineup.length || !hasTactic) {
      setRacePrep({
        raceId: params.raceId,
        lineup: prepLineup.length ? prepLineup : fallbackLineup,
        tactic: hasTactic ? racePrep?.tactic : "PROTECT_LEADER",
        pacing: racePrep?.pacing || "STEADY",
        roles: racePrep?.roles,
        skiChoice: racePrep?.skiChoice,
        waxChoice: racePrep?.waxChoice,
        conditions: racePrep?.conditions,
      });
    }
    const readyLineup = prepLineup.length ? prepLineup : fallbackLineup;
    if (readyLineup.length) {
      attemptedStart.current = true;
      startRace(params.raceId);
      setBlocked(false);
      setViewTime(0);
      setFinished(false);
      setFocusId(undefined);
    } else {
      setBlocked(true);
    }
  }, [activeRace?.raceId, params.raceId, racePrep, teams, playerTeamId, setRacePrep, startRace]);

  useEffect(() => {
    if (!activeRace) return;
    let raf: number | null = null;
    let last = performance.now();
    const step = (now: number) => {
      if (!activeRace || finished || !playing) return;
      const dt = Math.max(0, now - last);
      last = now;
      const endTime = activeRace.snapshots[activeRace.snapshots.length - 1]?.t || 0;
      setViewTime((prev) => {
        const next = Math.min(prev + (dt / 1000) * speed, endTime);
        if (next >= endTime) setFinished(true);
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activeRace, finished, playing, speed]);

  // When finished, commit results to store once.
  useEffect(() => {
    if (!activeRace) return;
    if (finished) {
      finishRace();
    }
  }, [finished, activeRace, finishRace]);

  const course = activeRace ? raceCourses[activeRace.courseId] : undefined;
  const elevationProfile = useMemo(() => {
    if (!course) return [];
    let dist = 0;
    let elev = 0;
    const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    course.segments.forEach((seg) => {
      dist += seg.distance;
      elev += (seg.gradient / 100) * seg.distance;
      points.push({ x: dist, y: elev });
    });
    return points;
  }, [course]);
  const snapshot: RaceSnapshot = useMemo(() => {
    if (!activeRace || !activeRace.snapshots.length) return { t: 0, athletes: [] };
    const snaps = activeRace.snapshots;
    const endIdx = snaps.length - 1;
    const endTime = snaps[endIdx].t;
    const clampedTime = Math.min(viewTime, endTime);

    // Binary search for bounding snapshots by time to avoid linear scan per frame.
    let low = 0;
    let high = endIdx;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (snaps[mid].t < clampedTime) low = mid + 1;
      else high = mid;
    }
    const bIdx = low;
    const aIdx = Math.max(0, bIdx - 1);
    const a = snaps[aIdx];
    const b = snaps[bIdx] || a;
    if (!b || aIdx === bIdx) return a;

    const span = Math.max(0.001, b.t - a.t);
    const alpha = Math.min(1, Math.max(0, (clampedTime - a.t) / span));
    const mix = (x: number, y: number) => x + (y - x) * alpha;

    // Pre-map b athletes for quick lookup.
    const bMap = new Map(b.athletes.map((ath) => [ath.id, ath]));

    return {
      t: clampedTime,
      athletes: a.athletes.map((ath) => {
        const next = bMap.get(ath.id) || ath;
        return {
          ...ath,
          distance: mix(ath.distance, next.distance),
          laneOffset: mix(ath.laneOffset || 0, next.laneOffset || 0),
          energy: mix(ath.energy, next.energy),
          groupId: next.groupId ?? ath.groupId,
        };
      }),
    };
  }, [activeRace, viewTime]);

  const frameIndex = useMemo(() => {
    if (!activeRace || !activeRace.snapshots.length) return 0;
    const snaps = activeRace.snapshots;
    const endIdx = snaps.length - 1;
    const endTime = snaps[endIdx].t;
    const clampedTime = Math.min(viewTime, endTime);
    let low = 0;
    let high = endIdx;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (snaps[mid].t < clampedTime) low = mid + 1;
      else high = mid;
    }
    return low;
  }, [activeRace, viewTime]);

  const sorted = useMemo(() => {
    const ordered = [...snapshot.athletes].sort((a, b) => b.distance - a.distance);
    const leader = ordered[0];
    return ordered.map((a) => {
      const gapMeters = leader ? leader.distance - a.distance : 0;
      const estSpeed = leader && leader.distance > 0 && snapshot.t > 0 ? leader.distance / snapshot.t : 5;
      const gapSeconds = gapMeters > 0 ? gapMeters / Math.max(0.1, estSpeed) : 0;
      return { ...a, gapSeconds };
    });
  }, [snapshot.athletes, snapshot.t]);

  const playerRoster = useMemo(() => {
    const id = playerTeamId || Object.keys(teams)[0];
    const team = teams[id];
    const ids = team?.athletes || [];
    const map = new Set(ids);
    return sorted.filter((a) => map.has(a.id));
  }, [sorted, teams, playerTeamId]);

  const finishOrder = finished
    ? [...(activeRace?.snapshots[activeRace.snapshots.length - 1].athletes || [])].sort((a, b) => b.distance - a.distance)
    : [];
  const pastResult = pastResults.find((r) => r.raceId === params.raceId);
  const meta = activeRace || pastResult?.meta;
  const conditions = meta?.conditions;
  const prepLineup = racePrep?.lineup || [];
  const prepIssues: string[] = [];
  if (prepLineup.length < 6) prepIssues.push("Select at least 6 skiers");
  if (!racePrep?.tactic) prepIssues.push("Set a tactic in race prep");

  useEffect(() => {
    if (!focusId && sorted.length) {
      setFocusId(sorted[0].id);
    }
  }, [focusId, sorted]);

  const focusIndex = sorted.findIndex((a) => a.id === focusId);
  const cycleFocus = (dir: 1 | -1) => {
    if (!sorted.length) return;
    const nextIdx = ((focusIndex >= 0 ? focusIndex : 0) + dir + sorted.length) % sorted.length;
    setFocusId(sorted[nextIdx].id);
  };

  return (
    <div className="w-full h-screen flex">
      <div className="flex-1 relative">
        {blocked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80">
            <div className="w-[420px] rounded-xl border border-white/10 bg-white/5 p-4 text-slate-100 shadow-xl">
              <div className="text-lg font-semibold">Race prep required</div>
              <div className="mt-2 text-sm text-slate-300">
                Complete the checklist before starting the race.
              </div>
              <ul className="mt-2 list-disc pl-5 text-xs text-amber-200 space-y-1">
                {prepIssues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    // Auto-fill lineup with full roster and set default tactic
                    const ids = Object.values(athletes).map((a) => a.id);
                    setRacePrep({
                      raceId: params.raceId,
                      lineup: ids,
                      tactic: racePrep?.tactic || "PROTECT_LEADER",
                      pacing: racePrep?.pacing || "STEADY",
                      roles: racePrep?.roles,
                      skiChoice: racePrep?.skiChoice,
                      waxChoice: racePrep?.waxChoice,
                      conditions: racePrep?.conditions,
                    });
                    setBlocked(false);
                    startRace(params.raceId);
                  }}
                  className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Auto-complete & start
                </button>
                <Link
                  href="/race-setup"
                  className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/20"
                >
                  Go to race prep
                </Link>
              </div>
            </div>
          </div>
        )}
        {activeRace && course ? (
          <>
            <RaceCanvas
              snapshot={snapshot}
              course={course}
              focusAthleteId={focusId}
              athletes={athletes}
              playerTeamId={playerTeamId}
              settings={renderSettings}
              onSlopeChange={setSlopePct}
              onFocusSelect={(id) => setFocusId(id)}
            />
            <RaceHud
              snapshot={snapshot}
              courseName={course?.name}
              courseDistance={course?.totalDistance}
              slopePct={slopePct}
              frame={frameIndex}
              totalFrames={activeRace.snapshots.length}
              focusId={focusId}
              onNextFocus={() => cycleFocus(1)}
              onPrevFocus={() => cycleFocus(-1)}
              playing={playing}
              onTogglePlay={() => setPlaying((p) => !p)}
              speed={speed}
              onSpeedChange={(s) => setSpeed(s)}
            />
            <div className="pointer-events-auto absolute bottom-3 left-4 flex gap-2 rounded bg-slate-900/70 px-3 py-2 text-xs text-white">
              <span>Time</span>
              <input
                type="range"
                min={0}
                max={Math.max(activeRace.snapshots[activeRace.snapshots.length - 1]?.t || 0, 0)}
                value={viewTime}
                step={0.1}
                onChange={(e) => {
                  setPlaying(false);
                  setViewTime(Number(e.target.value));
                }}
              />
              <span>{viewTime.toFixed(1)}s</span>
            </div>
          </>
        ) : (
          <div className="p-6 text-slate-100">Loading race...</div>
        )}
      </div>
      <div className="w-96 border-l p-4 bg-slate-900/70 text-slate-100 overflow-y-auto">
        <div className="mb-4 rounded border border-white/10 bg-white/5 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">Performance</div>
            <label className="flex items-center gap-1 text-[11px]">
              <input
                type="checkbox"
                className="accent-blue-500"
                checked={renderSettings.shadows}
                onChange={(e) => setRenderSettings((s) => ({ ...s, shadows: e.target.checked }))}
              />
              Shadows
            </label>
          </div>
          <div className="space-y-1">
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Trees</span>
              <input
                type="range"
                min={0.3}
                max={1.5}
                step={0.1}
                value={renderSettings.treeDensity}
                onChange={(e) => setRenderSettings((s) => ({ ...s, treeDensity: Number(e.target.value) }))}
              />
              <span className="w-10 text-right text-[11px]">{renderSettings.treeDensity.toFixed(1)}x</span>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Snow</span>
              <input
                type="range"
                min={0.3}
                max={1.6}
                step={0.1}
                value={renderSettings.snowCount}
                onChange={(e) => setRenderSettings((s) => ({ ...s, snowCount: Number(e.target.value) }))}
              />
              <span className="w-10 text-right text-[11px]">{renderSettings.snowCount.toFixed(1)}x</span>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Resolution</span>
              <input
                type="range"
                min={1}
                max={2}
                step={0.1}
                value={renderSettings.dpr}
                onChange={(e) => setRenderSettings((s) => ({ ...s, dpr: Number(e.target.value) }))}
              />
              <span className="w-10 text-right text-[11px]">{renderSettings.dpr.toFixed(1)}x</span>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Weather</span>
              <select
                value={renderSettings.weather}
                onChange={(e) => setRenderSettings((s) => ({ ...s, weather: e.target.value as any }))}
                className="rounded bg-slate-800 px-2 py-1 text-xs"
              >
                <option value="clear">Clear</option>
                <option value="snow">Snow</option>
                <option value="fog">Fog</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-300">Time</span>
              <select
                value={renderSettings.timeOfDay}
                onChange={(e) => setRenderSettings((s) => ({ ...s, timeOfDay: e.target.value as any }))}
                className="rounded bg-slate-800 px-2 py-1 text-xs"
              >
                <option value="sunrise">Sunrise</option>
                <option value="noon">Noon</option>
                <option value="dusk">Dusk</option>
              </select>
            </label>
            {elevationProfile.length > 1 && (
              <div className="mt-2 rounded bg-white/5 p-2">
                <button
                  className="pointer-events-auto text-[11px] font-semibold text-blue-200 hover:text-blue-100"
                  onClick={() => setShowProfile((v) => !v)}
                >
                  {showProfile ? "Hide" : "Show"} height profile
                </button>
                {showProfile && (
                  <ProfileChart points={elevationProfile} />
                )}
              </div>
            )}
          </div>
        </div>
        <div className="font-semibold mb-2">Leaderboard</div>
        <div className="space-y-1">
          {sorted.map((a, idx) => (
            <button
              key={a.id}
              className={`flex w-full items-center justify-between rounded px-1 py-1 text-left text-sm ${
                a.id === focusId ? "bg-white/10" : "hover:bg-white/5"
              }`}
              onClick={() => setFocusId(a.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {idx + 1} {a.groupId !== undefined ? `· G${a.groupId}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  {((teams[athletes[a.id]?.teamId || ""] as any)?.logo) ? (
                    <img
                      src={(teams[athletes[a.id]?.teamId || ""] as any)?.logo as string}
                      alt="team logo"
                      className="h-5 w-5 rounded-full object-contain bg-white/10"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <Link href={`/athlete/${a.id}`} className="underline text-blue-200 hover:text-blue-100">
                    {athletes[a.id]?.name || a.id}
                  </Link>
                </div>
              </div>
              <span className="text-xs text-slate-400">
                {Math.round(a.distance / 100) / 10} km · {idx === 0 ? "—" : `+${a.gapSeconds.toFixed(1)}s`}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 font-semibold">My team status</div>
        <div className="space-y-2 mt-1">
          {playerRoster.map((a) => {
            const full = athletes[a.id];
            return (
              <div key={a.id} className="rounded border border-white/10 bg-white/5 p-2 text-xs">
                <div className="font-semibold text-sm">{full?.name || a.id}</div>
                {full ? (
                  <div className="text-slate-300">
                    Form {full.state.form} · Fatigue {full.state.fatigue} · Morale {full.state.morale}
                  </div>
                ) : null}
                <div className="text-slate-400">
                  Energy {Math.round(a.energy)} · Pace {snapshot.t > 0 ? Math.round(a.distance / snapshot.t) : 0} m/s
                </div>
                <div className="text-slate-400">Tactic: {meta?.tactic || "N/A"} · Pacing: {meta?.pacing || "STEADY"}</div>
              </div>
            );
          })}
        </div>
        {meta && (
          <div className="mt-4 rounded border border-white/10 bg-white/5 p-3 text-sm space-y-1">
            <div className="font-semibold">Race context</div>
            {conditions ? (
              <div className="text-slate-300 text-xs">
                Temp {conditions.temperatureC}°C · Snow {conditions.snow} · Wind {conditions.windKph} km/h
              </div>
            ) : null}
            <div className="text-slate-300 text-xs">
              Skis {meta.skiChoice || "Auto"} · Wax {meta.waxChoice || "Auto"}
            </div>
            <div className="text-slate-400 text-xs">
              Lineup: {meta.lineup?.length ? meta.lineup.length : "full field"}
            </div>
          </div>
        )}
        {finished && (
          <div className="mt-4">
            <div className="font-semibold mb-1">Results</div>
            <div className="space-y-1 text-sm">
              {finishOrder.map((a, idx) => (
                <div key={a.id} className="flex justify-between">
                  <span>
                    {idx + 1}. {athletes[a.id]?.name || a.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    {Math.round(a.distance / 100) / 10} km · {idx === 0 ? "—" : `+${((finishOrder[0].distance - a.distance) / Math.max(0.1, finishOrder[0].distance / snapshot.t)).toFixed(1)}s`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {pastResult && (
          <div className="mt-4">
            <div className="font-semibold mb-1">Points</div>
            <div className="space-y-1 text-sm">
              {pastResult.results.map((r, idx) => (
                <div key={r.athleteId} className="flex justify-between">
                  <span>
                    {idx + 1}. {athletes[r.athleteId]?.name || r.athleteId}
                  </span>
                  <span className="text-xs text-slate-400">{r.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4">
          <div className="font-semibold mb-1">Standings (teams)</div>
          <div className="space-y-1 text-sm">
            {Object.entries(standings.teams)
              .sort((a, b) => b[1] - a[1])
              .map(([teamId, pts], idx) => (
                <div key={teamId} className="flex justify-between">
                  <span>
                    {idx + 1}. {teams[teamId]?.name || teamId}
                  </span>
                  <span className="text-xs text-slate-400">{pts} pts</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileChart({ points }: { points: { x: number; y: number }[] }) {
  const sanitized = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!sanitized.length) return null;

  const width = 320;
  const height = 100;
  const maxX = Math.max(1, sanitized[sanitized.length - 1].x || 0);
  const minY = Math.min(...sanitized.map((p) => p.y));
  const maxY = Math.max(...sanitized.map((p) => p.y));
  const rangeY = maxY - minY || 1;

  const mapX = (x: number) => (x / maxX) * (width - 10) + 5;
  const mapY = (y: number) => height - ((y - minY) / rangeY) * (height - 10) - 5;

  const d = sanitized
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${mapX(p.x).toFixed(2)} ${mapY(p.y).toFixed(2)}`)
    .join(" ");

  return (
    <svg width={width} height={height} className="mt-2 text-slate-200">
      <path d={d} fill="none" stroke="#38bdf8" strokeWidth={2} />
      <rect x={0} y={0} width={width} height={height} fill="none" stroke="rgba(255,255,255,0.1)" />
    </svg>
  );
}
