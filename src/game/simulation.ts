export type Vec2 = {
  x: number;
  y: number;
};

export type Relay = {
  id: number;
  position: Vec2;
  progress: number;
  repaired: boolean;
};

export type Lumen = {
  id: number;
  position: Vec2;
  collected: boolean;
};

export type Hazard = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
};

export type Storm = {
  id: number;
  position: Vec2;
  radius: number;
  phase: number;
};

export type Gate = {
  position: Vec2;
  open: boolean;
};

export type GameStatus = "menu" | "playing" | "paused" | "won" | "completed" | "lost";

export type DifficultyId = "training" | "standard" | "hardcore";

export type Difficulty = {
  id: DifficultyId;
  name: string;
  description: string;
  drainScale: number;
  damageScale: number;
  repairScale: number;
  scoreScale: number;
  hazardBonus: number;
  stormBonus: number;
};

export type UpgradeId = "engine" | "repair" | "capacitor" | "pulse" | "shield";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  description: string;
};

export type UpgradeState = Record<UpgradeId, number>;

export type RunEndReason =
  | "none"
  | "waveCleared"
  | "campaignCompleted"
  | "hullDestroyed"
  | "chargeDepleted";

export type RunStats = {
  boostUses: number;
  pulseUses: number;
  lumenCollected: number;
  relaysRepaired: number;
  hitsTaken: number;
  stormSeconds: number;
  repairSeconds: number;
  distanceTraveled: number;
  wavesCleared: number;
};

export const CAMPAIGN_WAVES = 5;

export const DIFFICULTY_SETTINGS: Record<DifficultyId, Difficulty> = {
  training: {
    id: "training",
    name: "练习",
    description: "电量消耗更慢，维修更快，适合先熟悉路线。",
    drainScale: 0.74,
    damageScale: 0.78,
    repairScale: 1.16,
    scoreScale: 0.78,
    hazardBonus: -1,
    stormBonus: -1
  },
  standard: {
    id: "standard",
    name: "标准",
    description: "推荐第一次游玩，完整体验风险、连锁和升级。",
    drainScale: 1,
    damageScale: 1,
    repairScale: 1,
    scoreScale: 1,
    hazardBonus: 0,
    stormBonus: 0
  },
  hardcore: {
    id: "hardcore",
    name: "硬核",
    description: "更高电量压力和伤害，分数倍率更高。",
    drainScale: 1.18,
    damageScale: 1.18,
    repairScale: 0.9,
    scoreScale: 1.28,
    hazardBonus: 1,
    stormBonus: 1
  }
};

export const UPGRADE_CATALOG: Record<UpgradeId, Upgrade> = {
  engine: {
    id: "engine",
    name: "矢量引擎",
    description: "提高推力，并缩短推进冷却。"
  },
  repair: {
    id: "repair",
    name: "信标织机",
    description: "更快修复信标，并提高信标得分。"
  },
  capacitor: {
    id: "capacitor",
    name: "深层电容",
    description: "提高最大电量，流明回复更多电量。"
  },
  pulse: {
    id: "pulse",
    name: "棱镜脉冲",
    description: "脉冲范围更大，推开碎片更远。"
  },
  shield: {
    id: "shield",
    name: "曜盾机体",
    description: "提高机体上限，并降低碰撞伤害。"
  }
};

export type GameState = {
  status: GameStatus;
  difficulty: DifficultyId;
  arena: { width: number; height: number };
  player: {
    position: Vec2;
    velocity: Vec2;
    hull: number;
    maxHull: number;
    charge: number;
    maxCharge: number;
    lumen: number;
    boostCooldown: number;
    pulseCooldown: number;
    invulnerable: number;
  };
  relays: Relay[];
  lumen: Lumen[];
  hazards: Hazard[];
  storms: Storm[];
  gate: Gate;
  upgrades: UpgradeState;
  wave: number;
  campaignWaves: number;
  score: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  message: string;
  elapsed: number;
  endReason: RunEndReason;
  stats: RunStats;
  shake: number;
};

export type InputState = {
  move: Vec2;
  boost: boolean;
  repair: boolean;
  pulse: boolean;
};

export type RestartOptions = {
  difficulty?: DifficultyId;
};

const relayPositions: Vec2[] = [
  { x: 170, y: 150 },
  { x: 820, y: 165 },
  { x: 270, y: 560 },
  { x: 745, y: 495 }
];

const lumenPositions: Vec2[] = [
  { x: 388, y: 122 },
  { x: 516, y: 148 },
  { x: 636, y: 236 },
  { x: 154, y: 380 },
  { x: 458, y: 392 },
  { x: 610, y: 396 },
  { x: 888, y: 390 },
  { x: 348, y: 600 },
  { x: 550, y: 620 },
  { x: 796, y: 626 }
];

export function createInitialState(): GameState {
  const maxHull = 100;
  const maxCharge = 100;
  return {
    status: "menu",
    difficulty: "standard",
    arena: { width: 1000, height: 700 },
    player: {
      position: { x: 500, y: 350 },
      velocity: { x: 0, y: 0 },
      hull: maxHull,
      maxHull,
      charge: maxCharge,
      maxCharge,
      lumen: 0,
      boostCooldown: 0,
      pulseCooldown: 0,
      invulnerable: 0
    },
    relays: relayPositions.map((position, id) => ({
      id,
      position: { ...position },
      progress: 0,
      repaired: false
    })),
    lumen: lumenPositions.map((position, id) => ({
      id,
      position: { ...position },
      collected: false
    })),
    hazards: [
      { id: 0, position: { x: 300, y: 235 }, velocity: { x: 72, y: 38 }, radius: 27 },
      { id: 1, position: { x: 760, y: 335 }, velocity: { x: -62, y: 55 }, radius: 31 },
      { id: 2, position: { x: 510, y: 565 }, velocity: { x: 82, y: -45 }, radius: 25 }
    ],
    storms: [],
    gate: { position: { x: 500, y: 55 }, open: false },
    upgrades: createUpgradeState(),
    wave: 1,
    campaignWaves: CAMPAIGN_WAVES,
    score: 0,
    combo: 1,
    comboTimer: 0,
    bestCombo: 1,
    message: "修复全部信标，收集流明，最后从北侧光门撤离。",
    elapsed: 0,
    endReason: "none",
    stats: createRunStats(),
    shake: 0
  };
}

export function restartRun(state: GameState, upgradeId?: UpgradeId, options: RestartOptions = {}): GameState {
  const next = createInitialState();
  const wonPreviousWave = state.status === "won";
  next.difficulty = options.difficulty ?? state.difficulty ?? "standard";
  next.status = "playing";
  next.wave = wonPreviousWave ? state.wave + 1 : 1;
  next.upgrades = wonPreviousWave ? { ...state.upgrades } : createUpgradeState();
  next.elapsed = wonPreviousWave ? state.elapsed : 0;
  next.endReason = "none";
  next.stats = wonPreviousWave ? { ...state.stats } : createRunStats();
  if (wonPreviousWave && upgradeId && next.upgrades[upgradeId] < 3) {
    next.upgrades[upgradeId] += 1;
  }
  next.player.maxHull = 100 + next.upgrades.shield * 14;
  next.player.maxCharge = 100 + next.upgrades.capacitor * 16;
  next.player.hull = Math.min(next.player.maxHull, 84 + state.player.lumen * 2 + next.upgrades.shield * 10);
  next.player.charge = Math.min(next.player.maxCharge, 84 + state.player.lumen * 3 + next.upgrades.capacitor * 12);
  next.player.lumen = wonPreviousWave ? Math.floor(state.player.lumen * 0.35) : 0;
  next.score = wonPreviousWave ? state.score + state.wave * 500 : 0;
  next.bestCombo = wonPreviousWave ? state.bestCombo : 1;
  const difficulty = DIFFICULTY_SETTINGS[next.difficulty];
  const extraHazards = clampInt(next.wave - 1 + difficulty.hazardBonus, 0, 4);
  next.hazards = next.hazards.concat(
    Array.from({ length: extraHazards }, (_, i) => ({
      id: 10 + i,
      position: { x: 220 + i * 245, y: 260 + ((i * 133) % 280) },
      velocity: { x: 54 + i * 18, y: i % 2 === 0 ? 72 : -66 },
      radius: 22 + i * 3
    }))
  );
  next.storms = createStorms(next.wave, next.difficulty);
  next.message = wonPreviousWave
    ? `升级已安装。第 ${next.wave}/${next.campaignWaves} 波：光网反抗更猛烈。`
    : `${DIFFICULTY_SETTINGS[next.difficulty].name}模式，第 ${next.wave}/${next.campaignWaves} 波：保持连锁，修复信标。`;
  return next;
}

export function updateSimulation(state: GameState, input: InputState, dt: number): GameState {
  if (state.status !== "playing") {
    return state;
  }

  const next = structuredClone(state);
  const player = next.player;
  const difficulty = DIFFICULTY_SETTINGS[next.difficulty];
  const previousPosition = { ...player.position };
  next.elapsed += dt;
  next.comboTimer = Math.max(0, next.comboTimer - dt);
  if (next.comboTimer <= 0) {
    next.combo = 1;
  }
  player.boostCooldown = Math.max(0, player.boostCooldown - dt);
  player.pulseCooldown = Math.max(0, player.pulseCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  next.shake = Math.max(0, next.shake - dt * 1.8);

  const moveLength = Math.hypot(input.move.x, input.move.y) || 1;
  const move = { x: input.move.x / moveLength, y: input.move.y / moveLength };
  const engineLevel = next.upgrades.engine;
  const acceleration = input.boost && player.boostCooldown <= 0 ? 930 + engineLevel * 90 : 440 + engineLevel * 42;

  player.velocity.x += move.x * acceleration * dt;
  player.velocity.y += move.y * acceleration * dt;

  if (input.boost && player.boostCooldown <= 0 && (input.move.x !== 0 || input.move.y !== 0)) {
    player.boostCooldown = Math.max(0.62, 1.15 - engineLevel * 0.12);
    player.charge = Math.max(0, player.charge - 8);
    next.stats.boostUses += 1;
    next.shake = 0.18;
  }

  const drag = Math.pow(0.05, dt);
  player.velocity.x *= drag;
  player.velocity.y *= drag;
  const speed = Math.hypot(player.velocity.x, player.velocity.y);
  const maxSpeed = 360;
  if (speed > maxSpeed) {
    player.velocity.x = (player.velocity.x / speed) * maxSpeed;
    player.velocity.y = (player.velocity.y / speed) * maxSpeed;
  }

  player.position.x = clamp(player.position.x + player.velocity.x * dt, 44, next.arena.width - 44);
  player.position.y = clamp(player.position.y + player.velocity.y * dt, 44, next.arena.height - 44);
  next.stats.distanceTraveled += distance(previousPosition, player.position);

  const repairTarget = next.relays.find(
    (relay) => !relay.repaired && distance(relay.position, player.position) < 76
  );
  if (repairTarget && input.repair) {
    const repairSpeed = (0.26 + next.upgrades.repair * 0.07 + player.lumen * 0.005) * difficulty.repairScale;
    repairTarget.progress = Math.min(1, repairTarget.progress + dt * repairSpeed);
    player.charge = Math.max(0, player.charge - dt * 3.2);
    next.stats.repairSeconds += dt;
    next.message = "保持在信标旁，维修光束正在充能。";
    if (repairTarget.progress >= 1) {
      repairTarget.repaired = true;
      player.lumen += 2;
      next.stats.relaysRepaired += 1;
      awardScore(next, 260 + next.upgrades.repair * 75, 0.48);
      next.shake = 0.1;
      next.message = `信标修复完成，${formatCombo(next.combo)} 连锁保持中。`;
    }
  } else {
    next.relays.forEach((relay) => {
      if (!relay.repaired && relay.progress > 0) {
        relay.progress = Math.max(0, relay.progress - dt * 0.022);
      }
    });
  }

  if (input.pulse && player.pulseCooldown <= 0) {
    const pulseLevel = next.upgrades.pulse;
    player.pulseCooldown = Math.max(2.8, 5.5 - pulseLevel * 0.45);
    player.charge = Math.max(0, player.charge - 10);
    next.stats.pulseUses += 1;
    next.hazards.forEach((hazard) => {
      const toHazard = subtract(hazard.position, player.position);
      const len = Math.hypot(toHazard.x, toHazard.y) || 1;
      const pulseRadius = 210 + pulseLevel * 48;
      if (len < pulseRadius) {
        hazard.velocity.x += (toHazard.x / len) * (215 + pulseLevel * 60);
        hazard.velocity.y += (toHazard.y / len) * (215 + pulseLevel * 60);
      }
    });
    next.message = "脉冲释放，附近虚空碎片被推开。";
  }

  next.lumen.forEach((drop) => {
    if (!drop.collected && distance(drop.position, player.position) < 34) {
      drop.collected = true;
      player.lumen += 1;
      next.stats.lumenCollected += 1;
      player.charge = Math.min(player.maxCharge, player.charge + 9 + next.upgrades.capacitor * 3);
      awardScore(next, 70, 0.25);
      next.message = `流明回收，${formatCombo(next.combo)} 连锁。`;
    }
  });

  next.hazards.forEach((hazard) => {
    hazard.position.x += hazard.velocity.x * dt;
    hazard.position.y += hazard.velocity.y * dt;
    if (hazard.position.x < 70 || hazard.position.x > next.arena.width - 70) {
      hazard.velocity.x *= -1;
    }
    if (hazard.position.y < 84 || hazard.position.y > next.arena.height - 70) {
      hazard.velocity.y *= -1;
    }
    if (distance(hazard.position, player.position) < hazard.radius + 28 && player.invulnerable <= 0) {
      const damageScale = 1 - next.upgrades.shield * 0.12;
      player.hull = Math.max(0, player.hull - 16 * damageScale * difficulty.damageScale);
      player.charge = Math.max(0, player.charge - 7);
      player.invulnerable = 0.85;
      next.stats.hitsTaken += 1;
      next.combo = 1;
      next.comboTimer = 0;
      next.score = Math.max(0, next.score - 75);
      next.shake = 0.32;
      const away = subtract(player.position, hazard.position);
      const len = Math.hypot(away.x, away.y) || 1;
      player.velocity.x += (away.x / len) * 250;
      player.velocity.y += (away.y / len) * 250;
      next.message = "被虚空碎片击中，机体完整度下降。";
    }
  });

  let insideStorm = false;
  next.storms.forEach((storm) => {
    storm.phase += dt * (0.8 + next.wave * 0.04);
    const activeRadius = getStormActiveRadius(storm);
    if (distance(storm.position, player.position) < activeRadius) {
      insideStorm = true;
      player.charge = Math.max(0, player.charge - dt * (9 + next.wave * 0.7) * difficulty.drainScale);
      if (player.invulnerable <= 0 && storm.phase % (Math.PI * 2) > Math.PI * 1.35) {
        player.hull = Math.max(0, player.hull - dt * (5.5 - next.upgrades.shield) * difficulty.damageScale);
      }
      next.shake = Math.max(next.shake, 0.08);
      next.message = "风暴场正在吸走电量，立刻脱离范围。";
    }
  });
  if (insideStorm) {
    next.stats.stormSeconds += dt;
  }

  player.charge = Math.max(0, player.charge - dt * (2.05 + next.wave * 0.22) * difficulty.drainScale);
  next.gate.open = next.relays.every((relay) => relay.repaired);

  if (next.gate.open) {
    next.message = "光门已开启，飞向北侧出口。";
    if (distance(next.gate.position, player.position) < 58) {
      awardScore(next, 900 + player.lumen * 45 + Math.ceil(player.charge) * 8, 0.35);
      next.status = next.wave >= next.campaignWaves ? "completed" : "won";
      next.endReason = next.status === "completed" ? "campaignCompleted" : "waveCleared";
      next.stats.wavesCleared += 1;
      next.message =
        next.status === "completed"
          ? `五波光网全部稳定，最终得分 ${next.score.toLocaleString()}。`
          : `光网稳定，得分 ${next.score.toLocaleString()}。请选择一项升级。`;
    }
  }

  if (next.status === "playing" && (player.hull <= 0 || player.charge <= 0)) {
    next.status = "lost";
    next.endReason = player.hull <= 0 ? "hullDestroyed" : "chargeDepleted";
    next.message = player.hull <= 0 ? "无人机损毁，重新启动救援。" : "电量归零，光网被虚空吞没。";
  }

  return next;
}

export function pauseRun(state: GameState): GameState {
  if (state.status !== "playing") {
    return state;
  }
  return { ...structuredClone(state), status: "paused", message: "已暂停。查看目标、操作和得分规则。" };
}

export function resumeRun(state: GameState): GameState {
  if (state.status !== "paused") {
    return state;
  }
  return { ...structuredClone(state), status: "playing", message: "继续救援：修复信标并保持电量。" };
}

export function getUpgradeChoices(state: GameState): Upgrade[] {
  const ids = Object.keys(UPGRADE_CATALOG) as UpgradeId[];
  const offset = (state.wave + state.score + state.player.lumen) % ids.length;
  return ids
    .slice(offset)
    .concat(ids.slice(0, offset))
    .filter((id) => state.upgrades[id] < 3)
    .slice(0, 3)
    .map((id) => UPGRADE_CATALOG[id]);
}

export function getStormActiveRadius(storm: Storm): number {
  return storm.radius + Math.sin(storm.phase * 1.7) * 18;
}

function createUpgradeState(): UpgradeState {
  return {
    engine: 0,
    repair: 0,
    capacitor: 0,
    pulse: 0,
    shield: 0
  };
}

function createRunStats(): RunStats {
  return {
    boostUses: 0,
    pulseUses: 0,
    lumenCollected: 0,
    relaysRepaired: 0,
    hitsTaken: 0,
    stormSeconds: 0,
    repairSeconds: 0,
    distanceTraveled: 0,
    wavesCleared: 0
  };
}

function createStorms(wave: number, difficulty: DifficultyId): Storm[] {
  const baseStorms: Storm[] = [
    { id: 0, position: { x: 495, y: 235 }, radius: 82, phase: 0.8 },
    { id: 1, position: { x: 655, y: 520 }, radius: 74, phase: 2.2 },
    { id: 2, position: { x: 230, y: 395 }, radius: 66, phase: 4.1 }
  ];
  const stormCount = clampInt(Math.ceil(wave / 2) + DIFFICULTY_SETTINGS[difficulty].stormBonus, 0, baseStorms.length);
  return baseStorms.slice(0, stormCount);
}

function awardScore(state: GameState, base: number, comboGain: number): void {
  state.combo = Math.min(5, state.combo + comboGain);
  state.comboTimer = 3.4;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.score += Math.round(base * state.combo * DIFFICULTY_SETTINGS[state.difficulty].scoreScale);
}

function formatCombo(combo: number): string {
  return `${combo.toFixed(1)}x`;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}
