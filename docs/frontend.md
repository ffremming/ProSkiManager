# Frontend & UI

## Tech Stack
- Next.js (App Router), React 18
- Zustand for client state
- Tailwind CSS
- React Three Fiber + drei for race rendering

## Routes (selected)
- `/` – Dashboard with links, finance snapshot, next action.
- `/new-game` – Team selection and start flow.
- `/race/[raceId]` – Race viewer + HUD + sidebar.
- `/training`, `/staff`, `/sponsors`, `/transfers`, `/scouting`, `/race-setup`, `/standings`, `/calendar`, `/team`, `/teams`.

## Race Viewer Components
- `components/race/RaceCanvas.tsx`: R3F scene; loads track profile (GPX or fallback), renders environment, ground/terrain, track, trees, props, snow, skiers, markers; chase camera follows focus.
- `components/race/RaceHud.tsx`: Overlay controls (focus prev/next, play/pause, speed), compact gaps/peloton summary, distance/gradient; minimal footprint.
- `game/render/trackBuilder.ts`: Builds Catmull-Rom spline from GPX or course segments; provides arc-length mapping and slope samples.
- `game/render/Skiers.tsx`: Renders skier figures with animation state, player labels, focus triangle; click-to-focus support.

## Controls & Sidebar
- Sidebar on race page: performance sliders (shadows, tree/snow density, DPR), weather/time presets, leaderboard (click to focus), player status cards, elevation profile toggle.
- Scrubber: time-based slider (seconds) under the viewer.

## Interactions
- Click skiers or leaderboard rows to change focus.
- Speed presets: 0.5/1/2/4x.
- Start race from dashboard “Start next race” button (auto-navigates).
- Height profile: toggle in sidebar; SVG chart rendered inline.

## Persistence & State Use
- UI pulls from Zustand `useGameStore`.
- Active race snapshots live in memory only; rest of state is persisted.
- Navigation hides game-only routes until `hasStarted` is true.

## Performance Toggles
- Shadows on/off; tree/snow density; DPR scaling; weather/time presets.
- Snow particle density tied to weather (heavier in “snow”, lighter in “clear/fog”).

