# Gameplay & Systems

## Core Loop
1. **Start game** (New Game) → sets initial state and `hasStarted=true`.
2. **Weekly progression**: `advanceWeek()` applies training + finance and increments week.
3. **Race prep**: set lineup, pacing/tactic, equipment; ensures readiness before start.
4. **Race**: `startRace(raceId)` generates snapshots; viewer renders them; `finishRace()` applies results, prize money, standings.
5. **Transfers/Scouting**: refresh market, list/buy players, track prospects.

## Training
- Defined in `trainingEngine.ts`.
- Inputs: current fatigue, form, planned sessions.
- Outputs: updated athlete form/fatigue/morale, potential health changes.
- Trigger: `advanceWeek()`.

## Finance
- Defined in `financeEngine.ts`.
- Inputs: sponsors, expenses, prize money.
- Outputs: updated balance/history, weekly net.
- Trigger: `advanceWeek()` and `finishRace()` prize money.

## Race Prep
- `racePrep` holds lineup, pacing, tactic, equipment, optional orders.
- Auto-fill: race page auto-creates prep with default lineup/tactic if missing.
- Roles can be linked to lineup via formations; pacing/tactic influence race engine.

## Race Simulation
- `raceEngine.ts` converts course + athletes + prep into `RaceSnapshot[]`.
- Key factors:
  - Athlete stats: endurance, climbing/flat/sprint, technique, form/fatigue/morale.
  - Terrain: segment gradient/difficulty.
  - Gear/conditions: glide/grip mods, snow type, wind.
  - Pacing/tactics: aggressive/defensive modifiers.
  - Drafting/lanes: 3 classic tracks, leader penalty, follower bonus, anti-overlap gaps.
- Output: snapshots with distance, energy, laneOffset, effort, groupId, and time `t`.

## Transfers & Market
- Actions: refresh market, list player with asking price, buy target, accept/decline AI offers.
- AI offers: generated based on ads and athlete value/interest.
- Finance impacts: balance updates and history entries on purchase/sale.

## Scouting
- Placeholder scaffolding for assignments and prospects; data lives in `sampleData.ts` and store.

## Persistence & Save
- Local storage under `ski-manager-save`.
- Migration guard resets to `baseInitialState` if core data is missing.
- `activeRace` snapshots are excluded from persistence to keep size small.

