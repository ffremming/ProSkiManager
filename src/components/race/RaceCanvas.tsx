"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { RaceSnapshot, RaceCourse } from "../../game/domain/types";
import { TrackProfile, loadTrackProfile, slopeAtDistance } from "../../game/render/trackBuilder";
import { Environment } from "../../game/render/Environment";
import {
  Ground,
  Terrain,
  Track,
  GrooveLines,
  TreeLine,
  SnowParticles,
  CourseMarkers,
  TrackBerms,
  TrackProps,
  FarHills,
  SurroundingForest,
} from "../../game/render/TrackScene";
import { Skiers } from "../../game/render/Skiers";
import { ChaseCamera } from "../../game/render/ChaseCamera";

type RaceCanvasProps = {
  snapshot: RaceSnapshot;
  course: RaceCourse;
  focusAthleteId?: string;
  onSlopeChange?: (slopePct: number) => void;
  onFocusSelect?: (athleteId: string) => void;
  athletes?: Record<string, any>;
  playerTeamId?: string;
  settings?: {
    shadows: boolean;
    treeDensity: number;
    snowCount: number;
    dpr: number;
    weather: "clear" | "snow" | "fog";
    timeOfDay: "noon" | "sunrise" | "dusk";
  };
};

export function RaceCanvas({ snapshot, course, focusAthleteId, settings, onSlopeChange, onFocusSelect, athletes, playerTeamId }: RaceCanvasProps) {
  const [profile, setProfile] = useState<TrackProfile | null>(null);
  const hasAthletes = snapshot?.athletes && snapshot.athletes.length > 0;

  const focus = useMemo(
    () => snapshot.athletes.find((a) => a.id === focusAthleteId) || snapshot.athletes[0],
    [snapshot.athletes, focusAthleteId]
  );

  useEffect(() => {
    if (profile && focus && onSlopeChange) {
      onSlopeChange(slopeAtDistance(focus.distance, profile) * 100);
    }
  }, [profile, focus, onSlopeChange]);

  useEffect(() => {
    let alive = true;
    loadTrackProfile(course).then((p) => {
      if (alive) setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, [course]);

  if (!profile) {
    return <div className="flex h-full items-center justify-center bg-slate-900 text-slate-100">Loading track...</div>;
  }
  if (!hasAthletes) {
    return <div className="flex h-full items-center justify-center bg-slate-900 text-slate-100">Waiting for race data…</div>;
  }

  return (
    <Canvas className="h-full w-full" camera={{ position: [0, 12, 22], fov: 55 }} shadows={settings?.shadows} dpr={[1, settings?.dpr || 1.5]}>
      <Environment
        shadows={settings?.shadows !== false}
        weather={settings?.weather || "clear"}
        timeOfDay={settings?.timeOfDay || "noon"}
      />
      <Ground profile={profile} />
      <FarHills />
      <SnowParticles density={(settings?.snowCount ?? 1) * (settings?.weather === "snow" ? 1.4 : settings?.weather === "fog" ? 0.6 : 0.3)} />
      <Terrain profile={profile} />
      <Track profile={profile} />
      <GrooveLines profile={profile} offset={0.7} />
      <GrooveLines profile={profile} offset={-0.7} />
      <TrackBerms profile={profile} />
      <TrackProps profile={profile} />
      <CourseMarkers profile={profile} course={course} />
      <TreeLine profile={profile} density={settings?.treeDensity ?? 1} />
      <SurroundingForest profile={profile} density={settings?.treeDensity ?? 1} />
      <Skiers
        snapshot={snapshot}
        profile={profile}
        focusedId={focus?.id}
        onSelect={onFocusSelect}
        athletes={athletes}
        playerTeamId={playerTeamId}
      />
      {focus && <ChaseCamera profile={profile} focusDistance={focus.distance} focusLane={focus.laneOffset} />}
    </Canvas>
  );
}
