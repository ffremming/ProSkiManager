import * as THREE from "three";
import { useMemo } from "react";
import { TrackProfile } from "./trackBuilder";

// Centralized knobs for quick visual tweaks. Adjust here instead of hunting in the component bodies.
const TRACK_SCENE_CONFIG = {
  ground: {
    canvasSize: 1024,
    baseColor: "#dfeaf5",
    materialColor: "#e2edf5",
    noiseBase: 195,
    noiseRange: 60,
    repeat: 18,
    subdivisions: 2200,
    falloff: 0.0018,
    noiseAmp: 1.2,
    noiseFreqX: 0.024,
    noiseFreqZ: 0.022,
    heightOffset: -1.2,
    baseOffset: -8,
    sizeMultiplier: 4,
  },
  terrain: {
    canvasSize: 512,
    noiseCount: 1500,
    repeat: 20,
    subdivisionsX: 1400,
    subdivisionsZ: 1800,
    falloff: 0.05,
    noiseAmp: 0.7,
    noiseFreqX: 0.018,
    noiseFreqZ: 0.016,
    sizeMultiplierX: 3.6 * 10,
    sizeMultiplierZ: 4 * 10,
    heightOffset: -0.3,
  },
  track: {
    width: 6,
    thickness: 0.3,
    wiggleXFreq: 4,
    wiggleZFreq: 2,
    wiggleAmpX: 0.01,
    wiggleAmpZ: 0.008,
    roughness: 0.38,
    metalness: 0.08,
    envMapIntensity: 0.2,
    extrudeSteps: 900,
  },
  grooves: { steps: 400, color: "#cdd3dd" },
  markers: {
    poleHeight: 4.6,
    poleRadius: 0.05,
    labelHeight: 4.8,
    labelSize: [1.2, 0.5] as [number, number],
    poleSegments: 8,
  },
  treeLine: {
    baseCount: 520,
    minDist: 6,
    distRand: 12,
    jitter: 4,
    heightJitter: 0.5,
    scaleMin: 1.6,
    scaleRand: 2.4,
    innerScaleMin: 1.3,
    innerScaleRand: 1.8,
  },
  snow: {
    baseCount: 1800,
    minCount: 200,
    spread: 140,
    height: 90,
    size: 2.4,
    opacity: 0.8,
    color: "#dce7f5",
  },
  berms: { offset: 2.6, radius: 0.35 },
  props: { count: 400, bannerColor: "#0ea5e9", flagColor: "#ef4444" },
  farHills: { segments: 64, inner: 240, outer: 520, heightBase: 6 },
  forest: {
    baseCount: 1200,
    minCount: 700,
    paddingX: 180,
    paddingZ: 200,
    minTrackDistSq: 90,
  },
  forestPatches: {
    patchCount: 14,
    treesPerPatch: [18, 32] as [number, number],
    offset: [10, 18] as [number, number],
    jitter: 6,
    minTrackClearance: 5,
  },
  spectators: {
    count: 160,
    minOffset: 4.5,
    maxOffset: 8.5,
    jitter: 2,
    height: [1.3, 1.9] as [number, number],
    bodyColor: "#334155",
    accentColors: ["#0ea5e9", "#ef4444", "#fbbf24", "#22c55e", "#8b5cf6"],
  },
  shrubs: {
    baseCount: 1500,
    minCount: 800,
    paddingX: 120,
    paddingZ: 140,
    minTrackDistSq: 60,
    sizeRange: [0.8, 2] as [number, number],
    color: "#2f5c38",
  },
};

export function Ground({ profile }: { profile: TrackProfile }) {
  const texture = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.ground;
    const canvas = document.createElement("canvas");
    canvas.width = cfg.canvasSize;
    canvas.height = cfg.canvasSize;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = cfg.baseColor;
      ctx.fillRect(0, 0, cfg.canvasSize * 10, cfg.canvasSize * 10);
      const noise = ctx.createImageData(cfg.canvasSize, cfg.canvasSize);
      for (let i = 0; i < noise.data.length; i += 4) {
        const n = cfg.noiseBase + Math.random() * cfg.noiseRange;
        noise.data[i] = n;
        noise.data[i + 1] = n + 6;
        noise.data[i + 2] = n + 10;
        noise.data[i + 3] = 255;
      }
      ctx.putImageData(noise, 0, 0);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(cfg.repeat, cfg.repeat);
    tex.anisotropy = 8;
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.ground;
    const span = profile.bounds.max.z - profile.bounds.min.z + profile.bounds.max.x - profile.bounds.min.x;
    const size = Math.max(1600, span * cfg.sizeMultiplier);
    const geo = new THREE.PlaneGeometry(size, size, cfg.subdivisions, cfg.subdivisions);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const samples = 320;
    const curvePoints = Array.from({ length: samples }, (_, i) => profile.curve.getPointAt(i / (samples - 1)));
    const avgY = curvePoints.reduce((sum, p) => sum + p.y, 0) / curvePoints.length;

    const nearestY = (x: number, z: number) => {
      let best = Infinity;
      let y = 0;
      for (let i = 0; i < curvePoints.length; i++) {
        const p = curvePoints[i];
        const dx = p.x - x;
        const dz = p.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) {
          best = d2;
          y = p.y;
        }
      }
      const dist = Math.sqrt(best);
      const follow = Math.exp(-dist * cfg.falloff);
      const base = avgY * (1 - follow) + y * follow;
      const noise = (Math.sin(x * cfg.noiseFreqX) + Math.cos(z * cfg.noiseFreqZ)) * cfg.noiseAmp;
      return base - 0.35 + noise;
    };

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = nearestY(x, z);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [profile.bounds, profile.curve]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, profile.bounds.min.y + TRACK_SCENE_CONFIG.ground.heightOffset, 0]}
      receiveShadow
    >
      <meshStandardMaterial color={TRACK_SCENE_CONFIG.ground.materialColor} roughness={0.95} map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Simple always-visible base to guarantee a ground plane even if height sampling fails.
export function BaseGround({ profile }: { profile: TrackProfile }) {
  const size = Math.max(2400, (profile.bounds.max.x - profile.bounds.min.x + profile.bounds.max.z - profile.bounds.min.z) * 5);
  const y = profile.bounds.min.y + TRACK_SCENE_CONFIG.ground.baseOffset;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial color="#e9f0f7" roughness={0.96} />
    </mesh>
  );
}

export function Terrain({ profile }: { profile: TrackProfile }) {
  const texture = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.terrain;
    const canvas = document.createElement("canvas");
    canvas.width = cfg.canvasSize * 10;
    canvas.height = cfg.canvasSize * 10;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, cfg.canvasSize, cfg.canvasSize);
      gradient.addColorStop(0, "#f5f8fb");
      gradient.addColorStop(1, "#e6edf5");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cfg.canvasSize, cfg.canvasSize);
      // Add speckled noise for snow grain; tweak noiseCount for more/less grain.
      for (let i = 0; i < cfg.noiseCount; i++) {
        const x = Math.random() * cfg.canvasSize;
        const y = Math.random() * cfg.canvasSize;
        const alpha = 0.05 + Math.random() * 0.08;
        ctx.fillStyle = `rgba(200,215,230,${alpha})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(cfg.repeat, cfg.repeat);
    tex.anisotropy = 8;
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.terrain;
    const sizeX = Math.max(320, (profile.bounds.max.x - profile.bounds.min.x) * cfg.sizeMultiplierX);
    const sizeZ = Math.max(380, (profile.bounds.max.z - profile.bounds.min.z) * cfg.sizeMultiplierZ);
    const geo = new THREE.PlaneGeometry(sizeX, sizeZ, cfg.subdivisionsX, cfg.subdivisionsZ);
    const pos = geo.attributes.position as THREE.BufferAttribute;

    // Pre-sample curve for quick nearest lookup.
    const samples = 260;
    const curvePoints = Array.from({ length: samples }, (_, i) => {
      const t = i / (samples - 1);
      return { t, point: profile.curve.getPointAt(t) };
    });

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let nearestY = 0;
      let nearestDist = Infinity;
      for (let s = 0; s < samples; s++) {
        const p = curvePoints[s].point;
        const dx = p.x - x;
        const dz = p.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < nearestDist) {
          nearestDist = d2;
          nearestY = p.y;
        }
      }
      const dist = Math.sqrt(nearestDist);
      const falloff = Math.exp(-dist * cfg.falloff);
      const noise = (Math.sin(x * cfg.noiseFreqX) + Math.cos(z * cfg.noiseFreqZ)) * cfg.noiseAmp;
      const y = nearestY * falloff + noise;
      pos.setY(i, y);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [profile.bounds, profile.curve]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, profile.bounds.min.y + TRACK_SCENE_CONFIG.terrain.heightOffset, 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#e7edf3" roughness={0.92} metalness={0.0} map={texture} />
    </mesh>
  );
}

export function Track({ profile }: { profile: TrackProfile }) {
  const { geometry, material } = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.track;
    const radius = cfg.width / 2;
    // TubeGeometry keeps orientation stable; we squash the cross section toward the curve's centerline without altering the GPX height profile.
    const geo = new THREE.TubeGeometry(profile.curve, cfg.extrudeSteps, radius, 12, false);
    const tubularSegments = geo.parameters.tubularSegments;
    const radialSegments = geo.parameters.radialSegments;
    const center = new THREE.Vector3();
    const flattenScale = cfg.thickness / (radius * 2); // keep ~cfg.thickness total vertical thickness relative to the curve
    const halfThickness = radius * flattenScale;
    // Recenter each vertex around the curve point for its segment, then compress vertical offset only.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const segment = Math.min(tubularSegments, Math.floor(i / (radialSegments + 1)));
      const t = segment / tubularSegments;
      profile.curve.getPointAt(t, center);
      const dx = pos.getX(i) - center.x;
      const dy = pos.getY(i) - center.y;
      const dz = pos.getZ(i) - center.z;
      const wiggle =
        Math.sin(center.x * cfg.wiggleXFreq) * cfg.wiggleAmpX + Math.cos(center.z * cfg.wiggleZFreq) * cfg.wiggleAmpZ;
      // Drop the cross section so its top aligns with the curve centerline, keeping berms/markers level.
      pos.setXYZ(i, center.x + dx, center.y - halfThickness + dy * flattenScale + wiggle * cfg.thickness, center.z + dz);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: "#f7f9fb",
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      envMapIntensity: cfg.envMapIntensity,
    });
    return { geometry: geo, material: mat };
  }, [profile.curve]);

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

export function GrooveLines({ profile, offset }: { profile: TrackProfile; offset: number }) {
  const points = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.grooves;
    const pts: THREE.Vector3[] = [];
    const steps = cfg.steps;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = profile.curve.getPointAt(t);
      const tangent = profile.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      pts.push(pos.clone().addScaledVector(side, offset));
    }
    return pts;
  }, [profile, offset]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={TRACK_SCENE_CONFIG.grooves.color} linewidth={2} />
    </line>
  );
}

type Marker = { label: string; position: THREE.Vector3; color: string };

export function CourseMarkers({ profile, course }: { profile: TrackProfile; course: { totalDistance: number; sprints?: number[]; climbs?: number[] } }) {
  const markers = useMemo<Marker[]>(() => {
    const cfg = TRACK_SCENE_CONFIG.markers;
    const list: Marker[] = [];
    const addMarker = (dist: number, label: string, color: string) => {
      const t = dist / course.totalDistance;
      const pos = profile.curve.getPointAt(Math.min(0.999, Math.max(0, t)));
      list.push({ label, position: pos, color });
    };
    addMarker(0, "Start", "#22c55e");
    addMarker(course.totalDistance, "Finish", "#ef4444");
    (course.sprints || []).forEach((d, idx) => addMarker(d, `Sprint ${idx + 1}`, "#38bdf8"));
    (course.climbs || []).forEach((d, idx) => addMarker(d, `Climb ${idx + 1}`, "#facc15"));
    return list;
  }, [course.climbs, course.sprints, course.totalDistance, profile.curve]);

  return (
    <>
      {markers.map((m) => (
        <group key={`${m.label}-${m.position.x}-${m.position.z}`} position={m.position}>
          <mesh position={[0, TRACK_SCENE_CONFIG.markers.poleHeight / 2, 0]}>
            <cylinderGeometry
              args={[
                TRACK_SCENE_CONFIG.markers.poleRadius,
                TRACK_SCENE_CONFIG.markers.poleRadius,
                TRACK_SCENE_CONFIG.markers.poleHeight,
                TRACK_SCENE_CONFIG.markers.poleSegments,
              ]}
            />
            <meshStandardMaterial color={m.color} />
          </mesh>
          <mesh position={[0, TRACK_SCENE_CONFIG.markers.labelHeight, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={TRACK_SCENE_CONFIG.markers.labelSize} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function TreeLine({ profile, density = 1 }: { profile: TrackProfile; density?: number }) {
  const trees = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.treeLine;
    const count = Math.max(120, Math.floor(cfg.baseCount * density));
    const pts: { position: THREE.Vector3; scale: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * 0.98;
      const pos = profile.curve.getPointAt(t);
      const tangent = profile.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const dist = cfg.minDist + Math.random() * cfg.distRand;
      const jitter = (Math.random() - 0.5) * cfg.jitter;
      const world = pos
        .clone()
        .addScaledVector(side, dist)
        .addScaledVector(side.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), jitter);
      world.y += (Math.random() - 0.5) * cfg.heightJitter;
      pts.push({ position: world, scale: cfg.scaleMin + Math.random() * cfg.scaleRand });
      pts.push({
        position: world.clone().addScaledVector(side, -dist * 1.3),
        scale: cfg.innerScaleMin + Math.random() * cfg.innerScaleRand,
      });
    }
    return pts;
  }, [profile, density]);

  return (
    <>
      {trees.map((t, idx) => (
        <Tree key={idx} position={t.position} scale={t.scale} />
      ))}
    </>
  );
}

function Tree({ position, scale }: { position: THREE.Vector3; scale: number }) {
  return (
    <group position={position} scale={scale} castShadow>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 4, 6]} />
        <meshStandardMaterial color="#5b4424" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4, 0]} castShadow>
        <coneGeometry args={[2.1, 4.5, 10, 1]} />
        <meshStandardMaterial color="#0f3828" roughness={0.75} />
      </mesh>
      <mesh position={[0, 6, 0]} castShadow>
        <coneGeometry args={[1.5, 3.8, 10, 1]} />
        <meshStandardMaterial color="#0f4c2e" roughness={0.75} />
      </mesh>
    </group>
  );
}

export function SnowParticles({ density = 1 }: { density?: number }) {
  const count = Math.max(TRACK_SCENE_CONFIG.snow.minCount, Math.floor(TRACK_SCENE_CONFIG.snow.baseCount * density));
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * TRACK_SCENE_CONFIG.snow.spread;
      arr[i * 3 + 1] = Math.random() * TRACK_SCENE_CONFIG.snow.height + 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * TRACK_SCENE_CONFIG.snow.spread;
    }
    return arr;
  }, [count]);
  return (
    <points position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={TRACK_SCENE_CONFIG.snow.size}
        sizeAttenuation
        color={TRACK_SCENE_CONFIG.snow.color}
        opacity={TRACK_SCENE_CONFIG.snow.opacity}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </points>
  );
}

export function TrackBerms({ profile }: { profile: TrackProfile }) {
  const { left, right } = useMemo(() => {
    const steps = 320;
    const leftPts: THREE.Vector3[] = [];
    const rightPts: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = profile.curve.getPointAt(t);
      const tangent = profile.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      leftPts.push(pos.clone().addScaledVector(side, -TRACK_SCENE_CONFIG.berms.offset));
      rightPts.push(pos.clone().addScaledVector(side, TRACK_SCENE_CONFIG.berms.offset));
    }
    return { left: leftPts, right: rightPts };
  }, [profile.curve]);

  const makeMesh = (pts: THREE.Vector3[]) => {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, TRACK_SCENE_CONFIG.berms.radius, 8, false);
    const mat = new THREE.MeshStandardMaterial({ color: "#eef3f8", roughness: 0.65, metalness: 0 });
    return <mesh geometry={geo} material={mat} receiveShadow castShadow />;
  };

  return (
    <>
      {makeMesh(left)}
      {makeMesh(right)}
    </>
  );
}

export function TrackProps({ profile }: { profile: TrackProfile }) {
  const props = useMemo(() => {
    const markers: { pos: THREE.Vector3; rot: number; type: "banner" | "flag" }[] = [];
    const steps = TRACK_SCENE_CONFIG.props.count;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const pos = profile.curve.getPointAt(t);
      const tangent = profile.curve.getTangentAt(t).normalize();
      const rot = Math.atan2(tangent.x, tangent.z);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const offset = 4 + (i % 2 === 0 ? 1 : -1);
      const p = pos.clone().addScaledVector(side, offset);
      markers.push({ pos: p, rot, type: i % 3 === 0 ? "banner" : "flag" });
    }
    return markers;
  }, [profile.curve]);

  return (
    <>
      {props.map((m, idx) =>
        m.type === "banner" ? (
          <group key={idx} position={m.pos} rotation={[0, m.rot, 0]}>
            <mesh position={[0, 1.4, 0]}>
              <boxGeometry args={[0.08, 2.8, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            <mesh position={[0, 2.4, 0]}>
              <planeGeometry args={[1.8, 0.8]} />
              <meshStandardMaterial color={TRACK_SCENE_CONFIG.props.bannerColor} />
            </mesh>
          </group>
        ) : (
          <group key={idx} position={m.pos} rotation={[0, m.rot, 0]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 3.2, 8]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[0, 2.8, 0]} rotation={[0, 0, 0]}>
              <planeGeometry args={[0.9, 0.9]} />
              <meshStandardMaterial color={TRACK_SCENE_CONFIG.props.flagColor} />
            </mesh>
          </group>
        )
      )}
    </>
  );
}

export function FarHills() {
  const ring = useMemo(() => {
    const { segments, inner, outer, heightBase } = TRACK_SCENE_CONFIG.farHills;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const ang = (i / segments) * Math.PI * 2;
      const r = inner + (Math.sin(i * 0.4) + 1) * 30 + Math.random() * 10;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = heightBase + Math.sin(ang * 2) * 8 + Math.cos(ang * 3) * 6;
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.LatheGeometry(points, 1);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={ring} rotation={[0, 0, 0]} position={[0, -4, 0]} receiveShadow>
      <meshStandardMaterial color="#c7d3de" roughness={0.94} />
    </mesh>
  );
}

export function SurroundingForest({ profile, density = 1 }: { profile: TrackProfile; density?: number }) {
  const trees = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.forest;
    const samples = 320;
    const curvePoints = Array.from({ length: samples }, (_, i) => profile.curve.getPointAt(i / (samples - 1)));
    const nearestDistSq = (p: THREE.Vector3) => {
      let best = Infinity;
      for (let i = 0; i < curvePoints.length; i++) {
        const c = curvePoints[i];
        const dx = c.x - p.x;
        const dz = c.z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) best = d2;
      }
      return best;
    };

    const count = Math.max(cfg.minCount, Math.floor(cfg.baseCount * density));
    const pts: { position: THREE.Vector3; scale: number }[] = [];
    const bounds = {
      minX: profile.bounds.min.x - cfg.paddingX,
      maxX: profile.bounds.max.x + cfg.paddingX,
      minZ: profile.bounds.min.z - cfg.paddingZ,
      maxZ: profile.bounds.max.z + cfg.paddingZ,
    };
    for (let i = 0; i < count; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      const pos = new THREE.Vector3(x, 0, z);
      const d2 = nearestDistSq(pos);
      if (d2 < cfg.minTrackDistSq) {
        i--;
        continue;
      }
      pos.y = (Math.sin(x * 0.01) + Math.cos(z * 0.012)) * 0.6;
      pts.push({ position: pos, scale: 1 + Math.random() * 2.4 });
    }
    return pts;
  }, [profile.bounds, profile.curve, density]);

  return (
    <>
      {trees.map((t, idx) => (
        <Tree key={`forest-${idx}`} position={t.position} scale={t.scale} />
      ))}
      <ForestPatches profile={profile} />
      <Shrubs profile={profile} />
    </>
  );
}

function Shrubs({ profile, density = 1 }: { profile: TrackProfile; density?: number }) {
  const shrubs = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.shrubs;
    const samples = 260;
    const curvePoints = Array.from({ length: samples }, (_, i) => profile.curve.getPointAt(i / (samples - 1)));
    const nearestDistSq = (p: THREE.Vector3) => {
      let best = Infinity;
      for (let i = 0; i < curvePoints.length; i++) {
        const c = curvePoints[i];
        const dx = c.x - p.x;
        const dz = c.z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) best = d2;
      }
      return best;
    };

    const count = Math.max(cfg.minCount, Math.floor(cfg.baseCount * (density ?? 1)));
    const pts: { position: THREE.Vector3; scale: number }[] = [];
    const bounds = {
      minX: profile.bounds.min.x - cfg.paddingX,
      maxX: profile.bounds.max.x + cfg.paddingX,
      minZ: profile.bounds.min.z - cfg.paddingZ,
      maxZ: profile.bounds.max.z + cfg.paddingZ,
    };
    for (let i = 0; i < count; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      const pos = new THREE.Vector3(x, 0, z);
      const d2 = nearestDistSq(pos);
      if (d2 < cfg.minTrackDistSq) {
        i--;
        continue;
      }
      pos.y = (Math.sin(x * 0.02) + Math.cos(z * 0.018)) * 0.3;
      const [min, max] = cfg.sizeRange;
      const scale = min + Math.random() * (max - min);
      pts.push({ position: pos, scale });
    }
    return pts;
  }, [density, profile.bounds, profile.curve]);

  return (
    <>
      {shrubs.map((s, idx) => (
        <mesh key={`shrub-${idx}`} position={s.position} scale={s.scale} receiveShadow castShadow>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial color={TRACK_SCENE_CONFIG.shrubs.color} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

export function ForestPatches({ profile }: { profile: TrackProfile }) {
  const patches = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.forestPatches;
    const pts: { position: THREE.Vector3; scale: number }[] = [];
    for (let i = 0; i < cfg.patchCount; i++) {
      const t = Math.random() * 0.98;
      const pos = profile.curve.getPointAt(t);
      const tangent = profile.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const offset = cfg.offset[0] + Math.random() * (cfg.offset[1] - cfg.offset[0]);
      const base = pos.clone().addScaledVector(side, (i % 2 === 0 ? 1 : -1) * offset);
      const count = Math.floor(cfg.treesPerPatch[0] + Math.random() * (cfg.treesPerPatch[1] - cfg.treesPerPatch[0]));
      for (let j = 0; j < count; j++) {
        const jitterSide = (Math.random() - 0.5) * cfg.jitter;
        const jitterForward = (Math.random() - 0.5) * cfg.jitter;
        const world = base
          .clone()
          .addScaledVector(side, jitterSide)
          .addScaledVector(tangent, jitterForward);
        const distToTrack = Math.abs(jitterSide + (offset - cfg.minTrackClearance));
        if (distToTrack < cfg.minTrackClearance) continue;
        world.y += (Math.random() - 0.5) * 0.4;
        pts.push({ position: world, scale: 2.2 + Math.random() * 1.8 });
      }
    }
    return pts;
  }, [profile.curve]);

  return (
    <>
      {patches.map((t, idx) => (
        <Tree key={`patch-${idx}`} position={t.position} scale={t.scale} />
      ))}
    </>
  );
}

export function Spectators({ profile }: { profile: TrackProfile }) {
  const people = useMemo(() => {
    const cfg = TRACK_SCENE_CONFIG.spectators;
    const pts: { position: THREE.Vector3; color: string; height: number }[] = [];
    for (let i = 0; i < cfg.count; i++) {
      const t = (i / cfg.count) * 0.98;
      const pos = profile.curve.getPointAt(t);
      const tangent = profile.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const offset = cfg.minOffset + Math.random() * (cfg.maxOffset - cfg.minOffset);
      const jitter = (Math.random() - 0.5) * cfg.jitter;
      const world = pos.clone().addScaledVector(side, (i % 2 === 0 ? 1 : -1) * offset + jitter);
      world.y += Math.sin(pos.x * 0.02 + pos.z * 0.015) * 0.2;
      const height = cfg.height[0] + Math.random() * (cfg.height[1] - cfg.height[0]);
      const color = cfg.accentColors[i % cfg.accentColors.length];
      pts.push({ position: world, color, height });
    }
    return pts;
  }, [profile.curve]);

  return (
    <>
      {people.map((p, idx) => (
        <group key={`fan-${idx}`} position={p.position}>
          <mesh position={[0, p.height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, p.height, 6]} />
            <meshStandardMaterial color={TRACK_SCENE_CONFIG.spectators.bodyColor} roughness={0.6} />
          </mesh>
          <mesh position={[0, p.height + 0.15, 0]} castShadow>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial color={p.color} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </>
  );
}
