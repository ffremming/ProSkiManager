"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import europeMap from "../../game/data/europeMap.json";

export type RaceMapEvent = {
  id: string;
  name: string;
  date: string;
  location: string;
  lat: number;
  lon: number;
  courseId?: string;
};

export function RaceMap({ events }: { events: RaceMapEvent[] }) {
  const [selected, setSelected] = useState<RaceMapEvent | null>(null);

  const { bounds, projected, landPaths } = useMemo(() => {
    if (!events.length) {
      return {
        bounds: { latMin: 35, latMax: 72, lonMin: -12, lonMax: 32 },
        projected: [] as (RaceMapEvent & { pos: { x: number; y: number } })[],
        landPaths: [] as string[],
      };
    }

    const lats = events.map((e) => e.lat);
    const lons = events.map((e) => e.lon);
    const padLat = 3;
    const padLon = 5;
    const bounds = {
      latMin: Math.min(...lats, 35) - padLat,
      latMax: Math.max(...lats, 72) + padLat,
      lonMin: Math.min(...lons, -12) - padLon,
      lonMax: Math.max(...lons, 32) + padLon,
    };

    const projected = events.map((e) => ({
      ...e,
      pos: project(e.lat, e.lon, bounds),
    }));

    const feature = (europeMap as any).features?.[0];
    let landPaths: string[] = [];
    if (feature?.geometry?.coordinates) {
      const coords = feature.geometry.coordinates as number[][][];
      landPaths = coords.map((ring) =>
        ring
          .map((coord, idx) => {
            const [lon, lat] = coord;
            const p = project(lat, lon, bounds);
            return `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`;
          })
          .join(" ") + " Z"
      );
    }

    return { bounds, projected, landPaths };
  }, [events]);

  if (!events.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1021]/80 p-6 text-slate-200">
        No races available for this season yet.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1021] via-[#0d152d] to-[#0a0f1f] p-6 shadow-xl shadow-blue-900/30">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.28em] text-blue-200/80">Season map</div>
          <div className="text-xl font-semibold text-slate-50">Race calendar</div>
          <div className="text-slate-300 text-sm">Click a marker to see details.</div>
        </div>
        {selected && (
          <Link
            href={selected.courseId ? `/race/${selected.id}` : "#"}
            className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
          >
            Go to race
          </Link>
        )}
      </div>
      <div className="relative h-[520px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-slate-900/60 to-slate-950/60">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id="map-bg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0b1021" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#map-bg)" />
          <g fill="#111827" stroke="#0f172a" strokeWidth="0.2" opacity="0.9">
            {landPaths.map((d, idx) => (
              <path key={idx} d={d} />
            ))}
          </g>
          <g stroke="#1f2937" strokeWidth="0.2" opacity="0.4">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`h${i}`} x1="0" x2="100" y1={i * 10} y2={i * 10} />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v${i}`} y1="0" y2="100" x1={i * 10} x2={i * 10} />
            ))}
          </g>
          {projected.map((race) => (
            <g key={race.id} onClick={() => setSelected(race)} className="cursor-pointer">
              <circle
                cx={race.pos.x}
                cy={race.pos.y}
                r={2.5}
                fill={selected?.id === race.id ? "#f59e0b" : "#38bdf8"}
                stroke="#0b1021"
                strokeWidth={0.6}
              />
              <text x={race.pos.x + 3} y={race.pos.y - 1} fontSize={2.5} fill="#e5e7eb" className="pointer-events-none select-none">
                {race.name}
              </text>
            </g>
          ))}
        </svg>
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm uppercase tracking-wide text-blue-200/80">{selected.location}</div>
                <div className="text-xl font-semibold text-slate-50">{selected.name}</div>
                <div className="text-slate-300 text-sm">{selected.date}</div>
              </div>
              {selected.courseId ? (
                <Link
                  href={`/race/${selected.id}`}
                  className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
                >
                  View race
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function project(
  lat: number,
  lon: number,
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number }
) {
  const x = ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * 100;
  const y = (1 - (lat - bounds.latMin) / (bounds.latMax - bounds.latMin)) * 100;
  return { x, y };
}
