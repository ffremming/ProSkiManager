import * as THREE from "three";
import { useMemo } from "react";
import { RaceSnapshot } from "../domain/types";
import { TrackProfile, distanceToT, slopeAtDistance } from "./trackBuilder";

type SkiersProps = {
  snapshot: RaceSnapshot;
  profile: TrackProfile;
  focusedId?: string;
  onSelect?: (id: string) => void;
  athletes?: Record<string, { teamId?: string; name?: string }>;
  playerTeamId?: string;
};

export function Skiers({ snapshot, profile, focusedId, onSelect, athletes, playerTeamId }: SkiersProps) {
  const materials = useMemo(
    () => ({
      ski: new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.4, metalness: 0.1 }),
      pole: new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.2, metalness: 0.6 }),
    }),
    []
  );

  return (
    <>
      {snapshot.athletes.map((a) => {
        const athlete = athletes?.[a.id];
        const isPlayer = athlete?.teamId && playerTeamId && athlete.teamId === playerTeamId;
        const t = distanceToT(a.distance, profile);
        const pos = profile.curve.getPointAt(t);
        const tangent = profile.curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const slope = slopeAtDistance(a.distance, profile);
        const laneOffset = (a.laneOffset || 0) + (a.groupId ? a.groupId * 0.05 : 0);
        const worldPos = pos.clone().addScaledVector(side, laneOffset);
        const color = getRacerColor(a.id);
        const state = pickAnimationState(slope);
        return (
          <SkierFigure
            key={a.id}
            position={worldPos}
            forward={tangent}
            color={color}
            state={state}
            highlight={a.id === focusedId}
            materials={materials}
            onSelect={onSelect ? () => onSelect(a.id) : undefined}
            isPlayer={Boolean(isPlayer)}
            label={isPlayer ? athlete?.name || a.id : undefined}
          />
        );
      })}
    </>
  );
}

function pickAnimationState(slope: number) {
  if (slope <= -0.02) return "TUCK";
  if (slope >= 0.03) return "CLIMB";
  return "DOUBLE";
}

function SkierFigure({
  position,
  forward,
  color,
  state,
  highlight,
  materials,
  onSelect,
  isPlayer,
  label,
}: {
  position: THREE.Vector3;
  forward: THREE.Vector3;
  color: string;
  state: "DOUBLE" | "TUCK" | "CLIMB";
  highlight: boolean;
  materials: { ski: THREE.Material; pole: THREE.Material };
  onSelect?: () => void;
  isPlayer?: boolean;
  label?: string;
}) {
  const rotationY = Math.atan2(forward.x, forward.z);
  const leanBase = state === "TUCK" ? -0.25 : state === "CLIMB" ? 0.18 : 0.08;
  const poleAngle = state === "DOUBLE" ? 0.6 : state === "CLIMB" ? 0.9 : 0.3;
  const bodyColor = highlight ? "#f97316" : color;

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      >
      <mesh position={[0.18, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 0.02, 1.4]} />
        <primitive object={materials.ski} attach="material" />
      </mesh>
      <mesh position={[-0.18, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 0.02, 1.4]} />
        <primitive object={materials.ski} attach="material" />
      </mesh>

      <mesh position={[0.32, 0.5, -0.05]} rotation={[poleAngle, 0, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 1.2, 6]} />
        <primitive object={materials.pole} attach="material" />
      </mesh>
      <mesh position={[-0.32, 0.5, 0.05]} rotation={[poleAngle, 0, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 1.2, 6]} />
        <primitive object={materials.pole} attach="material" />
      </mesh>

      <mesh position={[0, 0.95, 0]} rotation={[leanBase, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.24, 1.05, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} />
      </mesh>

      <mesh position={[0, 1.52, -0.06]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#f1d5a5" roughness={0.5} />
      </mesh>

      <mesh position={[0, 1.02, 0.2]} rotation={[Math.PI / 10, 0, 0]}>
        <planeGeometry args={[0.32, 0.42]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {isPlayer && (
        <group position={[0, 2.1, 0]}>
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.2, 0.6, 12]} />
            <meshStandardMaterial color="#10b981" emissive="#0f766e" emissiveIntensity={0.4} />
          </mesh>
          {label && (
            <mesh position={[0, 0.9, 0]}>
              <planeGeometry args={[1.2, 0.4]} />
              <meshBasicMaterial map={getLabelTexture(label)} transparent />
            </mesh>
          )}
        </group>
      )}
      {highlight && (
        <mesh position={[0, 2.6, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.25, 0.5, 12]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

const racerColors = ["#0ea5e9", "#ef4444", "#22c55e", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#eab308"];
function getRacerColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  const idx = Math.abs(hash) % racerColors.length;
  return racerColors[idx];
}

const labelTextureCache = new Map<string, THREE.Texture>();
function getLabelTexture(text: string) {
  if (labelTextureCache.has(text)) return labelTextureCache.get(text) as THREE.Texture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.anisotropy = 4;
  labelTextureCache.set(text, texture);
  return texture;
}
