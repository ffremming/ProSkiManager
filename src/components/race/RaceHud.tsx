import { useMemo } from "react";
import { RaceSnapshot } from "../../game/domain/types";

type RaceHudProps = {
  snapshot: RaceSnapshot;
  courseName?: string;
  courseDistance?: number;
  slopePct?: number;
  frame: number;
  totalFrames: number;
  focusId?: string;
  onNextFocus?: () => void;
  onPrevFocus?: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  onFocusSelect?: (id: string) => void;
};

export function RaceHud({
  snapshot,
  courseName,
  frame,
  totalFrames,
  courseDistance,
  slopePct,
  focusId,
  onNextFocus,
  onPrevFocus,
  playing,
  onTogglePlay,
  speed,
  onSpeedChange,
  onFocusSelect,
}: RaceHudProps) {
  const ordered = useMemo(() => {
    const arr = [...snapshot.athletes].sort((a, b) => b.distance - a.distance);
    const leader = arr[0];
    return arr.map((a) => {
      const gapM = leader ? leader.distance - a.distance : 0;
      const speedMs = leader && snapshot.t > 0 ? leader.distance / snapshot.t : 5;
      const gap = gapM > 0 ? gapM / Math.max(0.1, speedMs) : 0;
      return { ...a, gap };
    });
  }, [snapshot]);

  const focusIdx = ordered.findIndex((a) => a.id === focusId);
  const focus = focusIdx >= 0 ? ordered[focusIdx] : ordered[0];
  const pelotons = useMemo(() => {
    const groups: { label: string; ids: string[] }[] = [];
    let current: { label: string; ids: string[]; head: number } | null = null;
    ordered.forEach((a, idx) => {
      if (!current || a.gap - current.head > 10) {
        current = { label: `G${groups.length + 1}`, ids: [], head: a.gap };
        groups.push(current);
      }
      current.ids.push(`${idx + 1}.${a.id.slice(0, 3)}`);
    });
    return groups;
  }, [ordered]);

  const distanceKm = (focus?.distance || 0) / 1000;
  const pct = courseDistance ? Math.min(100, ((focus?.distance || 0) / courseDistance) * 100) : 0;

  return (
    <div className="pointer-events-none absolute inset-0 p-4 text-white">
      <div className="flex flex-col gap-2 max-w-sm">
        <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.22em]">
          <span>{courseName || "Race"}</span>
          <span className="text-blue-200/80">Frame {frame + 1}/{totalFrames}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-black/60 px-3 py-2 text-sm shadow-lg shadow-blue-900/30">
          <div className="flex items-center gap-2">
            <button onClick={onPrevFocus} className="pointer-events-auto rounded bg-white/10 px-2 py-1 text-[11px] font-semibold hover:bg-white/20">
              Prev
            </button>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-blue-200/80">Focus</div>
              <div className="font-semibold text-sm">{focus?.id || "—"}</div>
              <div className="text-[11px] text-slate-200">
                {focusIdx >= 0 ? `Pos ${focusIdx + 1}` : "Pack"} · {focus ? `+${focus.gap.toFixed(1)}s` : "—"}
              </div>
            </div>
            <button onClick={onNextFocus} className="pointer-events-auto rounded bg-white/10 px-2 py-1 text-[11px] font-semibold hover:bg-white/20">
              Next
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 pointer-events-auto">
            <button onClick={onTogglePlay} className="rounded bg-blue-500 px-2 py-1 text-[11px] font-semibold hover:bg-blue-400">
              {playing ? "Pause" : "Play"}
            </button>
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`rounded px-2 py-1 text-[10px] font-semibold ${
                  speed === s ? "bg-white text-slate-900" : "bg-black/40 text-slate-100 hover:bg-black/60"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-slate-900/70 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-blue-200/80 uppercase tracking-[0.26em]">Gaps</span>
            <div className="flex flex-wrap gap-1">
              {ordered.slice(0, 3).map((a, idx) => (
                <div key={a.id} className="rounded bg-white/5 px-2 py-1">
                  {idx + 1}. {a.id.slice(0, 4)} {idx === 0 ? "—" : `+${a.gap.toFixed(1)}s`}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <div className="rounded bg-white/10 px-2 py-1">
              Peloton {pelotons.slice(0, 4).map((g) => `${g.label} (${g.ids.length})`).join(" · ")}
              {pelotons.length > 4 ? ` · +${pelotons.length - 4} more` : ""}
            </div>
            <div className="rounded bg-white/10 px-2 py-1">
              {distanceKm.toFixed(1)} km · {pct.toFixed(1)}%
            </div>
            {slopePct !== undefined && (
              <div className="rounded bg-white/10 px-2 py-1">
                Gradient {slopePct > 0 ? "+" : ""}
                {slopePct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
