 "use client";

import React, { useMemo, useRef } from "react";
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
    <Canvas camera={{ position: [0, 12, 24], fov: 50 }}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[20, 30, 10]} intensity={0.9} />
      <SnowGround />
      <Track course={course} />
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

function Track({ course }: { course: RaceCourse }) {
  const curve = useTrackCurve(course);
  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 200, 0.8, 8, false),
    [curve]
  );

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#ffffff" />
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
        pos.addScaledVector(side, a.laneOffset || 0);

        return <SkiFigure key={a.id} position={pos} forward={dir} />;
      })}
    </>
  );
}

function SkiFigure({ position, forward }: { position: THREE.Vector3; forward: THREE.Vector3 }) {
  const rotationY = Math.atan2(forward.x, forward.z);

  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 1.6, 8]} />
      <meshStandardMaterial color="#1d4ed8" />
    </mesh>
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
