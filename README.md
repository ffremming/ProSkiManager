# Ski Classics Manager (web skeleton)

This repository sets up the core domain and simulation logic for a Ski Classics–style management game (think Pro Cycling Manager but for long-distance skiing) with a web front end and a 3D race viewer powered by three.js / `@react-three/fiber`.

## What’s here
- **Domain models**: `src/game/domain/types.ts` for athletes, teams, finance, training, races, snapshots.
- **Simulation engines**:
  - Training progression: `src/game/simulation/trainingEngine.ts`
  - Finance: `src/game/simulation/financeEngine.ts`
  - Race snapshot generator: `src/game/simulation/raceEngine.ts`
- **Sample data and initial state**: `src/game/data/sampleData.ts`
  - Builds a player team from a budget using a CSV-derived athlete pool.
- **Game store skeleton (Zustand)**: `src/state/gameStore.ts`
- **3D race view skeleton**: `src/components/race/RaceCanvas.tsx`
- **Race page stub**: `src/app/race/[raceId]/page.tsx`
- **Race map/calendar**: `src/app/calendar/page.tsx` with `RaceMap` component
- **Testing setup**:
  - Unit: Vitest + Testing Library (`vitest.config.ts`, `src/test/setup.ts`)
  - E2E: Playwright (`playwright.config.ts`, `tests/e2e/navigation.spec.ts`)
- **Sprint 1/2 UI hubs**: Training (`/training`), Staff (`/staff`), Sponsors (`/sponsors`), Transfers (`/transfers`), Scouting (`/scouting`)
- **Sprint 3**: Race prep (`/race-setup`) with lineup/pacing and equipment picks
- **Standings**: `/standings` for team/athlete points; race results + prize money handled on finish
 - Game flow: Navigation and dashboard show game pages only after starting a game; team pages display points per athlete.

## Next steps to make it runnable
This repo now contains the full Next.js scaffold. To run:
1. Install dependencies (Node 18+):
   ```
   npm install
   ```
2. Start dev server:
   ```
   npm run dev
   ```
3. Open http://localhost:3000 and click a race card to see the placeholder 3D race view.

If you prefer pnpm or yarn, swap the commands accordingly.

## Tests
- All (lint + unit + E2E): `npm test` (alias for `npm run test:all`)
- Lint: `npm run lint`
- Unit: `npm run test:unit`
- Unit watch: `npm run test:unit:watch`
- E2E: `npm run test:e2e` (Playwright will auto-start the dev server)

## Suggested feature work
1. Wire navigation/pages:
   - Add `/team`, `/training`, `/calendar`, `/finance` pages and components.
   - Build a basic sidebar/topbar layout.
2. Expand the race HUD:
   - Leaderboard + time gaps.
   - Play/pause, speed controls, camera targets.
   - Mini-map/elevation profile (SVG).
3. Season loop:
   - Add “Advance week” UI calling `advanceWeek`.
   - Let the user set weekly training plans.
   - Add contract renewal/transfer actions (update finance + roster).
4. Data polish:
   - Athlete pool now generated from `fantasy-skiclassics` CSV into `src/game/data/athletePool.ts`; adjust stat formulas as you refine realism.
   - More teams/athletes and additional race courses.
   - Adjust race engine parameters for better feel (drafting, pacing styles, bonk chance).

## Architecture principles
- Keep **core rules pure TypeScript** under `src/game/domain` and `src/game/simulation`.
- The **UI** (Next.js + React + Tailwind) just calls these functions and renders state.
- The **race viewer** consumes `RaceSnapshot[]` so the engine and renderer stay decoupled.
- Zustand store is a thin wrapper to orchestrate weekly progression and races; swap it if you prefer another state manager.

## Quick usage (conceptual)
- Call `advanceWeek()` to apply training + finance and move time forward.
- Start a race with `startRace(raceId)`, which generates snapshots from `simulateRace`.
- Render snapshots with `<RaceCanvas snapshots={activeRace.snapshots} course={...} />` and overlay your HUD.
