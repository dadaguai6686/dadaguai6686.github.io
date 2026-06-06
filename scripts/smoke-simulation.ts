import assert from "node:assert/strict";
import {
  CAMPAIGN_WAVES,
  MAX_UPGRADE_LEVEL,
  WAVE_MODIFIERS,
  createInitialState,
  getObjectiveHint,
  getRunRating,
  getUpgradeChoices,
  getUpgradeSummaries,
  getUpgradeSummary,
  getWaveModifierFor,
  pauseRun,
  resumeRun,
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
assert.equal(state.difficulty, "standard");
assert.equal(state.campaignWaves, CAMPAIGN_WAVES);
assert.equal(state.relays.length, 4);
assert.equal(state.gate.open, false);
assert.equal(state.waveModifier, "steadySignal");
assert.equal(getUpgradeSummaries(state.upgrades).length, 5, "all upgrade tracks should be summarized");
assert.equal(getUpgradeSummary(state.upgrades, "engine").maxLevel, MAX_UPGRADE_LEVEL);
assert.ok(getUpgradeSummary(state.upgrades, "engine").nextEffect?.includes("推进"), "upgrade summaries should explain next effects");
assert.equal(getWaveModifierFor(2, "standard"), "lumenSurge", "standard wave 2 should introduce lumen surge");
assert.equal(getWaveModifierFor(1, "hardcore"), "shardCurrent", "hardcore should start with a combat modifier");
assert.equal(getObjectiveHint(state).kind, "relay", "fresh runs should guide players toward a relay");
assert.ok(WAVE_MODIFIERS.lumenSurge.lumenChargeBonus > 0, "lumen surge should define a resource effect");

state = updateSimulation(
  state,
  { ...idle, move: { x: 1, y: 0 }, boost: true },
  0.016
);
assert.ok(state.player.boostCooldown > 0, "boost should enter cooldown");
assert.ok(state.player.charge < 100, "boost should spend charge");
assert.equal(state.stats.boostUses, 1, "successful boosts should be counted");

state = updateSimulation(state, { ...idle, pulse: true }, 0.016);
assert.equal(state.stats.pulseUses, 1, "successful pulses should be counted");

const nearbyLumen = state.lumen.find((drop) => !drop.collected)!;
state = movePlayerTo(state, nearbyLumen.position.x, nearbyLumen.position.y);
state = updateSimulation(state, idle, 0.016);
assert.equal(state.stats.lumenCollected, 1, "collected lumen should be counted");

let lowCharge = movePlayerTo(state, 500, 350);
lowCharge.player.charge = 24;
assert.equal(getObjectiveHint(lowCharge).kind, "lumen", "low charge should prioritize nearby lumen");

const steadyPickup = movePlayerTo(restartRun(createInitialState()), nearbyLumen.position.x, nearbyLumen.position.y);
steadyPickup.player.charge = 40;
const surgePickup = structuredClone(steadyPickup);
surgePickup.waveModifier = "lumenSurge";
const steadyAfterPickup = updateSimulation(steadyPickup, idle, 0.016);
const surgeAfterPickup = updateSimulation(surgePickup, idle, 0.016);
assert.ok(surgeAfterPickup.player.charge > steadyAfterPickup.player.charge, "lumen surge should restore more charge");

state = movePlayerTo(state, state.relays[0].position.x, state.relays[0].position.y);
assert.equal(getObjectiveHint(state).kind, "repair", "standing near a relay should prompt repair");
for (let i = 0; i < 260; i += 1) {
  state = updateSimulation(state, { ...idle, repair: true }, 0.016);
}
assert.equal(state.relays[0].repaired, true, "repairing near a relay should complete it");
assert.equal(state.stats.relaysRepaired, 1, "completed relay repairs should be counted");
assert.ok(state.stats.repairSeconds > 0, "time spent repairing should be counted");
assert.ok(state.score > 0, "repairing a relay should award score");
assert.ok(state.combo > 1, "scoring actions should raise combo");

const stormState = movePlayerTo(state, state.storms[0].position.x, state.storms[0].position.y);
const stormCharge = stormState.player.charge;
const stormed = updateSimulation(stormState, idle, 0.5);
assert.ok(stormed.player.charge < stormCharge, "standing in a storm should siphon charge");
assert.ok(stormed.stats.stormSeconds >= 0.5, "storm exposure should be counted once per tick");
assert.equal(getObjectiveHint(stormed).kind, "danger", "storm exposure should become the urgent hint");

let hitState = restartRun(createInitialState());
hitState.hazards[0].position = { ...hitState.player.position };
hitState = updateSimulation(hitState, idle, 0.016);
assert.equal(hitState.stats.hitsTaken, 1, "hazard impacts should be counted");

const steadyHazards = restartRun(createInitialState());
const fastHazards = structuredClone(steadyHazards);
fastHazards.waveModifier = "shardCurrent";
const steadyHazardX = steadyHazards.hazards[0].position.x;
const fastHazardX = fastHazards.hazards[0].position.x;
const steadyHazardsMoved = updateSimulation(steadyHazards, idle, 0.25);
const fastHazardsMoved = updateSimulation(fastHazards, idle, 0.25);
assert.ok(
  Math.abs(fastHazardsMoved.hazards[0].position.x - fastHazardX) >
    Math.abs(steadyHazardsMoved.hazards[0].position.x - steadyHazardX),
  "shard current should move hazards faster"
);

const steadyStorm = movePlayerTo(restartRun(createInitialState()), state.storms[0].position.x, state.storms[0].position.y);
steadyStorm.player.charge = 80;
const frontStorm = structuredClone(steadyStorm);
frontStorm.waveModifier = "stormFront";
const steadyStormed = updateSimulation(steadyStorm, idle, 0.5);
const frontStormed = updateSimulation(frontStorm, idle, 0.5);
assert.ok(frontStormed.player.charge < steadyStormed.player.charge, "storm front should drain more charge");

state = state.relays.reduce((current, relay) => {
  const nearby = movePlayerTo(current, relay.position.x, relay.position.y);
  let repaired = nearby;
  for (let i = 0; i < 260; i += 1) {
    repaired = updateSimulation(repaired, { ...idle, repair: true }, 0.016);
  }
  return repaired;
}, state);
assert.equal(state.gate.open, true, "all repaired relays should open the gate");
assert.equal(getObjectiveHint(state).kind, "gate", "an open gate should become the next objective");

state = movePlayerTo(state, state.gate.position.x, state.gate.position.y);
state = updateSimulation(state, idle, 0.016);
assert.equal(state.status, "won", "entering the open gate should win the wave");
assert.equal(state.endReason, "waveCleared", "winning a non-final wave should record the end reason");
assert.equal(state.stats.wavesCleared, 1, "cleared waves should be counted");
assert.ok(getUpgradeChoices(state).length > 0, "winning should offer upgrade choices");

const upgraded = restartRun(state, "engine");
assert.equal(upgraded.wave, 2, "winning and restarting should advance the wave");
assert.equal(upgraded.waveModifier, "lumenSurge", "advancing waves should install the next wave modifier");
assert.equal(upgraded.upgrades.engine, 1, "chosen upgrade should be installed");
assert.equal(getUpgradeSummary(upgraded.upgrades, "engine").level, 1, "installed upgrades should update summaries");
assert.equal(upgraded.stats.wavesCleared, 1, "campaign stats should carry into the next wave");

const training = updateSimulation(restartRun(createInitialState(), undefined, { difficulty: "training" }), idle, 1);
const hardcore = updateSimulation(restartRun(createInitialState(), undefined, { difficulty: "hardcore" }), idle, 1);
assert.ok(training.player.charge > hardcore.player.charge, "training should drain less charge than hardcore");

const paused = pauseRun(upgraded);
assert.equal(paused.status, "paused", "pause should freeze an active run");
assert.equal(resumeRun(paused).status, "playing", "resume should return to active play");

let finalWave = restartRun(createInitialState());
finalWave.wave = CAMPAIGN_WAVES;
finalWave.relays.forEach((relay) => {
  relay.repaired = true;
  relay.progress = 1;
});
finalWave = movePlayerTo(finalWave, finalWave.gate.position.x, finalWave.gate.position.y);
finalWave = updateSimulation(finalWave, idle, 0.016);
assert.equal(finalWave.status, "completed", "clearing the final wave should complete the campaign");
assert.equal(finalWave.endReason, "campaignCompleted", "final wave completion should record the end reason");
assert.equal(getRunRating(finalWave).id, "S", "clean final clears should earn a top run rating");
const cappedRatingState = structuredClone(finalWave);
cappedRatingState.bestCombo = 12;
cappedRatingState.stats.lumenCollected = 99;
cappedRatingState.player.charge = 999;
assert.ok(getRunRating(cappedRatingState).points <= 100, "run rating points should be capped");
finalWave.upgrades.engine = 2;
const newCampaign = restartRun(finalWave);
assert.equal(newCampaign.wave, 1, "restarting after completion should begin a new campaign");
assert.equal(newCampaign.waveModifier, "steadySignal", "a new campaign should reset the wave modifier");
assert.equal(newCampaign.upgrades.engine, 0, "a new campaign should not keep old upgrades");
assert.equal(newCampaign.stats.wavesCleared, 0, "a new campaign should reset campaign stats");

let drained = restartRun(createInitialState());
drained.player.charge = 0.01;
drained = updateSimulation(drained, idle, 0.5);
assert.equal(drained.status, "lost", "empty charge should lose the run");
assert.equal(drained.endReason, "chargeDepleted", "charge loss should record the end reason");
assert.equal(getRunRating(drained).id, "C", "early lost runs should receive a low rating with advice");

console.log("Simulation smoke checks passed.");

function movePlayerTo(state: GameState, x: number, y: number): GameState {
  const next = structuredClone(state);
  next.player.position = { x, y };
  next.player.velocity = { x: 0, y: 0 };
  next.player.invulnerable = 0;
  next.player.charge = Math.max(next.player.charge, 55);
  return next;
}
