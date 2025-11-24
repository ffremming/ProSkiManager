 "use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RaceSnapshot, RaceCourse } from "../../game/domain/types";

type RaceCanvasProps = {
  snapshots: RaceSnapshot[];
  course: RaceCourse;
  frame: number;
};

// Thin three.js wrapper to render the course and moving skiers.
export function RaceCanvas({ snapshots, course, frame }: RaceCanvasProps) {
  const snapshot = snapshots[Math.min(frame, snapshots.length - 1)];

  return (
    <Canvas camera={{ position: [0, 10, 20], fov: 55 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[18, 24, 8]} intensity={1} />
      <SnowGround />
      <CourseTrack course={course} />
      <GrooveLines course={course} offset={0.35} />
      <GrooveLines course={course} offset={-0.35} />
      <Skiers snapshot={snapshot} course={course} />
      <FollowCamera snapshot={snapshot} course={course} />
    </Canvas>
  );
}

function useTrackCurve(course: RaceCourse) {
  return useMemo(() => {
    const points: THREE.Vector3[] = [];
    let z = 0;
    let elevation = 0;

    course.segments.forEach((segment) => {
      z -= segment.distance / 200; // compress distance visually.
      elevation += segment.gradient * 0.05;
      points.push(new THREE.Vector3((Math.random() - 0.5) * 6, elevation, z));
    });

    return new THREE.CatmullRomCurve3(points);
  }, [course]);
}

function CourseTrack({ course }: { course: RaceCourse }) {
  const curve = useTrackCurve(course);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 280, 0.9, 14, false), [curve]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#f5f6f7" />
    </mesh>
  );
}

function SnowGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[200, 400]} />
      <meshStandardMaterial color="#f3f4f6" />
    </mesh>
  );
}

function GrooveLines({ course, offset }: { course: RaceCourse; offset: number }) {
  const curve = useTrackCurve(course);
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const steps = 260;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      pos.addScaledVector(side, offset);
      pts.push(pos);
    }
    return pts;
  }, [curve, offset]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#cbd5e1" linewidth={2} />
    </line>
  );
}

const racerColors = ["#0ea5e9", "#ef4444", "#22c55e", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#eab308"];
function getRacerColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  const idx = Math.abs(hash) % racerColors.length;
  return racerColors[idx];
}

function Skiers({ snapshot, course }: { snapshot: RaceSnapshot; course: RaceCourse }) {
  const curve = useTrackCurve(course);
  const totalDistance = course.totalDistance;

  return (
    <>
      {snapshot.athletes.map((a) => {
        const t = THREE.MathUtils.clamp(a.distance / totalDistance, 0, 0.999);
        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const dir = new THREE.Vector3().copy(tangent).normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        pos.addScaledVector(side, (a.laneOffset || 0) + (a.groupId ? a.groupId * 0.05 : 0));

        const color = getRacerColor(a.id);
        return <SkiFigure key={a.id} position={pos} forward={dir} color={color} />;
      })}
    </>
  );
}

function SkiFigure({ position, forward, color }: { position: THREE.Vector3; forward: THREE.Vector3; color: string }) {
  const rotationY = Math.atan2(forward.x, forward.z);
  const lean = Math.atan2(forward.length(), 6) * 0.4;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Skis */}
      <mesh position={[0.18, 0.02, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.02, 1.4]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[-0.18, 0.02, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.02, 1.4]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {/* Poles */}
      <mesh position={[0.3, 0.5, -0.1]} rotation={[lean, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.2, 6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[-0.3, 0.5, 0.1]} rotation={[lean, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.2, 6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} rotation={[lean, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 1, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.5, -0.05]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      {/* Bib */}
      <mesh position={[0, 1, 0.18]} rotation={[Math.PI / 12, 0, 0]}>
        <planeGeometry args={[0.3, 0.4]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
    </group>
  );
}

function FollowCamera({ snapshot, course }: { snapshot: RaceSnapshot; course: RaceCourse }) {
  const curve = useTrackCurve(course);
  const totalDistance = course.totalDistance;
  const target = snapshot.athletes[0];
  const { camera } = useThree();
  const focusOffset = new THREE.Vector3(0, 4, 0);

  useFrame(() => {
    if (!target) return;
    const t = THREE.MathUtils.clamp(target.distance / totalDistance, 0, 0.999);
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    const desired = new THREE.Vector3()
      .copy(pos)
      .add(new THREE.Vector3().copy(tangent).multiplyScalar(-8))
      .add(focusOffset);

    camera.position.lerp(desired, 0.08);
    camera.lookAt(pos.x, pos.y + 1, pos.z);
  });

  return null;
}
