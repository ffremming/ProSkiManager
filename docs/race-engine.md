# Race Engine

`src/game/simulation/raceEngine.ts` produces `RaceSnapshot[]` for the viewer. It is deterministic given inputs.

## Inputs
- `RaceInput`: `course`, `athletes`, optional `prep` (lineup, tactic, pacing, roles, equipment choices), `conditions`, `equipment`.
- Course: `RaceCourse` with segments (distance, gradient, difficulty, sprint/climb flags).
- Athletes: stats (endurance, climbing, flat, sprint, technique), state (form/fatigue/morale), gender, role.
- Gear/conditions: glide/grip mods, snow type, wind.

## Loop
- `dt = 2s` per tick.
- For each tick:
  1. Compute groups (by distance) and assign lanes (3 tracks). Apply lane offsets.
  2. Capture snapshot `{ t, athletes: [{ id, distance, laneOffset, energy, effort, groupId }] }`.
  3. Advance each athlete via `advanceAthlete`.

## AdvanceAthlete
- Terrain factor from current segment (gradient) adjusts power.
- Base power combines stats + form/fatigue/morale; female athletes slightly reduced overall.
- Tactic/pacing modifiers (aggressive/defensive).
- Role/course bonuses (captain, sprinter at sprints, climber at climbs, domestique in groups).
- Orders (protectLeader/sprintFocus/climbFocus/aggression).
- Gear and conditions mods (glide/grip, snow type, wind).
- Drafting: leader penalty, follower bonus; lane-ahead gap enforced to avoid overlap.
- Speed: derived from power; distance advance capped by totalDistance and gap.
- Energy cost: scales with segment difficulty, gradient, pacing, drafting role; energy drained each tick.

## Groups & Lanes
- Sorted by distance; gap > 8m starts a new group.
- Lane assignment cycles 3 offsets (-0.6, 0, 0.6); lane-ahead map tracks distance of skier directly ahead per lane to enforce gaps.

## Outputs
- `RaceSnapshot[]` with cumulative time `t`, per-athlete distance/energy/laneOffset/effort/groupId.
- Viewer interpolates between snapshots for 60fps.

## Fallbacks & Safety
- Lane gap enforcement uses a minimum forward step to avoid stalls.
- If GPX loading fails, track geometry falls back to course segments (handled in `trackBuilder.ts`).
- Active race snapshots are not persisted to local storage.

## Tuning Points
- `dt` tick size (currently 2s).
- Drafting multipliers and gap thresholds.
- Speed scalar (currently `power * 7`).
- Energy drain coefficients for climbs/agg pacing.

