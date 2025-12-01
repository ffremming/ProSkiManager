import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TrackProfile, distanceToT } from "./trackBuilder";
import { useMemo, useRef } from "react";

type ChaseCameraProps = {
  profile: TrackProfile;
  focusDistance: number;
  focusLane?: number;
  enabled?: boolean;
};

export function ChaseCamera({ profile, focusDistance, focusLane = 0, enabled = true }: ChaseCameraProps) {
  const { camera } = useThree();
  const baseOffset = useMemo(() => new THREE.Vector3(0, 12, -18), []);
  const lookTarget = useRef(new THREE.Vector3());
  const driftClock = useRef(Math.random() * 10);
  const targetOffset = useRef(baseOffset.clone());
  const currentOffset = useRef(baseOffset.clone());
  const modeTimer = useRef(0);

  useFrame((_, dt) => {
    if (!enabled) return;
    const safeDt = Math.min(dt || 0.016, 0.05);
    driftClock.current += safeDt;
    modeTimer.current += safeDt;

    // Pick a new helicopter offset every few seconds to keep the angle fresh.
    if (modeTimer.current > 6 + Math.random() * 4) {
      modeTimer.current = 0;
      const lateral = (Math.random() - 0.5) * 12; // swing side to side
      const height = 10 + Math.random() * 6;
      const behind = -14 - Math.random() * 8;
      targetOffset.current = new THREE.Vector3(lateral, height, behind);
    }
    // Smoothly blend toward the new offset.
    currentOffset.current.lerp(targetOffset.current, 1 - Math.exp(-1.4 * Math.max(0.001, safeDt)));

    const t = distanceToT(focusDistance, profile);
    const pos = profile.curve.getPointAt(t);
    const tangent = profile.curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const focus = pos.clone().addScaledVector(side, focusLane || 0);

    // Gentle camera drift/hover to make the view feel alive instead of locked to center.
    const driftSide = Math.sin(driftClock.current * 0.6) * 1.1;
    const driftForward = Math.sin(driftClock.current * 0.35 + 1.4) * 0.9;
    const driftUp = Math.sin(driftClock.current * 0.85 + 0.6) * 0.5;
    const desired = focus
      .clone()
      .addScaledVector(side, currentOffset.current.x + driftSide * 0.8)
      .addScaledVector(tangent, currentOffset.current.z + driftForward)
      .add(new THREE.Vector3(0, currentOffset.current.y + driftUp, 0));

    const damping = 8;
    const alpha = 1 - Math.exp(-damping * Math.max(0.001, safeDt));
    camera.position.lerp(desired, alpha);
    // Look slightly ahead so the camera anticipates turns.
    const lookAhead = focus.clone().addScaledVector(tangent, 8);
    lookTarget.current.lerp(lookAhead, alpha);

    const aim = lookTarget.current.clone();
    aim.y += 1.6;
    camera.lookAt(aim.x, aim.y, aim.z);
  });

  return null;
}
