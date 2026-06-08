import assert from "node:assert/strict";
import {
  ACHIEVEMENTS,
  CAMPAIGN_WAVES,
  COMBO_WINDOW_SECONDS,
  HAZARD_CLOSE_CALL_BUFFER,
  HAZARD_CLOSE_CALL_ESCAPE_BUFFER,
  HAZARD_PLAYER_RADIUS,
  MAX_UPGRADE_LEVEL,
  RELAY_CHECKPOINT_COUNT,
  SECTOR_LAYOUTS,
  WAVE_MODIFIERS,
  createContractState,
  createInitialState,
  getActiveRepairTarget,
  getAchievementSummaries,
  getCoachDirective,
  getContractFor,
  getContractFocus,
  getContractSnapshot,
  getCurrentWaveStats,
  getHazardThreats,
  HIT_RECOVERY_SECONDS,
  getObjectiveHint,
  getResourceAlerts,
  getRoutePlan,
  getRunPerformance,
  getRunRating,
  getSectorFor,
  getStormActiveRadius,
  getUnlockedAchievementsForRun,
  getUpgradeChoices,
  getUpgradeSummaries,
  getUpgradeSummary,
  getWaveModifierFor,
  parseRouteSeed,
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
const TEST_ROUTE_SEED = 1001;
const ROUTE_SAFETY_SEEDS = [1, 7, 42, 313, 1001, 2048, 4660, 8192, 12345, 32768, 49152, 65535];

let state = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
assert.equal(state.status, "playing");
assert.equal(state.briefingActive, true, "new waves should begin in a safe briefing state");
assert.equal(state.difficulty, "standard");
assert.equal(state.campaignWaves, CAMPAIGN_WAVES);
assert.equal(state.player.charge, state.player.maxCharge, "fresh runs should start with full visible charge");
assert.equal(state.player.hull, state.player.maxHull, "fresh runs should start with full visible hull");
assert.equal(state.relays.length, 4);
assert.equal(state.gate.open, false);
assert.equal(state.waveModifier, "steadySignal");
assert.equal(getUpgradeSummaries(state.upgrades).length, 5, "all upgrade tracks should be summarized");
assert.equal(getUpgradeSummary(state.upgrades, "engine").maxLevel, MAX_UPGRADE_LEVEL);
assert.ok(getUpgradeSummary(state.upgrades, "engine").nextEffect?.includes("推进"), "upgrade summaries should explain next effects");
assert.ok(
  getUpgradeSummary(state.upgrades, "repair").nextEffect?.includes("+23%"),
  "repair upgrade summaries should show the real relative repair speed gain"
);
assert.equal(getWaveModifierFor(2, "standard"), "lumenSurge", "standard wave 2 should introduce lumen surge");
assert.equal(getWaveModifierFor(1, "hardcore"), "steadySignal", "hardcore first wave should teach precision before stacking modifiers");
assert.equal(getWaveModifierFor(2, "hardcore"), "shardCurrent", "hardcore wave 2 should add shard pressure before storm pressure");
assert.equal(getSectorFor(1, "standard"), "outerRing", "standard wave 1 should start in the teaching sector");
assert.equal(getSectorFor(2, "standard"), "crossCurrent", "standard wave 2 should change the map layout");
assert.equal(getSectorFor(1, "hardcore"), "outerRing", "hardcore first wave should keep a readable opening route");
assert.equal(getSectorFor(2, "hardcore"), "crossCurrent", "hardcore wave 2 should remain readable before the storm spine");
assert.equal(state.sector, "outerRing", "new standard runs should expose their sector");
assert.equal(state.storms.length, 0, "standard wave 1 should teach supply and repair before adding storms");
assert.equal(SECTOR_LAYOUTS[state.sector].name, "北环补给", "sector layouts should be named for the HUD");
assert.equal(getContractFor(1, "standard"), "lumenRoute", "standard wave 1 should teach the lumen route contract");
assert.equal(getContractFor(1, "hardcore"), "cleanWave", "hardcore should start with a precision contract");
assert.equal(getContractFor(2, "hardcore"), "relayRush", "hardcore wave 2 should test repair tempo before storm discipline");
assert.equal(state.contract.id, "lumenRoute", "new standard runs should include the first tactical contract");
assert.equal(getContractSnapshot(state).status, "active", "contract snapshots should expose the active status");
assert.equal(getContractSnapshot(state).scaledRewardScore, 360, "contract snapshots should expose the actual visible payout");
assert.equal(getContractFocus(state).kind, "lumen", "lumen route contracts should mark lumen as the battlefield focus");
assert.ok(getContractFocus(state).targets.length > 0, "active contracts should expose battlefield focus targets");
assert.equal(getObjectiveHint(state).title, "先读图再出发", "fresh runs should first tell players they can read the map");
assert.equal(getCoachDirective(state).id, "readContract", "fresh runs should first expose the briefing and contract");
assert.ok(WAVE_MODIFIERS.lumenSurge.lumenChargeBonus > 0, "lumen surge should define a resource effect");
assert.ok(state.routeSeed > 0, "fresh runs should create a visible route seed");
assert.equal(parseRouteSeed(getRoutePlan(state.routeSeed).code), state.routeSeed, "route codes should parse back to the same seed");
assert.equal(parseRouteSeed(getRoutePlan(state.routeSeed).name), state.routeSeed, "full route names should parse back to the same seed");
assert.equal(getRunPerformance(state).id, "B", "fresh active runs should start with a modest live rating");
assert.ok(getRunPerformance(state).points < 62, "fresh active runs should not start at a high live rating");
assert.ok(getRunPerformance(state).detail.includes("读图"), "live rating should explain the opening briefing state");

const protectedStart = updateSimulation(state, idle, 12);
assert.equal(protectedStart.briefingActive, true, "idle briefing should stay active until the first input");
assert.equal(protectedStart.elapsed, state.elapsed, "idle briefing should not start the run timer");
assert.equal(protectedStart.player.charge, state.player.charge, "idle briefing should not drain charge");
assert.equal(protectedStart.player.hull, state.player.hull, "idle briefing should prevent opening hazard damage");
assert.equal(protectedStart.stats.hitsTaken, 0, "idle briefing should not count hazard hits");
assert.ok(protectedStart.message.includes("读图缓冲"), "idle briefing should tell players why nothing is draining");
state = updateSimulation(state, { ...idle, move: { x: 1, y: 0 } }, 0.016);
assert.equal(state.briefingActive, false, "the first movement should end the opening briefing");
assert.ok(state.elapsed > 0, "the run timer should start after player input");
assert.ok(state.message.includes("正式开始"), "the first input should replace the briefing copy");
assert.equal(getObjectiveHint(state).kind, "lumen", "first-run objective strip should match the lumen tutorial");
assert.equal(getObjectiveHint(state).title, "先完成流明航线", "first-run objective strip should align with the first lumen contract");

let twoLumenTutorial = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
twoLumenTutorial.briefingActive = false;
twoLumenTutorial.stats.lumenCollected = 2;
twoLumenTutorial.lumen[0].collected = true;
twoLumenTutorial.lumen[1].collected = true;
assert.equal(
  getCoachDirective(twoLumenTutorial).title,
  "第 1 步：先完成流明航线",
  "first-wave coaching should continue the four-lumen contract after the opening two pickups"
);
assert.equal(
  getObjectiveHint(twoLumenTutorial).title,
  "先完成流明航线",
  "first-wave objective should not pivot to relays before the lumen contract is complete"
);

const seededA = restartRun(createInitialState(), undefined, { routeSeed: 4660 });
const seededB = restartRun(createInitialState(), undefined, { routeSeed: 4660 });
const seededC = restartRun(createInitialState(), undefined, { routeSeed: 4661 });
assert.equal(seededA.routeSeed, 4660, "explicit route seeds should be kept");
assert.deepEqual(
  seededA.relays.map((relay) => relay.position),
  seededB.relays.map((relay) => relay.position),
  "the same route seed should reproduce relay positions"
);
assert.notDeepEqual(
  seededA.relays.map((relay) => relay.position),
  seededC.relays.map((relay) => relay.position),
  "different route seeds should lightly change relay positions"
);
const carriedSeed = structuredClone(seededA);
carriedSeed.status = "won";
const seededNextWave = restartRun(carriedSeed);
assert.equal(seededNextWave.wave, 2, "seeded wins should still advance the wave");
assert.equal(seededNextWave.routeSeed, seededA.routeSeed, "route seeds should carry across a campaign");
assert.equal(seededNextWave.storms.length, 0, "wave 2 should add route pressure before storm pressure");
assertCampaignSpawnSafety("training", ROUTE_SAFETY_SEEDS);
assertCampaignSpawnSafety("standard", ROUTE_SAFETY_SEEDS);
assertCampaignSpawnSafety("hardcore", ROUTE_SAFETY_SEEDS);

let lumenContract = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
const openingOvercharge = movePlayerTo(lumenContract, lumenContract.lumen[0].position.x, lumenContract.lumen[0].position.y);
const overcharged = updateSimulation(openingOvercharge, idle, 0.016);
assert.ok(overcharged.player.charge > overcharged.player.maxCharge, "opening lumen should grant a small overcharge buffer");
const lumenContractScore = lumenContract.score;
for (const drop of lumenContract.lumen.slice(0, 4)) {
  lumenContract = movePlayerTo(lumenContract, drop.position.x, drop.position.y);
  lumenContract = updateSimulation(lumenContract, idle, 0.016);
}
assert.equal(lumenContract.contract.status, "completed", "collecting four lumen should complete the route contract");
assert.equal(getContractFocus(lumenContract).active, false, "completed contracts should stop drawing battlefield focus markers");
assert.equal(lumenContract.stats.contractsCompleted, 1, "completed contracts should be counted");
assert.equal(getCoachDirective(lumenContract).id, "reachRelay", "after first lumen route, the coach should send players to relays");
assert.ok(
  getCoachDirective(lumenContract).title.includes("合约完成"),
  "completed contracts should clearly transition the coach back to the main objective"
);
assert.equal(
  getObjectiveHint(lumenContract).title,
  "合约已完成，去修信标",
  "completed contracts should clearly transition the objective strip back to relay repair"
);
assert.ok(lumenContract.score > lumenContractScore, "completed contracts should award score");
assert.ok(getRunPerformance(lumenContract).points > getRunPerformance(state).points, "completed contracts should improve live rating pressure");
const afterContractReward = lumenContract.score;
lumenContract = updateSimulation(lumenContract, idle, 0.5);
assert.equal(lumenContract.stats.contractsCompleted, 1, "completed contract rewards should not be claimed twice");
assert.ok(lumenContract.score >= afterContractReward, "later updates should keep the claimed contract score");

let rushContract = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
rushContract.briefingActive = false;
rushContract.contract = createContractState("relayRush", rushContract.elapsed, rushContract.stats);
assert.equal(getContractFocus(rushContract).kind, "relay", "relay rush should focus an unrepaired relay");
assert.ok(getContractFocus(rushContract).targets.length > 0, "relay rush should expose a relay target");
rushContract.player.maxCharge = 220;
rushContract.player.charge = 220;
rushContract = updateSimulation(rushContract, idle, 38.1);
assert.equal(rushContract.contract.status, "failed", "relay rush should fail after the time limit without a repair");
assert.equal(rushContract.contract.failureReason, "timeExpired", "relay rush should record timeout as its failure reason");
const failedContractGuidance = structuredClone(rushContract);
failedContractGuidance.player.charge = 90;
assert.ok(
  getCoachDirective(failedContractGuidance).title.includes("主目标优先"),
  "failed contracts should tell players to keep playing the main objective"
);
assert.equal(
  getObjectiveHint(failedContractGuidance).title,
  "合约失败，清主目标",
  "failed contracts should not leave players thinking the run is over"
);

let cleanContract = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
cleanContract.briefingActive = false;
cleanContract.contract = createContractState("cleanWave", cleanContract.elapsed, cleanContract.stats);
assert.equal(getContractFocus(cleanContract).kind, "avoidHazard", "clean wave should focus hazard avoidance");
cleanContract.hazards[0].position = { ...cleanContract.player.position };
cleanContract = updateSimulation(cleanContract, idle, 0.016);
assert.equal(cleanContract.contract.status, "failed", "no-hit contracts should fail on hazard impact");
assert.equal(cleanContract.contract.failureReason, "hazardHit", "no-hit contracts should record hazard hits as the failure reason");

let cleanClear = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
cleanClear.contract = createContractState("cleanWave", cleanClear.elapsed, cleanClear.stats);
cleanClear.relays.forEach((relay) => {
  relay.repaired = true;
  relay.progress = 1;
});
cleanClear = movePlayerTo(cleanClear, cleanClear.gate.position.x, cleanClear.gate.position.y);
cleanClear = updateSimulation(cleanClear, idle, 0.016);
assert.equal(cleanClear.status, "won", "prepared clean contract state should clear the wave");
assert.equal(cleanClear.contract.status, "completed", "clean wave contracts should complete on a no-hit clear");

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
assert.equal(state.comboTimer, COMBO_WINDOW_SECONDS, "scoring actions should open the combo window");
const comboWindowState = updateSimulation(state, idle, COMBO_WINDOW_SECONDS + 0.1);
assert.equal(comboWindowState.combo, 1, "combo should reset when the combo window expires");
assert.equal(comboWindowState.comboTimer, 0, "combo timer should expire cleanly");

let lowCharge = movePlayerTo(state, 500, 350);
lowCharge.player.charge = 24;
assert.equal(getObjectiveHint(lowCharge).kind, "lumen", "low charge should prioritize nearby lumen");
assert.equal(getCoachDirective(lowCharge).id, "recoverCharge", "low charge should switch the coach to recovery");
assert.equal(getResourceAlerts(lowCharge).charge, "low", "low charge should be surfaced as a HUD alert");
lowCharge.player.charge = 12;
assert.equal(getResourceAlerts(lowCharge).charge, "critical", "critical charge should be distinguished from low charge");

const steadyPickup = movePlayerTo(restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED }), nearbyLumen.position.x, nearbyLumen.position.y);
steadyPickup.player.charge = 40;
const surgePickup = structuredClone(steadyPickup);
surgePickup.waveModifier = "lumenSurge";
const steadyAfterPickup = updateSimulation(steadyPickup, idle, 0.016);
const surgeAfterPickup = updateSimulation(surgePickup, idle, 0.016);
assert.ok(surgeAfterPickup.player.charge > steadyAfterPickup.player.charge, "lumen surge should restore more charge");

let repairState = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
repairState = movePlayerTo(repairState, repairState.relays[0].position.x, repairState.relays[0].position.y);
assert.equal(getObjectiveHint(repairState).kind, "repair", "standing near a relay should prompt repair");
assert.equal(getCoachDirective(repairState).id, "repairRelay", "standing near a relay should explain the repair verb");
assert.equal(getActiveRepairTarget(repairState)?.id, repairState.relays[0].id, "standing near a relay should expose a repair target for rendering");
const lowChargeAtRelay = structuredClone(repairState);
lowChargeAtRelay.player.charge = Math.floor(lowChargeAtRelay.player.maxCharge * 0.2);
assert.equal(
  getObjectiveHint(lowChargeAtRelay).kind,
  "lumen",
  "low charge at a relay should prioritize nearby lumen over repair"
);
assert.ok(
  getObjectiveHint(lowChargeAtRelay).detail.includes("不要硬修"),
  "low charge at a relay should warn players not to force a repair"
);
assert.equal(
  getCoachDirective(lowChargeAtRelay).id,
  "recoverCharge",
  "low charge at a relay should keep coach and objective aligned"
);
let checkpointState = structuredClone(repairState);
for (let i = 0; i < 74; i += 1) {
  checkpointState = updateSimulation(checkpointState, { ...idle, repair: true }, 0.016);
}
assert.equal(checkpointState.relays[0].checkpoint, 1, "partial relay repair should lock the first checkpoint");
assert.ok(checkpointState.score > repairState.score, "relay checkpoints should award a small score bump");
const checkpointFloor = checkpointState.relays[0].checkpoint / RELAY_CHECKPOINT_COUNT;
checkpointState.hazards = [];
checkpointState.storms = [];
checkpointState.player.maxCharge = 200;
checkpointState.player.charge = 200;
checkpointState = updateSimulation(checkpointState, idle, 24);
assert.ok(
  checkpointState.relays[0].progress >= checkpointFloor,
  "relay progress should not decay below the latest locked checkpoint"
);
assert.ok(
  checkpointState.message.includes("维修中断"),
  "leaving a partially repaired relay should explain that only unlocked progress decays"
);
for (let i = 0; i < 260; i += 1) {
  repairState = updateSimulation(repairState, { ...idle, repair: true }, 0.016);
}
assert.equal(repairState.relays[0].repaired, true, "repairing near a relay should complete it");
assert.equal(repairState.relays[0].checkpoint, RELAY_CHECKPOINT_COUNT, "completed relays should lock all checkpoints");
assert.equal(repairState.stats.relaysRepaired, 1, "completed relay repairs should be counted");
assert.ok(repairState.stats.repairSeconds > 0, "time spent repairing should be counted");
assert.ok(repairState.score > 0, "repairing a relay should award score");
assert.ok(repairState.combo > 1, "scoring actions should raise combo");
let relayRecharge = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
relayRecharge = movePlayerTo(relayRecharge, relayRecharge.relays[0].position.x, relayRecharge.relays[0].position.y);
relayRecharge.hazards = [];
relayRecharge.storms = [];
relayRecharge.player.charge = 20;
relayRecharge.relays[0].progress = 0.999;
relayRecharge = updateSimulation(relayRecharge, { ...idle, repair: true }, 0.016);
assert.equal(relayRecharge.relays[0].repaired, true, "finishing a relay should complete from near-final progress");
assert.ok(relayRecharge.player.charge > 28, "completed relays should release a small charge refill");
assert.ok(relayRecharge.message.includes("回充"), "relay repair recharge should be explained in Chinese");
state = repairState;

const stormSample = createHardcoreStormState();
stormSample.briefingActive = false;
const stormState = movePlayerTo(stormSample, stormSample.storms[0].position.x, stormSample.storms[0].position.y);
stormState.contract = createContractState("stormSkipper", stormState.elapsed, stormState.stats);
assert.equal(getContractFocus(stormState).kind, "avoidStorm", "storm skipper should focus storm avoidance");
const stormCharge = stormState.player.charge;
const stormed = updateSimulation(stormState, idle, 0.5);
assert.ok(stormed.player.charge < stormCharge, "standing in a storm should siphon charge");
assert.ok(stormed.stats.stormSeconds >= 0.5, "storm exposure should be counted once per tick");
assert.equal(getObjectiveHint(stormed).kind, "danger", "storm exposure should become the urgent hint");
assert.equal(getCoachDirective(stormed).id, "escapeStorm", "storm exposure should override normal coaching");
const stormContractFailed = updateSimulation(stormed, idle, 0.7);
assert.equal(stormContractFailed.contract.failureReason, "stormExposure", "storm skipper should record storm exposure as the failure reason");
const openGateStorm = structuredClone(stormState);
openGateStorm.relays.forEach((relay) => {
  relay.repaired = true;
  relay.progress = 1;
});
const openGateStormed = updateSimulation(openGateStorm, idle, 0.016);
assert.equal(openGateStormed.gate.open, true, "prepared storm state should still open the gate");
assert.ok(
  openGateStormed.message.includes("风暴"),
  "open gate copy should not overwrite urgent storm guidance while the player is in danger"
);

let hitState = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
hitState.briefingActive = false;
hitState.hazards[0].position = { ...hitState.player.position };
hitState = updateSimulation(hitState, idle, 0.016);
assert.equal(hitState.stats.hitsTaken, 1, "hazard impacts should be counted");
assert.equal(hitState.player.invulnerable, HIT_RECOVERY_SECONDS, "hazard impacts should open a recovery window");
assert.equal(getResourceAlerts(hitState).hull, "stable", "one standard hit should not overstate hull danger");
assert.ok(getRunPerformance(hitState).points < getRunPerformance(restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED })).points, "hits should lower live rating pressure");
const recoveryProtected = updateSimulation(hitState, idle, 0.016);
assert.equal(recoveryProtected.stats.hitsTaken, 1, "recovery window should prevent immediate repeated hazard hits");
assert.ok(recoveryProtected.player.invulnerable < HIT_RECOVERY_SECONDS, "recovery window should tick down after impact");
let closeCallState = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
closeCallState.briefingActive = false;
closeCallState.hazards[0].velocity = { x: 0, y: 0 };
const closeCallCollisionRadius = closeCallState.hazards[0].radius + HAZARD_PLAYER_RADIUS;
closeCallState.hazards[0].position = {
  x: closeCallState.player.position.x + closeCallCollisionRadius + HAZARD_CLOSE_CALL_BUFFER - 8,
  y: closeCallState.player.position.y
};
closeCallState = updateSimulation(closeCallState, idle, 0.016);
assert.equal(closeCallState.stats.closeCalls, 0, "entering a close-call band should arm without awarding immediately");
const closeCallScore = closeCallState.score;
closeCallState.hazards[0].position = {
  x: closeCallState.player.position.x + closeCallCollisionRadius + HAZARD_CLOSE_CALL_ESCAPE_BUFFER + 6,
  y: closeCallState.player.position.y
};
closeCallState = updateSimulation(closeCallState, idle, 0.016);
assert.equal(closeCallState.stats.closeCalls, 1, "escaping a close shard line should count as a close call");
assert.ok(closeCallState.score > closeCallScore, "close calls should award score");
assert.ok(closeCallState.combo > 1, "close calls should extend the combo loop");
const hazardThreatState = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
hazardThreatState.briefingActive = false;
hazardThreatState.contract = createContractState("pulseDiscipline", hazardThreatState.elapsed, hazardThreatState.stats);
hazardThreatState.hazards[0].position = { x: hazardThreatState.player.position.x + 42, y: hazardThreatState.player.position.y };
assert.equal(getContractFocus(hazardThreatState).kind, "conservePulse", "pulse discipline should focus controlled hazard handling");
assert.equal(getHazardThreats(hazardThreatState)[0].level, "danger", "close hazards should be flagged for danger rendering");
assert.equal(getCoachDirective(hazardThreatState).id, "pulseDanger", "dangerous hazards should override normal coaching");
assert.equal(getObjectiveHint(hazardThreatState).kind, "danger", "objective strip should also prioritize dangerous close hazards");
hazardThreatState.hazards[0].position = { x: hazardThreatState.player.position.x + 118, y: hazardThreatState.player.position.y };
assert.equal(getHazardThreats(hazardThreatState)[0].level, "near", "near hazards should be flagged before collision");
const projectedThreatState = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
projectedThreatState.briefingActive = false;
projectedThreatState.hazards[0].position = {
  x: projectedThreatState.player.position.x + 260,
  y: projectedThreatState.player.position.y
};
projectedThreatState.hazards[0].velocity = { x: -260, y: 0 };
const projectedThreat = getHazardThreats(projectedThreatState)[0];
assert.equal(projectedThreat.level, "danger", "incoming hazards should be flagged before current-distance collision");
assert.ok(projectedThreat.projectedDistance < projectedThreat.distance, "hazard threats should expose projected approach distance");
assert.ok(projectedThreat.timeToImpact <= 0.9, "hazard threats should expose a short time-to-impact estimate");
const reboundThreatState = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
reboundThreatState.briefingActive = false;
reboundThreatState.player.position = { x: 760, y: 350 };
reboundThreatState.player.velocity = { x: 0, y: 0 };
reboundThreatState.hazards[0].position = { x: 930, y: 350 };
reboundThreatState.hazards[0].velocity = { x: 360, y: 0 };
reboundThreatState.hazards[0].radius = 24;
const reboundThreat = getHazardThreats(reboundThreatState)[0];
assert.equal(reboundThreat.level, "danger", "wall-bounce hazards should be warned before reflected impact");
assert.ok(
  reboundThreat.projectedDistance < reboundThreat.distance,
  "wall-bounce hazard threats should use reflected projected positions"
);
let pulseFail = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
pulseFail.briefingActive = false;
pulseFail.contract = createContractState("pulseDiscipline", pulseFail.elapsed, pulseFail.stats);
pulseFail.player.charge = 120;
pulseFail = updateSimulation(pulseFail, { ...idle, pulse: true }, 0.016);
pulseFail.player.pulseCooldown = 0;
pulseFail = updateSimulation(pulseFail, { ...idle, pulse: true }, 0.016);
assert.equal(pulseFail.contract.status, "failed", "pulse discipline should fail on the second pulse");
assert.equal(pulseFail.contract.failureReason, "pulseOveruse", "pulse discipline should record pulse overuse as the failure reason");

const steadyHazards = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
steadyHazards.briefingActive = false;
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

const steadyStormBase = createHardcoreStormState();
const steadyStorm = movePlayerTo(steadyStormBase, steadyStormBase.storms[0].position.x, steadyStormBase.storms[0].position.y);
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
const gateRechargeState = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
gateRechargeState.briefingActive = false;
gateRechargeState.player.charge = 5;
gateRechargeState.relays.forEach((relay) => {
  relay.repaired = true;
  relay.progress = 1;
});
const gateRecharged = updateSimulation(gateRechargeState, idle, 0.016);
assert.ok(gateRecharged.player.charge > 5, "opening the gate should grant a small evacuation charge buffer");
assert.ok(gateRecharged.message.includes("回充"), "gate recharge should be explained in the runtime message");
assert.equal(getObjectiveHint(state).kind, "gate", "an open gate should become the next objective");
assert.equal(getCoachDirective(state).id, "exitGate", "the coach should switch to evacuation after all relays are repaired");

const depletedAtGate = movePlayerTo(structuredClone(state), state.gate.position.x, state.gate.position.y);
depletedAtGate.player.charge = 0.01;
const depletedAtGateResult = updateSimulation(depletedAtGate, idle, 0.5);
assert.equal(depletedAtGateResult.status, "lost", "depleted charge should not be overwritten by gate victory");
assert.equal(depletedAtGateResult.endReason, "chargeDepleted", "gate-adjacent charge death should keep its failure reason");

const brokenAtGate = movePlayerTo(structuredClone(state), state.gate.position.x, state.gate.position.y);
brokenAtGate.player.hull = 0.01;
brokenAtGate.hazards[0].position = { ...brokenAtGate.player.position };
const brokenAtGateResult = updateSimulation(brokenAtGate, idle, 0.016);
assert.equal(brokenAtGateResult.status, "lost", "destroyed hull should not be overwritten by gate victory");
assert.equal(brokenAtGateResult.endReason, "hullDestroyed", "gate-adjacent hull death should keep its failure reason");

state = movePlayerTo(state, state.gate.position.x, state.gate.position.y);
state = updateSimulation(state, idle, 0.016);
assert.equal(state.status, "won", "entering the open gate should win the wave");
assert.equal(state.endReason, "waveCleared", "winning a non-final wave should record the end reason");
assert.equal(state.stats.wavesCleared, 1, "cleared waves should be counted");
assert.ok(getUpgradeChoices(state).length > 0, "winning should offer upgrade choices");
assert.ok(
  getUpgradeChoices(state).some((choice) => choice.id === "repair" || choice.id === "capacitor"),
  "post-wave upgrade choices should include next-wave pressure or shortfall fixes"
);
const pollutedWin = structuredClone(state);
pollutedWin.stats.hitsTaken = 3;
pollutedWin.stats.stormSeconds = 5;
const cleanNextWave = restartRun(pollutedWin, "engine");
assert.equal(cleanNextWave.stats.hitsTaken, 3, "campaign stats should still carry across waves");
assert.equal(getCurrentWaveStats(cleanNextWave).hitsTaken, 0, "current-wave stats should reset after advancing");
assert.equal(getCurrentWaveStats(cleanNextWave).stormSeconds, 0, "current-wave storm exposure should reset after advancing");
const waveAchievements = achievementIdsFor(state);
assert.ok(waveAchievements.includes("firstRepair"), "repairing a relay should unlock the first repair achievement");
assert.ok(waveAchievements.includes("cleanWave"), "clean wave clears should unlock the no-hit achievement");
assert.equal(getAchievementSummaries(["cleanWave"]).filter((summary) => summary.unlocked).length, 1);
assert.equal(getAchievementSummaries(["cleanWave"]).length, Object.keys(ACHIEVEMENTS).length);

const upgraded = restartRun(state, "engine");
assert.equal(upgraded.wave, 2, "winning and restarting should advance the wave");
assert.equal(upgraded.waveModifier, "lumenSurge", "advancing waves should install the next wave modifier");
assert.equal(upgraded.sector, "crossCurrent", "advancing waves should install the next sector layout");
assert.notDeepEqual(
  upgraded.relays.map((relay) => relay.position),
  state.relays.map((relay) => relay.position),
  "sector changes should move relay layouts between waves"
);
assert.equal(upgraded.upgrades.engine, 1, "chosen upgrade should be installed");
assert.equal(getUpgradeSummary(upgraded.upgrades, "engine").level, 1, "installed upgrades should update summaries");
assert.equal(upgraded.stats.wavesCleared, 1, "campaign stats should carry into the next wave");
const secondWaveRouteCoach = structuredClone(upgraded);
secondWaveRouteCoach.briefingActive = false;
secondWaveRouteCoach.elapsed = secondWaveRouteCoach.contract.startElapsed + 8;
assert.ok(
  getCoachDirective(secondWaveRouteCoach).progress.includes("0/4"),
  "route coach progress should count current-wave relays, not cumulative campaign repairs"
);

const trainingStart = restartRun(createInitialState(), undefined, { difficulty: "training", routeSeed: TEST_ROUTE_SEED });
const hardcoreStart = restartRun(createInitialState(), undefined, { difficulty: "hardcore", routeSeed: TEST_ROUTE_SEED });
trainingStart.briefingActive = false;
hardcoreStart.briefingActive = false;
const training = updateSimulation(trainingStart, idle, 1);
const hardcore = updateSimulation(hardcoreStart, idle, 1);
assert.ok(training.player.charge > hardcore.player.charge, "training should drain less charge than hardcore");

const paused = pauseRun(upgraded);
assert.equal(paused.status, "paused", "pause should freeze an active run");
assert.equal(resumeRun(paused).status, "playing", "resume should return to active play");

let finalWave = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
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
const finalAchievements = achievementIdsFor(finalWave);
assert.ok(finalAchievements.includes("perfectSignal"), "S ratings should unlock the S-grade achievement");
assert.ok(finalAchievements.includes("fullStabilizer"), "campaign completion should unlock the full clear achievement");
const hardcoreFinal = structuredClone(finalWave);
hardcoreFinal.difficulty = "hardcore";
assert.ok(achievementIdsFor(hardcoreFinal).includes("hardcoreClear"), "hardcore clears should unlock the hardcore achievement");
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

let drained = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
drained.briefingActive = false;
drained.player.charge = 0.01;
drained = updateSimulation(drained, idle, 0.5);
assert.equal(drained.status, "lost", "empty charge should lose the run");
assert.equal(drained.endReason, "chargeDepleted", "charge loss should record the end reason");
assert.equal(drained.lossContext.source, "baseDrain", "base drain should record the concrete loss source");
assert.equal(drained.contract.status, "failed", "fatal losses should close active contracts before recap");
assert.equal(drained.contract.failureReason, "runLost", "fatal losses should explain contract failure as run loss");
assert.equal(getRunRating(drained).id, "C", "early lost runs should receive a low rating with advice");

let boostDrained = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
boostDrained.briefingActive = false;
boostDrained.player.charge = 7;
boostDrained = updateSimulation(boostDrained, { ...idle, move: { x: 1, y: 0 }, boost: true }, 0.016);
assert.equal(boostDrained.lossContext.source, "boostDrain", "boost should record a concrete low-charge loss source");

let repairDrained = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
repairDrained = movePlayerTo(repairDrained, repairDrained.relays[0].position.x, repairDrained.relays[0].position.y);
repairDrained.player.charge = 0.04;
repairDrained = updateSimulation(repairDrained, { ...idle, repair: true }, 0.05);
assert.equal(repairDrained.lossContext.source, "repairDrain", "repair should record a concrete low-charge loss source");

let repairRechargeEscape = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
repairRechargeEscape = movePlayerTo(
  repairRechargeEscape,
  repairRechargeEscape.relays[0].position.x,
  repairRechargeEscape.relays[0].position.y
);
repairRechargeEscape.player.charge = 0.01;
repairRechargeEscape.relays[0].progress = 0.99;
repairRechargeEscape = updateSimulation(repairRechargeEscape, { ...idle, repair: true }, 0.2);
assert.equal(repairRechargeEscape.status, "lost", "fatal repair drain should not be rescued by same-frame relay recharge");
assert.equal(repairRechargeEscape.endReason, "chargeDepleted", "fatal repair drain should keep the charge-depleted end reason");
assert.equal(repairRechargeEscape.lossContext.source, "repairDrain", "fatal repair drain should keep its concrete loss source");

let pulseDrained = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
pulseDrained.briefingActive = false;
pulseDrained.player.charge = 9;
pulseDrained = updateSimulation(pulseDrained, { ...idle, pulse: true }, 0.016);
assert.equal(pulseDrained.lossContext.source, "pulseDrain", "pulse should record a concrete low-charge loss source");

let stormDrained = createHardcoreStormState();
stormDrained.briefingActive = false;
stormDrained = movePlayerTo(stormDrained, stormDrained.storms[0].position.x, stormDrained.storms[0].position.y);
stormDrained.hazards.forEach((hazard, index) => {
  hazard.position = { x: 120 + index * 120, y: 620 };
});
stormDrained.player.charge = 2;
stormDrained = updateSimulation(stormDrained, idle, 0.5);
assert.equal(stormDrained.lossContext.source, "stormDrain", "storm drain should record a concrete low-charge loss source");

let hazardDestroyed = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
hazardDestroyed.briefingActive = false;
hazardDestroyed.player.hull = 5;
hazardDestroyed.player.charge = 80;
hazardDestroyed.hazards[0].position = { ...hazardDestroyed.player.position };
hazardDestroyed = updateSimulation(hazardDestroyed, idle, 0.016);
assert.equal(hazardDestroyed.lossContext.source, "hazardImpact", "hazard impact should record a concrete hull loss source");
assert.equal(hazardDestroyed.lossContext.resource, "hull", "hazard impact should identify hull as the lethal resource");

let doubleResourceDestroyed = restartRun(createInitialState(), undefined, { routeSeed: TEST_ROUTE_SEED });
doubleResourceDestroyed.briefingActive = false;
doubleResourceDestroyed.player.hull = 5;
doubleResourceDestroyed.player.charge = 4;
doubleResourceDestroyed.hazards[0].position = { ...doubleResourceDestroyed.player.position };
doubleResourceDestroyed = updateSimulation(doubleResourceDestroyed, idle, 0.016);
assert.equal(doubleResourceDestroyed.endReason, "hullDestroyed", "simultaneous hazard losses should keep hull destruction as the end reason");
assert.equal(
  doubleResourceDestroyed.lossContext.resource,
  "hull",
  "simultaneous hazard hull and charge losses should keep the hull loss context for recap consistency"
);
assert.equal(
  doubleResourceDestroyed.lossContext.source,
  "hazardImpact",
  "simultaneous hazard losses should keep the concrete hazard source"
);

console.log("Simulation smoke checks passed.");

function movePlayerTo(state: GameState, x: number, y: number): GameState {
  const next = structuredClone(state);
  next.briefingActive = false;
  next.player.position = { x, y };
  next.player.velocity = { x: 0, y: 0 };
  next.player.invulnerable = 0;
  next.player.charge = Math.max(next.player.charge, 55);
  return next;
}

function createHardcoreStormState(): GameState {
  const clearedFirstWave = restartRun(createInitialState(), undefined, {
    difficulty: "hardcore",
    routeSeed: TEST_ROUTE_SEED
  });
  clearedFirstWave.status = "won";
  const clearedSecondWave = restartRun(clearedFirstWave);
  clearedSecondWave.status = "won";
  return restartRun(clearedSecondWave);
}

function assertCampaignSpawnSafety(difficulty: GameState["difficulty"], seeds: number[]): void {
  for (const seed of seeds) {
    let waveState = restartRun(createInitialState(), undefined, { difficulty, routeSeed: seed });
    for (let wave = 1; wave <= CAMPAIGN_WAVES; wave += 1) {
      assertSpawnSafety(waveState, `${difficulty} seed ${seed} wave ${wave}`);
      const firstStep = updateSimulation(structuredClone(waveState), { ...idle, move: { x: 1, y: 0 } }, 0.016);
      assert.equal(firstStep.stats.hitsTaken, waveState.stats.hitsTaken, `${difficulty} seed ${seed} wave ${wave} should not take a hit on first input`);
      assert.equal(
        getCurrentWaveStats(firstStep).stormSeconds,
        0,
        `${difficulty} seed ${seed} wave ${wave} should not start inside an active storm`
      );
      if (wave === CAMPAIGN_WAVES) break;
      waveState.status = "won";
      waveState = restartRun(waveState);
    }
  }
}

function assertSpawnSafety(state: GameState, label: string): void {
  for (const hazard of state.hazards) {
    assert.ok(
      distanceBetween(state.player.position, hazard.position) >= hazard.radius + HAZARD_PLAYER_RADIUS + 40,
      `${label} hazard ${hazard.id} should start outside the immediate collision lane`
    );
  }
  for (const storm of state.storms) {
    assert.ok(
      distanceBetween(state.player.position, storm.position) >= getStormActiveRadius(storm) + 30,
      `${label} storm ${storm.id} should start outside the active storm radius`
    );
    for (const relay of state.relays) {
      assert.ok(
        distanceBetween(relay.position, storm.position) >= getStormActiveRadius(storm) + 18,
        `${label} storm ${storm.id} should not cover relay ${relay.id}`
      );
    }
  }
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function achievementIdsFor(state: GameState) {
  return getUnlockedAchievementsForRun({
    bestCombo: state.bestCombo,
    difficulty: state.difficulty,
    rating: getRunRating(state),
    score: state.score,
    stats: state.stats,
    status: state.status as "won" | "completed" | "lost",
    wave: state.wave
  });
}
