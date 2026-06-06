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

export type WaveModifierId =
  | "steadySignal"
  | "lumenSurge"
  | "shardCurrent"
  | "stormFront"
  | "overclockedGrid";

export type WaveModifier = {
  id: WaveModifierId;
  name: string;
  description: string;
  briefing: string;
  drainBonus: number;
  repairBonus: number;
  scoreBonus: number;
  lumenChargeBonus: number;
  hazardSpeedBonus: number;
  stormDrainBonus: number;
  stormPhaseBonus: number;
};

export type UpgradeId = "engine" | "repair" | "capacitor" | "pulse" | "shield";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  description: string;
};

export type UpgradeState = Record<UpgradeId, number>;

export type UpgradeSummary = Upgrade & {
  level: number;
  maxLevel: number;
  capped: boolean;
  currentEffect: string;
  nextEffect?: string;
};

export type RunEndReason =
  | "none"
  | "waveCleared"
  | "campaignCompleted"
  | "hullDestroyed"
  | "chargeDepleted";

export type RunStats = {
  boostUses: number;
  contractsCompleted: number;
  pulseUses: number;
  lumenCollected: number;
  relaysRepaired: number;
  hitsTaken: number;
  stormSeconds: number;
  repairSeconds: number;
  distanceTraveled: number;
  wavesCleared: number;
};

export type RunRatingId = "S" | "A" | "B" | "C";

export type RunRating = {
  id: RunRatingId;
  name: string;
  description: string;
  points: number;
};

export type AchievementId =
  | "firstRepair"
  | "cleanWave"
  | "lumenCollector"
  | "stormSkipper"
  | "perfectSignal"
  | "fullStabilizer"
  | "hardcoreClear";

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  requirement: string;
};

export type AchievementSummary = Achievement & {
  unlocked: boolean;
};

export type AchievementRunContext = {
  bestCombo: number;
  difficulty: DifficultyId;
  rating: RunRating;
  score: number;
  stats: RunStats;
  status: "won" | "completed" | "lost";
  wave: number;
};

export type ContractId = "lumenRoute" | "relayRush" | "cleanWave" | "stormSkipper" | "pulseDiscipline";

export type ContractStatus = "active" | "completed" | "failed";

export type TacticalContract = {
  id: ContractId;
  name: string;
  description: string;
  requirement: string;
  rewardScore: number;
};

export type ContractState = {
  id: ContractId;
  rewardClaimed: boolean;
  startElapsed: number;
  startStats: RunStats;
  status: ContractStatus;
};

export type ContractSnapshot = TacticalContract & {
  progress: string;
  rewardClaimed: boolean;
  status: ContractStatus;
};

export type ObjectiveHintKind = "menu" | "danger" | "repair" | "relay" | "lumen" | "gate";

export type ObjectiveHint = {
  kind: ObjectiveHintKind;
  title: string;
  detail: string;
  target?: Vec2;
  urgent: boolean;
};

export type ResourceAlertLevel = "stable" | "low" | "critical";

export type ResourceAlerts = {
  charge: ResourceAlertLevel;
  hull: ResourceAlertLevel;
};

export type HazardThreatLevel = "safe" | "near" | "danger";

export type HazardThreat = {
  id: number;
  level: HazardThreatLevel;
  distance: number;
  collisionRadius: number;
  warningRadius: number;
  position: Vec2;
  radius: number;
};

export const CAMPAIGN_WAVES = 5;
export const MAX_UPGRADE_LEVEL = 3;
export const REPAIR_RADIUS = 76;
export const LUMEN_PICKUP_RADIUS = 34;
export const HAZARD_PLAYER_RADIUS = 28;
export const HAZARD_NEAR_BUFFER = 112;

export const CONTRACTS: Record<ContractId, TacticalContract> = {
  lumenRoute: {
    id: "lumenRoute",
    name: "流明航线",
    description: "先建立补给路线，保持电量节奏。",
    requirement: "本波回收 4 个流明",
    rewardScore: 360
  },
  relayRush: {
    id: "relayRush",
    name: "速修信标",
    description: "快速打开第一处维修窗口。",
    requirement: "38 秒内修复第一座信标",
    rewardScore: 420
  },
  cleanWave: {
    id: "cleanWave",
    name: "无损救援",
    description: "用路线和脉冲避免碎片碰撞。",
    requirement: "本波撤离时不受击",
    rewardScore: 520
  },
  stormSkipper: {
    id: "stormSkipper",
    name: "风暴掠行",
    description: "绕开风暴，不把电量交给紫色场。",
    requirement: "本波风暴停留不超过 1 秒",
    rewardScore: 500
  },
  pulseDiscipline: {
    id: "pulseDiscipline",
    name: "脉冲节律",
    description: "少用脉冲，靠路线和推进处理危险。",
    requirement: "本波撤离时脉冲不超过 1 次",
    rewardScore: 480
  }
};

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  firstRepair: {
    id: "firstRepair",
    name: "第一束光",
    description: "完成任意一座信标维修。",
    requirement: "在一局中修复至少 1 座信标"
  },
  cleanWave: {
    id: "cleanWave",
    name: "无损撤离",
    description: "稳定一波时没有被碎片击中。",
    requirement: "胜利或通关时受击为 0"
  },
  lumenCollector: {
    id: "lumenCollector",
    name: "流明猎手",
    description: "一局内回收大量流明。",
    requirement: "单局回收 8 个流明"
  },
  stormSkipper: {
    id: "stormSkipper",
    name: "风暴边缘",
    description: "稳定一波时几乎没有被风暴拖住。",
    requirement: "胜利或通关且风暴停留不超过 1 秒"
  },
  perfectSignal: {
    id: "perfectSignal",
    name: "S 级信号",
    description: "以 S 级评价结束一局。",
    requirement: "获得 S 级结算"
  },
  fullStabilizer: {
    id: "fullStabilizer",
    name: "全域稳定",
    description: "完成完整五波救援。",
    requirement: "通关第 5 波"
  },
  hardcoreClear: {
    id: "hardcoreClear",
    name: "硬核光网",
    description: "在硬核模式完成完整救援。",
    requirement: "硬核模式通关"
  }
};

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

export const WAVE_MODIFIERS: Record<WaveModifierId, WaveModifier> = {
  steadySignal: {
    id: "steadySignal",
    name: "稳定信号",
    description: "基础战场，没有额外异常。",
    briefing: "第一波先建立节奏：补流明、修信标、撤离。",
    drainBonus: 0,
    repairBonus: 0,
    scoreBonus: 0,
    lumenChargeBonus: 0,
    hazardSpeedBonus: 0,
    stormDrainBonus: 0,
    stormPhaseBonus: 0
  },
  lumenSurge: {
    id: "lumenSurge",
    name: "流明潮汐",
    description: "流明回复更多电量，适合冲连锁。",
    briefing: "金色流明更活跃，敢于绕路收集会换来更高续航。",
    drainBonus: 0.04,
    repairBonus: 0,
    scoreBonus: 0.06,
    lumenChargeBonus: 5,
    hazardSpeedBonus: 0,
    stormDrainBonus: 0,
    stormPhaseBonus: 0
  },
  shardCurrent: {
    id: "shardCurrent",
    name: "碎片回潮",
    description: "虚空碎片移动更快，分数倍率略高。",
    briefing: "粉色碎片流速上升，保留脉冲来保护修复窗口。",
    drainBonus: 0,
    repairBonus: 0,
    scoreBonus: 0.12,
    lumenChargeBonus: 0,
    hazardSpeedBonus: 0.18,
    stormDrainBonus: 0,
    stormPhaseBonus: 0
  },
  stormFront: {
    id: "stormFront",
    name: "风暴前线",
    description: "风暴更活跃，停留会快速掉电。",
    briefing: "紫色风暴会更频繁扩张，先规划安全路线再修复。",
    drainBonus: 0.06,
    repairBonus: 0,
    scoreBonus: 0.14,
    lumenChargeBonus: 0,
    hazardSpeedBonus: 0,
    stormDrainBonus: 0.24,
    stormPhaseBonus: 0.22
  },
  overclockedGrid: {
    id: "overclockedGrid",
    name: "超频光网",
    description: "维修更快，但基础耗电和奖励都更高。",
    briefing: "信标响应变快，抓准时机可以高速清波，但电量会更紧。",
    drainBonus: 0.12,
    repairBonus: 0.18,
    scoreBonus: 0.16,
    lumenChargeBonus: 2,
    hazardSpeedBonus: 0.08,
    stormDrainBonus: 0.08,
    stormPhaseBonus: 0.08
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
  contract: ContractState;
  upgrades: UpgradeState;
  wave: number;
  waveModifier: WaveModifierId;
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
    contract: createContractState("lumenRoute", 0, createRunStats()),
    upgrades: createUpgradeState(),
    wave: 1,
    waveModifier: "steadySignal",
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
  next.waveModifier = getWaveModifierFor(next.wave, next.difficulty);
  next.upgrades = wonPreviousWave ? { ...state.upgrades } : createUpgradeState();
  next.elapsed = wonPreviousWave ? state.elapsed : 0;
  next.endReason = "none";
  next.stats = wonPreviousWave ? { ...state.stats } : createRunStats();
  next.contract = createContractState(getContractFor(next.wave, next.difficulty), next.elapsed, next.stats);
  if (wonPreviousWave && upgradeId && next.upgrades[upgradeId] < MAX_UPGRADE_LEVEL) {
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
  const modifier = WAVE_MODIFIERS[next.waveModifier];
  next.message = wonPreviousWave
    ? `升级已安装。第 ${next.wave}/${next.campaignWaves} 波，${modifier.name}：${modifier.briefing}`
    : `${DIFFICULTY_SETTINGS[next.difficulty].name}模式，第 ${next.wave}/${next.campaignWaves} 波，${modifier.name}：${modifier.briefing}`;
  return next;
}

export function updateSimulation(state: GameState, input: InputState, dt: number): GameState {
  if (state.status !== "playing") {
    return state;
  }

  const next = structuredClone(state);
  const player = next.player;
  const difficulty = DIFFICULTY_SETTINGS[next.difficulty];
  const modifier = WAVE_MODIFIERS[next.waveModifier];
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

  const repairTarget = getActiveRepairTarget(next);
  if (repairTarget && input.repair) {
    const repairSpeed =
      (0.26 + next.upgrades.repair * 0.07 + player.lumen * 0.005) *
      difficulty.repairScale *
      (1 + modifier.repairBonus);
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
    if (!drop.collected && distance(drop.position, player.position) < LUMEN_PICKUP_RADIUS) {
      drop.collected = true;
      player.lumen += 1;
      next.stats.lumenCollected += 1;
      player.charge = Math.min(player.maxCharge, player.charge + 9 + next.upgrades.capacitor * 3 + modifier.lumenChargeBonus);
      awardScore(next, 70, 0.25);
      next.message = `流明回收，${formatCombo(next.combo)} 连锁。`;
    }
  });

  next.hazards.forEach((hazard) => {
    const hazardSpeed = 1 + modifier.hazardSpeedBonus;
    hazard.position.x += hazard.velocity.x * dt * hazardSpeed;
    hazard.position.y += hazard.velocity.y * dt * hazardSpeed;
    if (hazard.position.x < 70 || hazard.position.x > next.arena.width - 70) {
      hazard.velocity.x *= -1;
    }
    if (hazard.position.y < 84 || hazard.position.y > next.arena.height - 70) {
      hazard.velocity.y *= -1;
    }
    if (distance(hazard.position, player.position) < hazard.radius + HAZARD_PLAYER_RADIUS && player.invulnerable <= 0) {
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
    storm.phase += dt * (0.8 + next.wave * 0.04 + modifier.stormPhaseBonus);
    const activeRadius = getStormActiveRadius(storm);
    if (distance(storm.position, player.position) < activeRadius) {
      insideStorm = true;
      player.charge = Math.max(
        0,
        player.charge - dt * (9 + next.wave * 0.7) * difficulty.drainScale * (1 + modifier.stormDrainBonus)
      );
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

  player.charge = Math.max(
    0,
    player.charge - dt * (2.05 + next.wave * 0.22) * difficulty.drainScale * (1 + modifier.drainBonus)
  );
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

  updateContractProgress(next, difficulty, modifier);
  if (next.status === "won" || next.status === "completed") {
    next.message =
      next.status === "completed"
        ? `五波光网全部稳定，最终得分 ${next.score.toLocaleString()}。`
        : `光网稳定，得分 ${next.score.toLocaleString()}。请选择一项升级。`;
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
    .filter((id) => state.upgrades[id] < MAX_UPGRADE_LEVEL)
    .slice(0, 3)
    .map((id) => UPGRADE_CATALOG[id]);
}

export function getUpgradeSummary(upgrades: UpgradeState, id: UpgradeId): UpgradeSummary {
  const level = clampInt(upgrades[id], 0, MAX_UPGRADE_LEVEL);
  const capped = level >= MAX_UPGRADE_LEVEL;
  return {
    ...UPGRADE_CATALOG[id],
    level,
    maxLevel: MAX_UPGRADE_LEVEL,
    capped,
    currentEffect: formatUpgradeEffect(id, level),
    nextEffect: capped ? undefined : formatUpgradeEffect(id, level + 1)
  };
}

export function getUpgradeSummaries(upgrades: UpgradeState): UpgradeSummary[] {
  return (Object.keys(UPGRADE_CATALOG) as UpgradeId[]).map((id) => getUpgradeSummary(upgrades, id));
}

export function getRunRating(state: GameState): RunRating {
  let points = 0;
  if (state.status === "completed") {
    points += 56;
  } else if (state.status === "won") {
    points += 40;
  } else if (state.status === "lost") {
    points += state.stats.relaysRepaired * 6;
  }

  points += state.bestCombo >= 4.5 ? 18 : state.bestCombo >= 3 ? 12 : state.bestCombo >= 2 ? 6 : 0;
  points += state.stats.hitsTaken === 0 ? 15 : state.stats.hitsTaken <= 1 ? 10 : state.stats.hitsTaken <= 3 ? 4 : 0;
  points += state.stats.stormSeconds <= 1 ? 10 : state.stats.stormSeconds <= 4 ? 5 : 0;
  points += state.elapsed <= state.wave * 42 ? 8 : state.elapsed <= state.wave * 58 ? 4 : 0;
  points += state.stats.lumenCollected >= Math.max(3, state.wave * 2) ? 6 : 0;
  points += state.player.charge > state.player.maxCharge * 0.45 ? 5 : 0;

  const cappedPoints = clampInt(points, 0, 100);
  if (cappedPoints >= 82) {
    return {
      id: "S",
      name: "完美稳定",
      description: "路线、连锁和风险控制都很出色。",
      points: cappedPoints
    };
  }
  if (cappedPoints >= 62) {
    return {
      id: "A",
      name: "高效救援",
      description: "节奏良好，还有少量提分空间。",
      points: cappedPoints
    };
  }
  if (cappedPoints >= 36) {
    return {
      id: "B",
      name: "稳定完成",
      description: "目标完成，但连锁、路线或受击还可优化。",
      points: cappedPoints
    };
  }
  return {
    id: "C",
    name: "信号不稳",
    description: "先保证补给和生存，再追求速度与连锁。",
    points: cappedPoints
  };
}

export function getContractFor(wave: number, difficulty: DifficultyId): ContractId {
  const standardOrder: ContractId[] = ["lumenRoute", "relayRush", "cleanWave", "stormSkipper", "pulseDiscipline"];
  if (difficulty === "hardcore") {
    const hardcoreOrder: ContractId[] = ["cleanWave", "stormSkipper", "pulseDiscipline", "relayRush", "lumenRoute"];
    return hardcoreOrder[clampInt(wave - 1, 0, hardcoreOrder.length - 1)];
  }
  return standardOrder[clampInt(wave - 1, 0, standardOrder.length - 1)];
}

export function createContractState(id: ContractId, startElapsed = 0, startStats: RunStats = createRunStats()): ContractState {
  return {
    id,
    rewardClaimed: false,
    startElapsed,
    startStats: { ...startStats },
    status: "active"
  };
}

export function getContractSnapshot(state: GameState): ContractSnapshot {
  const contract = CONTRACTS[state.contract.id];
  return {
    ...contract,
    progress: getContractProgressText(state),
    rewardClaimed: state.contract.rewardClaimed,
    status: state.contract.status
  };
}

export function getResourceAlerts(state: GameState): ResourceAlerts {
  return {
    charge: getResourceAlertLevel(state.player.charge, state.player.maxCharge, 0.34, 0.18),
    hull: getResourceAlertLevel(state.player.hull, state.player.maxHull, 0.42, 0.24)
  };
}

export function getActiveRepairTarget(state: GameState): Relay | undefined {
  return state.relays.find(
    (relay) => !relay.repaired && distance(relay.position, state.player.position) < REPAIR_RADIUS
  );
}

export function getHazardThreats(state: GameState): HazardThreat[] {
  return state.hazards.map((hazard) => {
    const collisionRadius = hazard.radius + HAZARD_PLAYER_RADIUS;
    const warningRadius = collisionRadius + HAZARD_NEAR_BUFFER;
    const hazardDistance = distance(hazard.position, state.player.position);
    return {
      id: hazard.id,
      level: hazardDistance <= collisionRadius + 18 ? "danger" : hazardDistance <= warningRadius ? "near" : "safe",
      distance: hazardDistance,
      collisionRadius,
      warningRadius,
      position: { ...hazard.position },
      radius: hazard.radius
    };
  });
}

export function getUnlockedAchievementsForRun(context: AchievementRunContext): AchievementId[] {
  const unlocked: AchievementId[] = [];
  if (context.stats.relaysRepaired >= 1) unlocked.push("firstRepair");
  if ((context.status === "won" || context.status === "completed") && context.stats.hitsTaken === 0) {
    unlocked.push("cleanWave");
  }
  if (context.stats.lumenCollected >= 8) unlocked.push("lumenCollector");
  if ((context.status === "won" || context.status === "completed") && context.stats.stormSeconds <= 1) {
    unlocked.push("stormSkipper");
  }
  if (context.rating.id === "S") unlocked.push("perfectSignal");
  if (context.status === "completed") unlocked.push("fullStabilizer");
  if (context.status === "completed" && context.difficulty === "hardcore") unlocked.push("hardcoreClear");
  return unlocked;
}

export function getAchievementSummaries(unlockedIds: AchievementId[]): AchievementSummary[] {
  const unlocked = new Set(unlockedIds);
  return (Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => ({
    ...ACHIEVEMENTS[id],
    unlocked: unlocked.has(id)
  }));
}

export function getWaveModifierFor(wave: number, difficulty: DifficultyId): WaveModifierId {
  const standardOrder: WaveModifierId[] = [
    "steadySignal",
    "lumenSurge",
    "shardCurrent",
    "stormFront",
    "overclockedGrid"
  ];
  if (difficulty === "hardcore") {
    const hardcoreOrder: WaveModifierId[] = [
      "shardCurrent",
      "stormFront",
      "overclockedGrid",
      "lumenSurge",
      "stormFront"
    ];
    return hardcoreOrder[clampInt(wave - 1, 0, hardcoreOrder.length - 1)];
  }
  return standardOrder[clampInt(wave - 1, 0, standardOrder.length - 1)];
}

export function getObjectiveHint(state: GameState): ObjectiveHint {
  if (state.status !== "playing") {
    return {
      kind: "menu",
      title: "准备救援",
      detail: "选择难度后开始，目标是修复信标并从北侧光门撤离。",
      urgent: false
    };
  }

  const player = state.player;
  const activeStorm = state.storms.find((storm) => distance(storm.position, player.position) < getStormActiveRadius(storm));
  if (activeStorm) {
    return {
      kind: "danger",
      title: "立刻脱离风暴",
      detail: "紫色风暴正在吸走电量，先推进离开范围再继续修复。",
      target: player.position,
      urgent: true
    };
  }

  if (state.gate.open) {
    return {
      kind: "gate",
      title: "光门已开启",
      detail: `向北侧光门撤离，距离 ${formatDistance(distance(player.position, state.gate.position))}。`,
      target: state.gate.position,
      urgent: false
    };
  }

  const repairTarget = getActiveRepairTarget(state);
  if (repairTarget) {
    return {
      kind: "repair",
      title: "按住 E 修复",
      detail: `信标已锁定，当前进度 ${Math.round(repairTarget.progress * 100)}%。离开会慢慢掉进度。`,
      target: repairTarget.position,
      urgent: true
    };
  }

  const nearestLumen = nearest(state.lumen.filter((drop) => !drop.collected), player.position);
  if (player.charge < 38 && nearestLumen) {
    return {
      kind: "lumen",
      title: "先补充流明",
      detail: `电量偏低，最近流明距离 ${formatDistance(nearestLumen.distance)}。`,
      target: nearestLumen.item.position,
      urgent: true
    };
  }

  const nearestRelay = nearest(state.relays.filter((relay) => !relay.repaired), player.position);
  if (nearestRelay) {
    return {
      kind: "relay",
      title: "前往最近信标",
      detail: `靠近后按 E 修复，距离 ${formatDistance(nearestRelay.distance)}。`,
      target: nearestRelay.item.position,
      urgent: false
    };
  }

  if (nearestLumen) {
    return {
      kind: "lumen",
      title: "回收剩余流明",
      detail: `补满电量并保持连锁，距离 ${formatDistance(nearestLumen.distance)}。`,
      target: nearestLumen.item.position,
      urgent: false
    };
  }

  return {
    kind: "gate",
    title: "寻找光门",
    detail: "全部目标已完成，向北侧撤离。",
    target: state.gate.position,
    urgent: false
  };
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
    contractsCompleted: 0,
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
  state.score += Math.round(
    base *
      state.combo *
      DIFFICULTY_SETTINGS[state.difficulty].scoreScale *
      (1 + WAVE_MODIFIERS[state.waveModifier].scoreBonus)
  );
}

function formatCombo(combo: number): string {
  return `${combo.toFixed(1)}x`;
}

function formatUpgradeEffect(id: UpgradeId, level: number): string {
  if (id === "engine") {
    return level === 0
      ? "基础推力，推进冷却 1.15 秒"
      : `常规推力 +${level * 42}，推进推力 +${level * 90}，推进冷却 ${Math.max(0.62, 1.15 - level * 0.12).toFixed(2)} 秒`;
  }
  if (id === "repair") {
    return level === 0
      ? "基础维修速度，信标基础得分 260"
      : `维修速度 +${level * 7}%，信标得分 +${level * 75}`;
  }
  if (id === "capacitor") {
    return level === 0
      ? "最大电量 100，流明回电 +9"
      : `最大电量 +${level * 16}，流明额外回电 +${level * 3}`;
  }
  if (id === "pulse") {
    return level === 0
      ? "脉冲半径 210，冷却 5.50 秒"
      : `脉冲半径 +${level * 48}，冷却 ${Math.max(2.8, 5.5 - level * 0.45).toFixed(2)} 秒`;
  }
  return level === 0
    ? "最大机体 100，基础碰撞减伤"
    : `最大机体 +${level * 14}，碰撞伤害 -${level * 12}%`;
}

function formatDistance(value: number): string {
  return `${Math.max(0, Math.round(value))}m`;
}

function nearest<T extends { position: Vec2 }>(items: T[], origin: Vec2): { item: T; distance: number } | undefined {
  return items.reduce<{ item: T; distance: number } | undefined>((best, item) => {
    const itemDistance = distance(item.position, origin);
    if (!best || itemDistance < best.distance) {
      return { item, distance: itemDistance };
    }
    return best;
  }, undefined);
}

function updateContractProgress(state: GameState, difficulty: Difficulty, modifier: WaveModifier): void {
  if (state.contract.status !== "active") return;

  const deltas = getContractDeltas(state);
  const waveEnded = state.status === "won" || state.status === "completed";
  const elapsed = state.elapsed - state.contract.startElapsed;
  let nextStatus: ContractStatus = "active";

  switch (state.contract.id) {
    case "lumenRoute":
      if (deltas.lumenCollected >= 4) nextStatus = "completed";
      else if (waveEnded) nextStatus = "failed";
      break;
    case "relayRush":
      if (deltas.relaysRepaired >= 1) nextStatus = elapsed <= 38 ? "completed" : "failed";
      else if (elapsed > 38 && deltas.relaysRepaired < 1) nextStatus = "failed";
      break;
    case "cleanWave":
      if (deltas.hitsTaken > 0) nextStatus = "failed";
      else if (waveEnded) nextStatus = "completed";
      break;
    case "stormSkipper":
      if (deltas.stormSeconds > 1) nextStatus = "failed";
      else if (waveEnded) nextStatus = "completed";
      break;
    case "pulseDiscipline":
      if (deltas.pulseUses > 1) nextStatus = "failed";
      else if (waveEnded) nextStatus = "completed";
      break;
  }

  if (state.status === "lost" && nextStatus === "active") {
    nextStatus = "failed";
  }

  if (nextStatus === "active") return;
  state.contract.status = nextStatus;
  if (nextStatus === "completed" && !state.contract.rewardClaimed) {
    const reward = Math.round(CONTRACTS[state.contract.id].rewardScore * difficulty.scoreScale * (1 + modifier.scoreBonus));
    state.score += reward;
    state.stats.contractsCompleted += 1;
    state.contract.rewardClaimed = true;
    if (state.status === "playing") {
      state.message = `战术合约完成：${CONTRACTS[state.contract.id].name}，奖励 ${reward} 分。`;
    }
  } else if (nextStatus === "failed" && state.status === "playing") {
    state.message = `战术合约失败：${CONTRACTS[state.contract.id].name}。继续完成主目标。`;
  }
}

function getContractProgressText(state: GameState): string {
  const deltas = getContractDeltas(state);
  const elapsed = state.elapsed - state.contract.startElapsed;
  if (state.contract.status === "completed") return "已完成，奖励已结算。";
  if (state.contract.status === "failed") return "本波已失败，主目标仍可完成。";

  switch (state.contract.id) {
    case "lumenRoute":
      return `${Math.min(deltas.lumenCollected, 4)}/4 流明`;
    case "relayRush":
      return deltas.relaysRepaired >= 1 ? "第一座信标已修复" : `${Math.max(0, Math.ceil(38 - elapsed))} 秒内修复第一座信标`;
    case "cleanWave":
      return deltas.hitsTaken === 0 ? "无受击保持中" : `${deltas.hitsTaken} 次受击`;
    case "stormSkipper":
      return `${Math.min(deltas.stormSeconds, 9).toFixed(1)}/1.0 秒风暴停留`;
    case "pulseDiscipline":
      return `${Math.min(deltas.pulseUses, 9)}/1 次脉冲`;
  }
}

function getContractDeltas(state: GameState): RunStats {
  return {
    boostUses: state.stats.boostUses - state.contract.startStats.boostUses,
    contractsCompleted: state.stats.contractsCompleted - state.contract.startStats.contractsCompleted,
    pulseUses: state.stats.pulseUses - state.contract.startStats.pulseUses,
    lumenCollected: state.stats.lumenCollected - state.contract.startStats.lumenCollected,
    relaysRepaired: state.stats.relaysRepaired - state.contract.startStats.relaysRepaired,
    hitsTaken: state.stats.hitsTaken - state.contract.startStats.hitsTaken,
    stormSeconds: state.stats.stormSeconds - state.contract.startStats.stormSeconds,
    repairSeconds: state.stats.repairSeconds - state.contract.startStats.repairSeconds,
    distanceTraveled: state.stats.distanceTraveled - state.contract.startStats.distanceTraveled,
    wavesCleared: state.stats.wavesCleared - state.contract.startStats.wavesCleared
  };
}

function getResourceAlertLevel(
  value: number,
  max: number,
  lowThreshold: number,
  criticalThreshold: number
): ResourceAlertLevel {
  const ratio = value / Math.max(1, max);
  if (ratio <= criticalThreshold) return "critical";
  if (ratio <= lowThreshold) return "low";
  return "stable";
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
