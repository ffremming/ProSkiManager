"use client";

import { useEffect, useState } from "react";
import { RaceMap, RaceMapEvent } from "../../components/race/RaceMap";
import { raceGeo } from "../../game/data/raceGeo";
import { loadReferenceData } from "../../game/data/referenceData";

export default function CalendarPage() {
  const [events, setEvents] = useState<RaceMapEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { seasonRaces, raceCourses, raceConditions } = await loadReferenceData();
        if (!mounted) return;
        const mapped: RaceMapEvent[] = seasonRaces.map((race) => {
          const course = raceCourses[race.courseId];
          const geo = raceGeo[race.courseId] || { lat: 52, lon: 10, location: "TBD", date: "TBD" };
          return {
            id: race.id,
            name: course?.name || race.courseId,
            date: `${geo.date} · ${raceConditions[course?.id || race.courseId]?.temperatureC ?? "?"}°C ${
              raceConditions[course?.id || race.courseId]?.snow ?? ""
            }`,
            location: geo.location,
            lat: geo.lat,
            lon: geo.lon,
            courseId: course?.id || race.courseId,
          };
        });
        setEvents(mapped);
      } catch (err) {
        setError("Unable to load race calendar data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1021] via-[#0c1224] to-[#0f1a32] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-blue-200/80">Calendar</p>
            <h1 className="text-3xl font-semibold">Race map</h1>
            <p className="text-slate-300">Visual map of the season. Click a marker for details.</p>
          </div>
        </header>
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">Loading calendar…</div>
        ) : (
          <RaceMap events={events} />
        )}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-blue-900/20">
          <div className="text-sm uppercase tracking-wide text-slate-300">Race list</div>
          {error && <div className="mt-1 text-xs text-amber-200">{error}</div>}
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <div className="text-slate-100 font-semibold">{e.name}</div>
                  <div className="text-xs text-slate-400">{e.location}</div>
                </div>
                <div className="text-sm text-slate-300">{e.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
