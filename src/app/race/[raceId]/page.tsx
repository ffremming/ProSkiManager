"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../../../state/gameStore";
import { RaceCanvas } from "../../../components/race/RaceCanvas";
import { raceCourses } from "../../../game/data/sampleData";
import { RaceSnapshot } from "../../../game/domain/types";

export default function RacePage({ params }: { params: { raceId: string } }) {
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
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const frameCount = activeRace?.snapshots.length || 0;
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!activeRace || activeRace.raceId !== params.raceId) {
      // Only start race if prep is acceptable
      const prepLineup = racePrep?.lineup || [];
      const minReady = prepLineup.length >= 6 && (racePrep?.tactic || "").length > 0;
      if (minReady) {
        startRace(params.raceId);
        setBlocked(false);
      } else {
        setBlocked(true);
      }
    }
    setFrame(0);
    setFinished(false);
  }, [activeRace?.raceId, params.raceId, startRace, activeRace, racePrep]);

  useEffect(() => {
    if (!activeRace || finished) return;
    if (!playing) return;
    const id = setInterval(() => {
      setFrame((f) => {
        const next = Math.min(f + speed, activeRace.snapshots.length - 1);
        if (next >= activeRace.snapshots.length - 1) {
          setFinished(true);
        }
        return next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [activeRace, playing, speed, finished]);

  // When finished, commit results to store once.
  useEffect(() => {
    if (!activeRace) return;
    if (finished) {
      finishRace();
    }
  }, [finished, activeRace, finishRace]);

  const course = activeRace ? raceCourses[activeRace.courseId] : undefined;
  const snapshot: RaceSnapshot =
    activeRace?.snapshots[Math.min(frame, activeRace.snapshots.length - 1)] ||
    ({ t: 0, athletes: [] } as RaceSnapshot);

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
          <RaceCanvas snapshots={activeRace.snapshots} course={course} frame={frame} />
        ) : (
          <div className="p-6 text-slate-100">Loading race...</div>
        )}
        <div className="absolute top-4 left-4 bg-white/80 px-4 py-2 rounded shadow">
          <div className="font-semibold">{course?.name || "Race"}</div>
          <div>
            Time: {snapshot.t}s · Frame {frame + 1}/{activeRace?.snapshots.length || 0}
          </div>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="rounded bg-slate-900/80 px-3 py-2 text-white"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => activeRace && setFrame(activeRace.snapshots.length - 1)}
            className="rounded bg-slate-900/80 px-3 py-2 text-white"
          >
            Skip
          </button>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded px-3 py-2 ${speed === s ? "bg-blue-500 text-white" : "bg-slate-900/80 text-white"}`}
            >
              {s}x
            </button>
          ))}
          <div className="flex items-center gap-2 rounded bg-slate-900/70 px-3 py-2 text-xs text-white">
            <span>Scrub</span>
            <input
              type="range"
              min={0}
              max={Math.max(frameCount - 1, 0)}
              value={frame}
              onChange={(e) => {
                setPlaying(false);
                setFrame(Number(e.target.value));
              }}
            />
          </div>
        </div>
      </div>
      <div className="w-96 border-l p-4 bg-slate-900/70 text-slate-100 overflow-y-auto">
        <div className="font-semibold mb-2">Leaderboard</div>
        <div className="space-y-1">
          {sorted.map((a, idx) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {idx + 1} {a.groupId !== undefined ? `· G${a.groupId}` : ""}
                </span>
                <span>{athletes[a.id]?.name || a.id}</span>
              </div>
              <span className="text-xs text-slate-400">
                {Math.round(a.distance / 100) / 10} km · {idx === 0 ? "—" : `+${a.gapSeconds.toFixed(1)}s`}
              </span>
            </div>
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
