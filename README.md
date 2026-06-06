# Lumen Drift

A polished browser arcade roguelite prototype built with Phaser, TypeScript, and Vite.

Pilot a fragile repair drone through a collapsing light network. Restore every relay, collect risky lumen crystals, push away void shards, and escape through the gate before charge or hull runs out.

## Play

```bash
npm install
npm run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173`.

## Controls

- `WASD` or arrow keys: drift
- `Space`: boost
- `E`: repair nearby relay
- `Q`: pulse nearby hazards away

On small screens, touch controls appear automatically with a virtual stick and repair, boost, and pulse buttons.

## Core Loop

```text
scan route -> chain lumen -> repair relay -> dodge void shard and storm -> choose upgrade -> harder wave
```

## Game Features

- Score and combo chain for fast, risky routing.
- Pulsing storm fields that siphon charge and force movement decisions.
- Five upgrade lines: engine, repair, capacitor, pulse, and shield.
- Relay progress slowly decays if the player abandons a partial repair.
- Wave escalation with more hazards and persistent upgrade pressure.
- DOM HUD and upgrade menu layered over a Phaser canvas playfield.

## Project Shape

- `src/game/simulation.ts`: saveable game state and gameplay rules
- `src/game/GameScene.ts`: Phaser rendering and input bridge
- `src/main.ts`: browser shell and DOM HUD bridge
- `docs/design.md`: concept, loop, and prototype acceptance notes

## Visual Direction

Neon sci-fi, high contrast, readable action silhouettes. The first build uses procedural Phaser shapes and particles for reliable local playback.

Canva concept art:

- Edit: https://www.canva.com/d/qHccXjuo_7U4z-2
- View: https://www.canva.com/d/25oTs6X9QueIqoP

## Validation

```bash
npm test
npm run build
```
