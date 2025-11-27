# Architecture

This project is split into pure domain/simulation logic and a Next.js UI layer that consumes it. The goal is to keep core rules framework-agnostic and let the frontend focus on rendering and interaction.

## High-Level Layout
- **Domain types**: `src/game/domain/types.ts` – shared contracts for athletes, teams, finance, races, race snapshots, equipment, etc.
- **Simulation**: `src/game/simulation/`
  - `trainingEngine.ts` – weekly training progression and fatigue changes.
  - `financeEngine.ts` – weekly income/expenses, sponsor payouts, history.
  - `raceEngine.ts` – converts course + athletes + prep into `RaceSnapshot[]`.
- **Data**: `src/game/data/`
  - `sampleData.ts` – builds initial state, teams/athletes, finance template, race calendar.
  - `athletePool.ts` – base athlete CSV-derived pool.
  - `gpx/` – GPX tracks used for course geometry (fallback to synthetic segments).
- **State**: `src/state/gameStore.ts` (Zustand)
  - Persists core game state (minus heavy race snapshots).
  - Actions: start/end game, start/finish races, advance week (training/finance), transfers, formations.
- **UI**: `src/app/` + `src/components/`
  - Routes for dashboard, new game, race, training, staff, sponsors, transfers, standings, etc.
  - Race viewer: `components/race/` (Three/Fiber scene + HUD).

## Data Flow
1. **State** lives in Zustand. UI subscribes to slices.
2. **Starting a game** loads (or falls back to) initial state from `sampleData.ts` and sets `hasStarted=true`.
3. **Race start** (`startRace`) calls `simulateRace` → `RaceSnapshot[]` stored in `activeRace`.
4. **Race viewer** consumes `activeRace.snapshots` and `raceCourses` to render.
5. **Race finish** (`finishRace`) updates finance, standings, pastResults, and resets `activeRace`.

## Rendering Stack (Race)
- React Three Fiber scene (`RaceCanvas`) for track, terrain, trees, props, snow particles.
- Camera: chase camera following focus athlete.
- `trackBuilder.ts` loads GPX or builds a spline from course segments; provides arc-length mapping and slope samples.
- HUD (`RaceHud`) overlays focus controls, gaps, peloton summary, and (sidebar) elevation profile.

## Persistence
- Zustand `persist` with key `ski-manager-save`.
- Migration guard resets to `baseInitialState` if core data is missing/corrupt; `activeRace` is not persisted.

## Testing
- Unit: Vitest + Testing Library (`vitest.config.ts`, `src/test/setup.ts`).
- E2E: Playwright (`playwright.config.ts`, `tests/e2e`).

