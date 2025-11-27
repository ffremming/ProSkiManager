import * as THREE from "three";
import { useMemo } from "react";
import { TrackProfile } from "./trackBuilder";

export function Ground({ profile }: { profile: TrackProfile }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#f2f6fb";
      ctx.fillRect(0, 0, 1024, 1024);
      const noise = ctx.createImageData(1024, 1024);
      for (let i = 0; i < noise.data.length; i += 4) {
        const n = 232 + Math.random() * 16;
        noise.data[i] = n;
        noise.data[i + 1] = n + 6;
        noise.data[i + 2] = n + 10;
        noise.data[i + 3] = 255;
      }
      ctx.putImageData(noise, 0, 0);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 40);
    tex.anisotropy = 8;
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const size = Math.max(1600, (profile.bounds.max.z - profile.bounds.min.z + profile.bounds.max.x - profile.bounds.min.x) * 4);
    const geo = new THREE.PlaneGeometry(size, size, 220, 220);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const samples = 320;
    const curvePoints = Array.from({ length: samples }, (_, i) => profile.curve.getPointAt(i / (samples - 1)));

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
      const falloff = Math.exp(-dist * 0.004);
      const noise = (Math.sin(x * 0.01) + Math.cos(z * 0.012)) * 0.8;
      return y * falloff + noise;
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
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, profile.bounds.min.y - 2, 0]} receiveShadow>
      <meshStandardMaterial color="#eef3f8" roughness={0.95} map={texture} />
    </mesh>
  );
}

export function Terrain({ profile }: { profile: TrackProfile }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, "#f5f8fb");
      gradient.addColorStop(1, "#e6edf5");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      // Add speckled noise for snow grain.
      const noiseCount = 1500;
      for (let i = 0; i < noiseCount; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const alpha = 0.05 + Math.random() * 0.08;
        ctx.fillStyle = `rgba(200,215,230,${alpha})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 20);
    tex.anisotropy = 8;
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const sizeX = Math.max(320, (profile.bounds.max.x - profile.bounds.min.x) * 3.6);
    const sizeZ = Math.max(380, (profile.bounds.max.z - profile.bounds.min.z) * 4);
    const geo = new THREE.PlaneGeometry(sizeX, sizeZ, 140, 180);
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
      const falloff = Math.exp(-dist * 0.05);
      const noise = (Math.sin(x * 0.015) + Math.cos(z * 0.012)) * 0.5;
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
      position={[0, profile.bounds.min.y - 1, 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#e7edf3" roughness={0.92} metalness={0.0} map={texture} />
    </mesh>
  );
}

export function Track({ profile }: { profile: TrackProfile }) {
  const { geometry, material } = useMemo(() => {
    const width = 3.4;
    const thickness = 0.3;
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -thickness / 2);
    shape.lineTo(-width / 2, thickness / 2);
    shape.lineTo(width / 2, thickness / 2);
    shape.lineTo(width / 2, -thickness / 2);
    shape.lineTo(-width / 2, -thickness / 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 900,
      bevelEnabled: false,
      extrudePath: profile.curve,
    });
    geo.computeVertexNormals();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n = Math.sin(x * 4) * 0.01 + Math.cos(z * 2) * 0.008;
      pos.setY(i, pos.getY(i) + n);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: "#f7f9fb",
      roughness: 0.38,
      metalness: 0.08,
      envMapIntensity: 0.2,
    });
    return { geometry: geo, material: mat };
  }, [profile.curve]);

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

export function GrooveLines({ profile, offset }: { profile: TrackProfile; offset: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const steps = 400;
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
      <lineBasicMaterial color="#cdd3dd" linewidth={2} />
    </line>
  );
}

type Marker = { label: string; position: THREE.Vector3; color: string };

export function CourseMarkers({ profile, course }: { profile: TrackProfile; course: { totalDistance: number; sprints?: number[]; climbs?: number[] } }) {
  const markers = useMemo<Marker[]>(() => {
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
          <mesh position={[0, 2.3, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 4.6, 8]} />
            <meshStandardMaterial color={m.color} />
          </mesh>
          <mesh position={[0, 4.8, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[1.2, 0.5]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function TreeLine({ profile, density = 1 }: { profile: TrackProfile; density?: number }) {
  const trees = useMemo(() => {
    const count = Math.max(120, Math.floor(520 * density));
    const pts: { position: THREE.Vector3; scale: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * 0.98;
      const pos = profile.curve.getPointAt(t);
      const tangent = profile.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const dist = 6 + Math.random() * 12;
      const jitter = (Math.random() - 0.5) * 4;
      const world = pos
        .clone()
        .addScaledVector(side, dist)
        .addScaledVector(side.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), jitter);
      world.y += (Math.random() - 0.5) * 0.5;
      pts.push({ position: world, scale: 1.6 + Math.random() * 2.4 });
      pts.push({ position: world.clone().addScaledVector(side, -dist * 1.3), scale: 1.3 + Math.random() * 1.8 });
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
  const count = Math.max(200, Math.floor(1400 * density));
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 120;
      arr[i * 3 + 1] = Math.random() * 80 + 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    return arr;
  }, [count]);
  return (
    <points position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={1.2} sizeAttenuation color="#e5edf5" opacity={0.9} transparent depthWrite={false} />
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
      leftPts.push(pos.clone().addScaledVector(side, -2.6));
      rightPts.push(pos.clone().addScaledVector(side, 2.6));
    }
    return { left: leftPts, right: rightPts };
  }, [profile.curve]);

  const makeMesh = (pts: THREE.Vector3[]) => {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.35, 8, false);
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
    const steps = 40;
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
              <meshStandardMaterial color="#0ea5e9" />
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
              <meshStandardMaterial color="#ef4444" />
            </mesh>
          </group>
        )
      )}
    </>
  );
}

export function FarHills() {
  const ring = useMemo(() => {
    const segments = 64;
    const inner = 240;
    const outer = 520;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const ang = (i / segments) * Math.PI * 2;
      const r = inner + (Math.sin(i * 0.4) + 1) * 30 + Math.random() * 10;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = 6 + Math.sin(ang * 2) * 8 + Math.cos(ang * 3) * 6;
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

    const count = Math.max(500, Math.floor(900 * density));
    const pts: { position: THREE.Vector3; scale: number }[] = [];
    const bounds = {
      minX: profile.bounds.min.x - 180,
      maxX: profile.bounds.max.x + 180,
      minZ: profile.bounds.min.z - 200,
      maxZ: profile.bounds.max.z + 200,
    };
    for (let i = 0; i < count; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      const pos = new THREE.Vector3(x, 0, z);
      const d2 = nearestDistSq(pos);
      if (d2 < 90) {
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
    </>
  );
}
