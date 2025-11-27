import * as THREE from "three";
import { RaceCourse } from "../domain/types";

export type TrackProfile = {
  curve: THREE.CatmullRomCurve3;
  arcTable: number[];
  totalDistance: number;
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  slopeSamples: { t: number; slope: number }[];
};

// Map course ids to GPX filenames (place files in /public/gpx).
const gpxMap: Record<string, string> = {
  vasaloppet: "Vasaloppet.gpx",
  marcialonga: "Marcialonga.gpx",
  jizerska: "Jizerska.gpx",
  "marcialonga-bodo": "Marcialonga Bodø.gpx",
};

export async function loadTrackProfile(course: RaceCourse): Promise<TrackProfile> {
  const gpxName = gpxMap[course.id];
  if (gpxName) {
    const sources = [`/gpx/${gpxName}`, `/game/data/gpx/${gpxName}`];
    for (const src of sources) {
      const fromGpx = await buildFromGpx(src, course).catch(() => null);
      if (fromGpx) return fromGpx;
    }
  }
  return buildFromCourseSegments(course);
}

function smoothElevations(points: THREE.Vector3[], window = 5) {
  if (points.length < 3) return points;
  const half = Math.max(1, Math.floor(window / 2));
  const smoothed: THREE.Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -half; j <= half; j++) {
      const idx = Math.min(points.length - 1, Math.max(0, i + j));
      sum += points[idx].y;
      count++;
    }
    smoothed.push(new THREE.Vector3(points[i].x, sum / count, points[i].z));
  }
  return smoothed;
}

async function buildFromGpx(url: string, course: RaceCourse): Promise<TrackProfile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Unable to fetch GPX");
  const text = await res.text();
  const dom = new DOMParser().parseFromString(text, "application/xml");
  const pts = Array.from(dom.querySelectorAll("trkpt"));
  if (!pts.length) throw new Error("No points in GPX");

  const coords = pts.map((p) => {
    const lat = parseFloat(p.getAttribute("lat") || "0");
    const lon = parseFloat(p.getAttribute("lon") || "0");
    const ele = parseFloat(p.querySelector("ele")?.textContent || "0");
    return { lat, lon, ele };
  });

  const origin = coords[0];
  const meterPerDegLat = 111_320;
  const meterPerDegLon = Math.cos((origin.lat * Math.PI) / 180) * 111_320;

  let totalLen = 0;
  const points: THREE.Vector3[] = [];
  coords.forEach((c, idx) => {
    const x = (c.lon - origin.lon) * meterPerDegLon;
    const z = (c.lat - origin.lat) * meterPerDegLat;
    const y = c.ele;
    points.push(new THREE.Vector3(x, y, z));
    if (idx > 0) {
      totalLen += points[idx].distanceTo(points[idx - 1]);
    }
  });
  if (totalLen <= 0) throw new Error("GPX length invalid");

  const scale = course.totalDistance / totalLen;
  const scaledPoints = smoothElevations(points.map((p) => p.clone().multiplyScalar(scale)), 9);
  const centered = centerPoints(scaledPoints);
  const curve = new THREE.CatmullRomCurve3(centered, false, "catmullrom", 0.1);
  curve.curveType = "catmullrom";
  curve.tension = 0.15;

  return finalizeProfile(curve, course.totalDistance);
}

function buildFromCourseSegments(course: RaceCourse): TrackProfile {
  const pts: THREE.Vector3[] = [];
  let z = 0;
  let elevation = 0;
  const wiggle = (n: number) => (Math.sin(n * 0.8) + Math.cos(n * 0.4)) * 2.5;

  course.segments.forEach((segment, idx) => {
    z -= segment.distance / 5;
    elevation += segment.gradient * segment.distance * 0.002;
    const x = wiggle(idx);
    pts.push(new THREE.Vector3(x, elevation, z));
  });

  const scaled = scaleLength(smoothElevations(pts, 5), course.totalDistance);
  const centered = centerPoints(scaled);
  const curve = new THREE.CatmullRomCurve3(centered, false, "catmullrom", 0.2);
  return finalizeProfile(curve, course.totalDistance);
}

function finalizeProfile(curve: THREE.CatmullRomCurve3, targetDistance: number): TrackProfile {
  const arcTable = curve.getLengths(1200);
  const total = arcTable[arcTable.length - 1] || targetDistance;
  const scale = targetDistance / total;
  curve.points.forEach((p) => p.multiplyScalar(scale));
  const scaledArc = curve.getLengths(1200);
  const bounds = computeBounds(curve.points);
  const slopeSamples = sampleSlope(curve);
  return { curve, arcTable: scaledArc, totalDistance: targetDistance, bounds, slopeSamples };
}

function centerPoints(points: THREE.Vector3[]) {
  const bounds = computeBounds(points);
  const offset = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);
  return points.map((p) => p.clone().sub(offset));
}

function computeBounds(points: THREE.Vector3[]) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  points.forEach((p) => {
    min.min(p);
    max.max(p);
  });
  return { min, max };
}

function scaleLength(points: THREE.Vector3[], targetLength: number) {
  if (points.length < 2) return points;
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += points[i].distanceTo(points[i - 1]);
  }
  if (length === 0) return points;
  const factor = targetLength / length;
  return points.map((p) => p.clone().multiplyScalar(factor));
}

function sampleSlope(curve: THREE.CatmullRomCurve3) {
  const samples: { t: number; slope: number }[] = [];
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p1 = curve.getPointAt(Math.max(0, t - 0.01));
    const p2 = curve.getPointAt(Math.min(1, t + 0.01));
    const delta = p2.y - p1.y;
    const horiz = new THREE.Vector2(p2.x - p1.x, p2.z - p1.z).length() || 1;
    samples.push({ t, slope: delta / horiz });
  }
  return samples;
}

export function distanceToT(distance: number, profile: TrackProfile) {
  const clamped = Math.max(0, Math.min(distance, profile.totalDistance));
  const targetArc = (clamped / profile.totalDistance) * (profile.arcTable[profile.arcTable.length - 1] || 1);
  let low = 0;
  let high = profile.arcTable.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (profile.arcTable[mid] < targetArc) low = mid;
    else high = mid;
  }
  const span = profile.arcTable[high] - profile.arcTable[low] || 1;
  const mix = (targetArc - profile.arcTable[low]) / span;
  return (low + mix) / (profile.arcTable.length - 1);
}

export function slopeAtDistance(distance: number, profile: TrackProfile) {
  if (!profile.slopeSamples.length) return 0;
  const t = distance / profile.totalDistance;
  const idx = Math.floor(t * (profile.slopeSamples.length - 1));
  const a = profile.slopeSamples[Math.max(0, Math.min(profile.slopeSamples.length - 1, idx))];
  const b = profile.slopeSamples[Math.max(0, Math.min(profile.slopeSamples.length - 1, idx + 1))];
  const blend = (t - a.t) / Math.max(1e-6, b.t - a.t);
  return THREE.MathUtils.lerp(a.slope, b.slope, blend);
}
