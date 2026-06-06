import assert from "node:assert/strict";
import {
  createInitialState,
  getUpgradeChoices,
  restartRun,
  updateSimulation,
  type GameState,
  type InputState
} from "../src/game/simulation.ts";

const idle: InputState = {
  move: { x: 0, y: 0 },
  boost: false,
  repair: false,
  pulse: false
};

let state = restartRun(createInitialState());
assert.equal(state.status, "playing");
assert.equal(state.relays.length, 4);
assert.equal(state.gate.open, false);

state = updateSimulation(
  state,
  { ...idle, move: { x: 1, y: 0 }, boost: true },
  0.016
);
assert.ok(state.player.boostCooldown > 0, "boost should enter cooldown");
assert.ok(state.player.charge < 100, "boost should spend charge");

state = movePlayerTo(state, state.relays[0].position.x, state.relays[0].position.y);
for (let i = 0; i < 260; i += 1) {
  state = updateSimulation(state, { ...idle, repair: true }, 0.016);
}
assert.equal(state.relays[0].repaired, true, "repairing near a relay should complete it");
assert.ok(state.score > 0, "repairing a relay should award score");
assert.ok(state.combo > 1, "scoring actions should raise combo");

const stormState = movePlayerTo(state, state.storms[0].position.x, state.storms[0].position.y);
const stormCharge = stormState.player.charge;
const stormed = updateSimulation(stormState, idle, 0.5);
assert.ok(stormed.player.charge < stormCharge, "standing in a storm should siphon charge");

state = state.relays.reduce((current, relay) => {
  const nearby = movePlayerTo(current, relay.position.x, relay.position.y);
  let repaired = nearby;
  for (let i = 0; i < 260; i += 1) {
    repaired = updateSimulation(repaired, { ...idle, repair: true }, 0.016);
  }
  return repaired;
}, state);
assert.equal(state.gate.open, true, "all repaired relays should open the gate");

state = movePlayerTo(state, state.gate.position.x, state.gate.position.y);
state = updateSimulation(state, idle, 0.016);
assert.equal(state.status, "won", "entering the open gate should win the wave");
assert.ok(getUpgradeChoices(state).length > 0, "winning should offer upgrade choices");

const upgraded = restartRun(state, "engine");
assert.equal(upgraded.wave, 2, "winning and restarting should advance the wave");
assert.equal(upgraded.upgrades.engine, 1, "chosen upgrade should be installed");

let drained = restartRun(createInitialState());
drained.player.charge = 0.01;
drained = updateSimulation(drained, idle, 0.5);
assert.equal(drained.status, "lost", "empty charge should lose the run");

console.log("Simulation smoke checks passed.");

function movePlayerTo(state: GameState, x: number, y: number): GameState {
  const next = structuredClone(state);
  next.player.position = { x, y };
  next.player.velocity = { x: 0, y: 0 };
  next.player.invulnerable = 0;
  next.player.charge = Math.max(next.player.charge, 55);
  return next;
}
