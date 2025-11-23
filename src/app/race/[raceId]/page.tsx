"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../../../state/gameStore";
import { RaceCanvas } from "../../../components/race/RaceCanvas";
import { raceCourses } from "../../../game/data/sampleData";
import { RaceSnapshot } from "../../../game/domain/types";

export default function RacePage({ params }: { params: { raceId: string } }) {
  const { activeRace, startRace, finishRace, teams, playerTeamId, athletes, standings, pastResults } =
    useGameStore((state) => ({
      activeRace: state.activeRace,
      startRace: state.startRace,
      finishRace: state.finishRace,
      teams: state.teams,
      playerTeamId: state.playerTeamId,
      athletes: state.athletes,
      standings: state.standings,
      pastResults: state.pastResults,
    }));
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!activeRace || activeRace.raceId !== params.raceId) {
      startRace(params.raceId);
    }
    setFrame(0);
    setFinished(false);
  }, [activeRace?.raceId, params.raceId, startRace, activeRace]);

  useEffect(() => {
    if (!activeRace) return;
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
  }, [activeRace, playing, speed]);

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

  return (
    <div className="w-full h-screen flex">
      <div className="flex-1 relative">
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
                <div className="text-slate-400">Tactic: {activeRace.tactic || "N/A"}</div>
              </div>
            );
          })}
        </div>
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
