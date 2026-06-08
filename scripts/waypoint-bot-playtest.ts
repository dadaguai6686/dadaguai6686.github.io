import assert from "node:assert/strict";
import {
  CAMPAIGN_WAVES,
  createInitialState,
  getActiveRepairTarget,
  getCoachDirective,
  getContractFocus,
  getCurrentWaveStats,
  getHazardThreats,
  getObjectiveHint,
  getStormActiveRadius,
  getUpgradeChoices,
  restartRun,
  updateSimulation,
  type ContractId,
  type DifficultyId,
  type GameState,
  type InputState,
  type RunEndReason,
  type UpgradeId,
  type Vec2
} from "../src/game/simulation.ts";

type BotGoalKind =
  | "evadeHazard"
  | "escapeStorm"
  | "recoverCharge"
  | "collectContractLumen"
  | "repairRelay"
  | "reachRelay"
  | "exitGate"
  | "collectBonusLumen";

type BotGoal = {
  kind: BotGoalKind;
  target: Vec2;
  reason: string;
  relayId?: number;
};

type BotPolicy = {
  dt: number;
  hazardLookahead: number;
  maxWaveSeconds: number;
  stormBuffer: number;
};

type BotMemory = {
  lastDistance: number;
  lastGoal: BotGoal;
  pulseUsesThisWave: number;
  repairInterruptions: number;
  stuckSeconds: number;
};

type WaveResult = {
  seed: number;
  difficulty: DifficultyId;
  wave: number;
  status: GameState["status"];
  endReason: RunEndReason;
  lossSource: GameState["lossContext"]["source"];
  elapsed: number;
  minCharge: number;
  minHull: number;
  hitsTaken: number;
  stormSeconds: number;
  boostUses: number;
  pulseUses: number;
  repairSeconds: number;
  lumenCollected: number;
  relaysRepaired: number;
  contractId: ContractId;
  contractStatus: GameState["contract"]["status"];
  contractFailureReason: GameState["contract"]["failureReason"];
  upgradeChosen?: UpgradeId;
  lastGoal: BotGoalKind;
  stuckSeconds: number;
  repairInterruptions: number;
};

type CampaignResult = {
  seed: number;
  difficulty: DifficultyId;
  finalStatus: GameState["status"];
  finalWave: number;
  wavesCleared: number;
  results: WaveResult[];
};

const quickSeeds = {
  training: [1, 1001, 4660, 8192, 65535],
  standard: [1, 42, 1001, 4660, 8192, 12345, 32768, 65535],
  hardcore: [1, 1001, 4660]
} satisfies Record<DifficultyId, number[]>;

const defaultPolicy: BotPolicy = {
  dt: 1 / 30,
  hazardLookahead: 0.8,
  maxWaveSeconds: 150,
  stormBuffer: 22
};

const suite = runWaypointSuite();
printSuite(suite);
assertSuite(suite);

function runWaypointSuite(): CampaignResult[] {
  return (Object.keys(quickSeeds) as DifficultyId[]).flatMap((difficulty) =>
    quickSeeds[difficulty].map((seed) => runCampaign(seed, difficulty, defaultPolicy))
  );
}

function runCampaign(seed: number, difficulty: DifficultyId, policy: BotPolicy): CampaignResult {
  let state = restartRun(createInitialState(), undefined, { difficulty, routeSeed: seed });
  const results: WaveResult[] = [];

  while (state.status === "playing" && results.length < CAMPAIGN_WAVES) {
    const waveRun = runWave(state, policy);
    state = waveRun.state;
    results.push(waveRun.result);
    if (state.status !== "won") break;
    const upgradeChosen = chooseUpgrade(state);
    results[results.length - 1].upgradeChosen = upgradeChosen;
    state = restartRun(state, upgradeChosen);
  }

  return {
    seed,
    difficulty,
    finalStatus: state.status,
    finalWave: state.wave,
    wavesCleared: results.filter((result) => result.status === "won" || result.status === "completed").length,
    results
  };
}

function runWave(initialState: GameState, policy: BotPolicy): { state: GameState; result: WaveResult } {
  let state = structuredClone(initialState);
  let elapsed = 0;
  let minCharge = state.player.charge;
  let minHull = state.player.hull;
  const memory = createBotMemory(state);

  while (state.status === "playing" && elapsed < policy.maxWaveSeconds) {
    const goal = withFallbackTarget(chooseGoal(state, memory, policy), state);
    const input = computeInput(state, goal, memory, policy);
    const wasRepairing = Boolean(getActiveRepairTarget(state) && input.repair);
    state = updateSimulation(state, input, policy.dt);
    elapsed += policy.dt;
    minCharge = Math.min(minCharge, state.player.charge);
    minHull = Math.min(minHull, state.player.hull);
    updateMemory(memory, state, goal, wasRepairing, policy.dt);
  }

  if (state.status === "playing") {
    state = { ...state, status: "lost", endReason: "chargeDepleted" };
  }

  const waveStats = getCurrentWaveStats(state);
  return {
    state,
    result: {
      seed: state.routeSeed,
      difficulty: state.difficulty,
      wave: state.wave,
      status: state.status,
      endReason: state.endReason,
      lossSource: state.lossContext.source,
      elapsed,
      minCharge,
      minHull,
      hitsTaken: waveStats.hitsTaken,
      stormSeconds: waveStats.stormSeconds,
      boostUses: waveStats.boostUses,
      pulseUses: waveStats.pulseUses,
      repairSeconds: waveStats.repairSeconds,
      lumenCollected: waveStats.lumenCollected,
      relaysRepaired: waveStats.relaysRepaired,
      contractId: state.contract.id,
      contractStatus: state.contract.status,
      contractFailureReason: state.contract.failureReason,
      lastGoal: memory.lastGoal.kind,
      stuckSeconds: memory.stuckSeconds,
      repairInterruptions: memory.repairInterruptions
    }
  };
}

function withFallbackTarget(goal: BotGoal, state: GameState): BotGoal {
  if (Number.isFinite(goal.target?.x) && Number.isFinite(goal.target?.y)) {
    return goal;
  }
  const fallback =
    getObjectiveHint(state).target ??
    getCoachDirective(state).target ??
    state.relays.find((relay) => !relay.repaired)?.position ??
    state.lumen.find((drop) => !drop.collected)?.position ??
    state.gate.position ??
    state.player.position;
  return {
    ...goal,
    target: fallback,
    reason: `${goal.reason} / fallback`
  };
}

function createBotMemory(state: GameState): BotMemory {
  const startGoal: BotGoal = {
    kind: "collectContractLumen",
    target: state.lumen.find((drop) => !drop.collected)?.position ?? state.relays[0]?.position ?? state.gate.position,
    reason: "opening"
  };
  return {
    lastDistance: Number.POSITIVE_INFINITY,
    lastGoal: startGoal,
    pulseUsesThisWave: 0,
    repairInterruptions: 0,
    stuckSeconds: 0
  };
}

function chooseGoal(state: GameState, memory: BotMemory, policy: BotPolicy): BotGoal {
  const player = state.player;
  const coach = getCoachDirective(state);
  const objective = getObjectiveHint(state);
  const focus = getContractFocus(state);
  const waveStats = getCurrentWaveStats(state);
  const repairTarget = getActiveRepairTarget(state);
  const activeStorm = nearestActiveStorm(state, policy.stormBuffer);
  if (activeStorm) {
    return {
      kind: "escapeStorm",
      target: clampToArena(add(player.position, scale(normalize(subtract(player.position, activeStorm.position)), 180))),
      reason: "inside storm"
    };
  }

  const danger = getHazardThreats(state)
    .filter(isImmediateHazardThreat)
    .sort((a, b) => Math.min(a.distance, a.projectedDistance) - Math.min(b.distance, b.projectedDistance))[0];
  if (danger) {
    const away = scale(normalize(subtract(player.position, danger.position)), 180);
    return {
      kind: "evadeHazard",
      target: clampToArena(add(player.position, rotate(away, Math.PI / 5))),
      reason: "hazard danger"
    };
  }

  const openingSupplyDone =
    state.contract.id !== "lumenRoute" || state.contract.status === "completed" || waveStats.lumenCollected >= 4;
  const recoveryThreshold = openingSupplyDone ? (state.difficulty === "hardcore" ? 0.34 : 0.32) : 0.3;
  const coachRecoveryThreshold = 0.3;
  const nearRepairFinish = Boolean(repairTarget && repairTarget.progress >= 0.72 && player.charge > player.maxCharge * 0.2);
  const lowCharge =
    !nearRepairFinish &&
    (player.charge < player.maxCharge * recoveryThreshold ||
      (coach.id === "recoverCharge" && player.charge < player.maxCharge * coachRecoveryThreshold));
  const safestLumen = selectSafestLumen(state, policy);
  const shouldTopUp =
    safestLumen &&
    !state.gate.open &&
    openingSupplyDone &&
    !nearRepairFinish &&
    player.charge < player.maxCharge * 0.4 &&
    waveStats.relaysRepaired < state.relays.length &&
    distance(player.position, safestLumen) < 180;
  if (lowCharge && safestLumen) {
    return {
      kind: "recoverCharge",
      target: safestLumen,
      reason: "low charge"
    };
  }

  if (shouldTopUp) {
    return {
      kind: "recoverCharge",
      target: safestLumen,
      reason: "top up between relays"
    };
  }

  if (state.gate.open) {
    return {
      kind: "exitGate",
      target: state.gate.position,
      reason: "gate open"
    };
  }

  if (state.contract.status === "active" && state.contract.id === "lumenRoute" && waveStats.lumenCollected < 4 && safestLumen) {
    return {
      kind: "collectContractLumen",
      target: safestLumen,
      reason: focus.title
    };
  }

  if (state.wave === 1 && waveStats.lumenCollected < 4 && safestLumen) {
    return {
      kind: "collectContractLumen",
      target: safestLumen,
      reason: "first-wave supply route"
    };
  }

  if (repairTarget) {
    return {
      kind: "repairRelay",
      target: repairTarget.position,
      relayId: repairTarget.id,
      reason: "inside repair radius"
    };
  }

  const relay = nearestPoint(
    state.relays.filter((target) => !target.repaired),
    player.position
  );
  if (relay) {
    return {
      kind: "reachRelay",
      target: relay.item.position,
      relayId: relay.item.id,
      reason: objective.title
    };
  }

  if (safestLumen) {
    return {
      kind: "collectBonusLumen",
      target: safestLumen,
      reason: "bonus supply"
    };
  }

  return {
    kind: "exitGate",
    target: state.gate.position,
    reason: "fallback gate"
  };
}

function computeInput(state: GameState, goal: BotGoal, memory: BotMemory, policy: BotPolicy): InputState {
  const player = state.player;
  const toTarget = subtract(goal.target, player.position);
  const targetDistance = length(toTarget);
  const desiredSpeed = Math.min(260, targetDistance * 2.8);
  const desiredVelocity = scale(normalize(toTarget), desiredSpeed);
  let steer = subtract(desiredVelocity, player.velocity);

  steer = add(steer, hazardRepulsion(state, policy));
  steer = add(steer, stormRepulsion(state, policy));

  const repairTarget = getActiveRepairTarget(state);
  const threats = getHazardThreats(state);
  const danger = threats.some(isImmediateHazardThreat);
  const near = threats.some((threat) => threat.level === "near");
  const contractStats = getCurrentWaveStats(state);
  const safeToRepair =
    repairTarget &&
    !danger &&
    !(state.contract.id === "cleanWave" && near) &&
    player.charge > Math.max(10, player.maxCharge * 0.16);
  const shouldRepair = Boolean(goal.kind === "repairRelay" && safeToRepair);
  const move =
    shouldRepair && repairTarget
      ? getRepairHoldMove(state, repairTarget.position)
      : normalize(steer);
  const shouldPulse =
    danger &&
    player.pulseCooldown <= 0 &&
    player.charge > 14 &&
    (state.contract.id !== "pulseDiscipline" || contractStats.pulseUses < 1);
  const shouldBoost =
    !shouldRepair &&
    targetDistance > 170 &&
    player.boostCooldown <= 0 &&
    player.charge > player.maxCharge * 0.34 &&
    (goal.kind === "escapeStorm" || memory.stuckSeconds > 1.4 || targetDistance > 240);

  return {
    move,
    boost: shouldBoost,
    repair: shouldRepair,
    pulse: shouldPulse
  };
}

function getRepairHoldMove(state: GameState, target: Vec2): Vec2 {
  const player = state.player;
  const toTarget = subtract(target, player.position);
  const targetDistance = length(toTarget);
  const speed = length(player.velocity);
  if (targetDistance > 28) {
    const desiredVelocity = scale(normalize(toTarget), Math.min(160, targetDistance * 4));
    return normalize(subtract(desiredVelocity, player.velocity));
  }
  if (speed > 12) {
    return normalize(scale(player.velocity, -1));
  }
  return { x: 0, y: 0 };
}

function chooseUpgrade(state: GameState): UpgradeId | undefined {
  const choices = getUpgradeChoices(state).map((choice) => choice.id);
  const waveStats = getCurrentWaveStats(state);
  const preferred: UpgradeId[] = [];
  if (state.difficulty === "hardcore" && state.wave === 3 && state.upgrades.engine < 1 && waveStats.lumenCollected <= 2) {
    preferred.push("engine");
  }
  if (state.upgrades.capacitor < 2) preferred.push("capacitor");
  if (state.upgrades.repair < 2) preferred.push("repair");
  if (state.upgrades.engine < 1) preferred.push("engine");
  if (state.contract.status === "failed") {
    if (state.contract.id === "relayRush") preferred.push("repair");
    if (state.contract.id === "lumenRoute") preferred.push("capacitor");
    if (state.contract.id === "stormSkipper") preferred.push("engine");
    if (state.contract.id === "cleanWave") preferred.push(waveStats.pulseUses === 0 ? "pulse" : "shield");
  }
  if (waveStats.stormSeconds > 1.6) preferred.push("engine");
  if (waveStats.hitsTaken > 0) preferred.push(waveStats.pulseUses === 0 ? "pulse" : "shield");
  if (state.player.charge < state.player.maxCharge * 0.34) preferred.push("capacitor");
  if (waveStats.repairSeconds > state.wave * 11) preferred.push("repair");
  preferred.push("capacitor", "repair", "engine", "pulse", "shield");
  return preferred.find((id) => choices.includes(id));
}

function updateMemory(memory: BotMemory, state: GameState, goal: BotGoal, wasRepairing: boolean, dt: number): void {
  const currentDistance = distance(state.player.position, goal.target);
  if (goal.kind === memory.lastGoal.kind && currentDistance > memory.lastDistance - 24) {
    memory.stuckSeconds += dt;
  } else {
    memory.stuckSeconds = Math.max(0, memory.stuckSeconds - dt * 2);
  }
  if (wasRepairing && goal.kind === "repairRelay" && getHazardThreats(state).some((threat) => threat.level !== "safe")) {
    memory.repairInterruptions += 1;
  }
  memory.lastDistance = currentDistance;
  memory.lastGoal = goal;
  memory.pulseUsesThisWave = getCurrentWaveStats(state).pulseUses;
}

function isImmediateHazardThreat(threat: ReturnType<typeof getHazardThreats>[number]): boolean {
  return threat.distance <= threat.collisionRadius + 22 || threat.timeToImpact <= 0.35;
}

function selectSafestLumen(state: GameState, policy: BotPolicy): Vec2 | undefined {
  const player = state.player.position;
  const candidates = state.lumen.filter((drop) => !drop.collected);
  let best: { position: Vec2; cost: number } | undefined;
  candidates.forEach((drop) => {
    const travel = distance(player, drop.position);
    const stormPenalty = state.storms.reduce((total, storm) => {
      const clearance = distance(drop.position, storm.position) - (getStormActiveRadius(storm) + policy.stormBuffer);
      return total + (clearance < 0 ? 420 : clearance < 70 ? 120 : 0);
    }, 0);
    const hazardPenalty = state.hazards.reduce((total, hazard) => {
      const projected = add(hazard.position, scale(hazard.velocity, policy.hazardLookahead));
      const clearance = distance(drop.position, projected) - (hazard.radius + 70);
      return total + (clearance < 0 ? 360 : clearance < 70 ? 90 : 0);
    }, 0);
    const cost = travel + stormPenalty + hazardPenalty;
    if (!best || cost < best.cost) {
      best = { position: drop.position, cost };
    }
  });
  return best?.position;
}

function nearestActiveStorm(state: GameState, buffer: number): { position: Vec2; radius: number } | undefined {
  return state.storms
    .map((storm) => ({ position: storm.position, radius: getStormActiveRadius(storm) + buffer }))
    .filter((storm) => distance(state.player.position, storm.position) < storm.radius)
    .sort((a, b) => distance(state.player.position, a.position) - distance(state.player.position, b.position))[0];
}

function hazardRepulsion(state: GameState, policy: BotPolicy): Vec2 {
  return state.hazards.reduce<Vec2>((force, hazard) => {
    const projected = add(hazard.position, scale(hazard.velocity, policy.hazardLookahead));
    const away = subtract(state.player.position, projected);
    const clearance = length(away) - hazard.radius;
    if (clearance > 150) return force;
    return add(force, scale(normalize(away), (150 - clearance) * 7));
  }, { x: 0, y: 0 });
}

function stormRepulsion(state: GameState, policy: BotPolicy): Vec2 {
  return state.storms.reduce<Vec2>((force, storm) => {
    const away = subtract(state.player.position, storm.position);
    const clearance = length(away) - (getStormActiveRadius(storm) + policy.stormBuffer);
    if (clearance > 60) return force;
    return add(force, scale(normalize(away), (60 - clearance) * 5));
  }, { x: 0, y: 0 });
}

function assertSuite(results: CampaignResult[]): void {
  const firstWaveResults = results.map((campaign) => campaign.results[0]).filter(Boolean);
  const training = firstWaveResults.filter((result) => result.difficulty === "training");
  const standard = firstWaveResults.filter((result) => result.difficulty === "standard");
  const hardcore = firstWaveResults.filter((result) => result.difficulty === "hardcore");
  const clearCount = (items: WaveResult[]) => items.filter((result) => result.status === "won" || result.status === "completed").length;

  assert.ok(clearCount(training) === training.length, "training waypoint bot should clear every first-wave seed");
  assert.ok(clearCount(standard) >= 4, "standard waypoint bot should clear most first-wave seeds");
  assert.ok(
    results.filter((result) => result.difficulty === "training").every((result) => result.wavesCleared >= 3),
    "training waypoint bot should reach at least wave 3 on every seed"
  );
  assert.ok(
    results.filter((result) => result.difficulty === "standard" && result.wavesCleared >= 3).length >= 4,
    "standard waypoint bot should reach at least wave 3 on most seeds"
  );
  assert.ok(
    results.filter((result) => result.difficulty === "training").every((result) => result.wavesCleared >= CAMPAIGN_WAVES),
    "training waypoint bot should clear every sampled full campaign"
  );
  assert.ok(
    results.filter((result) => result.difficulty === "standard").every((result) => result.wavesCleared >= CAMPAIGN_WAVES),
    "standard waypoint bot should clear every sampled full campaign"
  );
  assert.ok(
    clearCount(hardcore) === hardcore.length,
    "hardcore waypoint bot should clear every first-wave seed"
  );
  assert.ok(
    results.filter((result) => result.difficulty === "hardcore").every((result) => result.wavesCleared >= 3),
    "hardcore waypoint bot should reach wave 3 on every seed"
  );
  assert.ok(
    results.filter((result) => result.difficulty === "hardcore").every((result) => result.wavesCleared >= CAMPAIGN_WAVES),
    "hardcore waypoint bot should clear every sampled full campaign"
  );
  assert.ok(
    hardcore.every((result) => result.elapsed >= 25),
    "hardcore first-wave losses should still leave enough time for a real route decision"
  );
  assert.ok(
    standard.every((result) => result.elapsed < defaultPolicy.maxWaveSeconds),
    "standard first-wave bot should not time out"
  );
}

function printSuite(results: CampaignResult[]): void {
  const rows = results.map((campaign) => {
    const first = campaign.results[0];
    const last = campaign.results[campaign.results.length - 1];
    return {
      difficulty: campaign.difficulty,
      seed: campaign.seed,
      cleared: campaign.wavesCleared,
      final: campaign.finalStatus,
      finalWave: campaign.finalWave,
      first: first?.status ?? "-",
      firstTime: first ? first.elapsed.toFixed(1) : "-",
      firstCharge: first ? first.minCharge.toFixed(1) : "-",
      firstHits: first?.hitsTaken ?? 0,
      firstLumen: first?.lumenCollected ?? 0,
      firstRelays: first?.relaysRepaired ?? 0,
      firstContract: first ? `${first.contractId}/${first.contractStatus}` : "-",
      lastLoss: last?.lossSource ?? "-",
      lastContract: last ? `${last.contractId}/${last.contractStatus}` : "-",
      lastGoal: last?.lastGoal ?? "-",
      upgrades: campaign.results.map((result) => result.upgradeChosen ?? "-").join("/"),
      waves: campaign.results.map(formatWaveSummary).join(" "),
      stuck: last ? last.stuckSeconds.toFixed(1) : "-"
    };
  });
  console.table(rows);
  const summary = (Object.keys(quickSeeds) as DifficultyId[]).map((difficulty) => {
    const items = results.filter((result) => result.difficulty === difficulty);
    const firstWaves = items.map((result) => result.results[0]).filter(Boolean);
    const firstRate = percentage(
      firstWaves.filter((result) => result.status === "won" || result.status === "completed").length,
      firstWaves.length
    );
    const wave3Rate = percentage(items.filter((result) => result.wavesCleared >= 3).length, items.length);
    const campaignRate = percentage(items.filter((result) => result.wavesCleared >= CAMPAIGN_WAVES).length, items.length);
    return `${difficulty}: ${firstRate}% first / ${wave3Rate}% wave3 / ${campaignRate}% campaign`;
  });
  console.log(`Waypoint bot playtest passed. ${summary.join(" / ")}`);
}

function formatWaveSummary(result: WaveResult): string {
  const status = result.status === "completed" ? "C" : result.status === "won" ? "W" : "L";
  return `${result.wave}${status}:${result.relaysRepaired}R/${result.lumenCollected}L/${result.hitsTaken}H/${result.lossSource}`;
}

function percentage(numerator: number, denominator: number): string {
  return `${((numerator / Math.max(1, denominator)) * 100).toFixed(0)}`;
}

function nearestPoint<T extends { position: Vec2 }>(items: T[], origin: Vec2): { item: T; distance: number } | undefined {
  return items.reduce<{ item: T; distance: number } | undefined>((best, item) => {
    const itemDistance = distance(item.position, origin);
    if (!best || itemDistance < best.distance) {
      return { item, distance: itemDistance };
    }
    return best;
  }, undefined);
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function length(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector: Vec2, fallbackLength = 1): Vec2 {
  const vectorLength = length(vector);
  if (vectorLength <= 0.0001) return { x: fallbackLength, y: 0 };
  return { x: vector.x / vectorLength, y: vector.y / vectorLength };
}

function scale(vector: Vec2, amount: number): Vec2 {
  return { x: vector.x * amount, y: vector.y * amount };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function rotate(vector: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

function clampToArena(point: Vec2): Vec2 {
  return {
    x: Math.max(44, Math.min(956, point.x)),
    y: Math.max(44, Math.min(656, point.y))
  };
}
