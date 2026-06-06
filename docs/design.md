# Lumen Drift Design Plan

## Fantasy

Pilot a tiny repair drone inside a collapsing light network. The player is not a warrior; they are a fast, fragile engineer who survives by routing, timing, and controlled greed.

## Core Loop

1. Read the sector layout and identify unrepaired relays.
2. Drift through lumen lanes while avoiding roaming void shards.
3. Hold `E` near a relay to repair it, spending charge and exposing the drone.
4. Decide whether optional lumen pickups are worth the route risk.
5. Keep the score chain alive by collecting, repairing, and escaping quickly.
6. Open the north gate by repairing every relay.
7. Choose a wave-complete upgrade, then begin a harder wave.

## Player Verbs

- Move with inertia
- Boost through danger
- Repair while stationary enough to commit
- Pulse nearby hazards away
- Collect lumen for charge and future advantage
- Chain score events for multiplier pressure
- Choose upgrades between completed waves
- Escape through the gate

## Failure And Success

- Loss: hull reaches zero or charge drains to zero.
- Win: every relay is repaired and the drone reaches the open gate.
- Run pressure: repairing consumes charge, so the player has to collect lumen without overextending.
- Quality pressure: partial relay repairs decay, storms siphon charge, and hits reset the score chain.

## Progression

Wave-complete upgrades are capped at three levels each:

- Vector Engine: stronger thrust and faster boost recovery.
- Relay Weaver: faster repairs and larger relay score bonuses.
- Deep Capacitor: more max charge and better lumen charge recovery.
- Prism Pulse: wider, stronger hazard pushback.
- Aegis Hull: more max hull and less collision damage.

## Scoring

- Lumen pickups increase score and extend the chain.
- Completed relays award larger score bursts.
- Escaping through the gate awards a wave-end bonus.
- Taking a hit resets the chain and subtracts a small score penalty.

## Implementation Track

- Phaser 3 for the canvas playfield.
- TypeScript and Vite for the browser build.
- DOM overlay for HUD, menu, and run-end states.
- Simulation state lives in `src/game/simulation.ts`; Phaser scene adapts state into visuals.
- Touch input is represented as a virtual input state and merged with keyboard input in `src/game/input.ts`.

## Visual Direction

The game uses premium neon sci-fi: cyan repair light, amber lumen crystals, magenta void hazards, and a dark layered space-grid background. Assets are generated procedurally in Phaser so the first playable version has no external asset pipeline risk.

Canva key art concept:

- Editable design: https://www.canva.com/d/qHccXjuo_7U4z-2
- View link: https://www.canva.com/d/25oTs6X9QueIqoP

## Prototype Acceptance

- Start screen appears and can launch a run.
- Player can move, boost, pulse, collect lumen, repair relays, avoid storms, win, upgrade, and retry.
- HUD reflects hull, charge, lumen, relays, wave, score, combo, and ability readiness.
- Desktop and mobile viewports remain readable.
- Simulation smoke tests cover boost, repair, score, combo, storm drain, win, upgrade, and loss.
- Build succeeds with `npm run build`.
