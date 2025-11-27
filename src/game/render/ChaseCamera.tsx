import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TrackProfile, distanceToT } from "./trackBuilder";
import { useRef } from "react";

type ChaseCameraProps = {
  profile: TrackProfile;
  focusDistance: number;
  focusLane?: number;
  enabled?: boolean;
};

export function ChaseCamera({ profile, focusDistance, focusLane = 0, enabled = true }: ChaseCameraProps) {
  const { camera } = useThree();
  const offset = new THREE.Vector3(0, 10, -14);
  const lookTarget = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    if (!enabled) return;
    const safeDt = Math.min(dt || 0.016, 0.05);
    const t = distanceToT(focusDistance, profile);
    const pos = profile.curve.getPointAt(t);
    const tangent = profile.curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const focus = pos.clone().addScaledVector(side, focusLane || 0);
    const desired = focus
      .clone()
      .addScaledVector(tangent, offset.z)
      .add(new THREE.Vector3(0, offset.y, 0));

    const damping = 8;
    const alpha = 1 - Math.exp(-damping * Math.max(0.001, safeDt));
    camera.position.lerp(desired, alpha);
    lookTarget.current.lerp(focus, alpha);
    camera.lookAt(lookTarget.current.x, lookTarget.current.y + 1.4, lookTarget.current.z);
  });

  return null;
}
