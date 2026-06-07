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
  closeCallArmed?: boolean;
  closeCallCooldown?: number;
  closeCallClosest?: number;
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

export type SectorId = "outerRing" | "crossCurrent" | "southernArc" | "stormSpine" | "overclockCore";

export type SectorLayout = {
  id: SectorId;
  name: string;
  description: string;
  briefing: string;
  relayPositions: Vec2[];
  lumenPositions: Vec2[];
  hazards: Hazard[];
  storms: Storm[];
  gatePosition: Vec2;
};

export type RoutePlan = {
  seed: number;
  code: string;
  name: string;
  description: string;
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
  closeCalls: number;
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

export type RunPerformance = RunRating & {
  detail: string;
  fill: number;
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

export type ContractFocusKind = "avoidHazard" | "avoidStorm" | "conservePulse" | "lumen" | "relay";

export type ContractFocus = {
  active: boolean;
  detail: string;
  kind: ContractFocusKind;
  progress: string;
  targets: Vec2[];
  title: string;
  urgent: boolean;
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

export type CoachDirectiveId =
  | "collectLumen"
  | "reachRelay"
  | "repairRelay"
  | "exitGate"
  | "escapeStorm"
  | "pulseDanger"
  | "recoverCharge"
  | "readContract";

export type CoachDirective = {
  id: CoachDirectiveId;
  step: number;
  totalSteps: number;
  title: string;
  detail: string;
  progress: string;
  target?: Vec2;
  urgent: boolean;
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
export const COMBO_WINDOW_SECONDS = 3.4;
export const MAX_UPGRADE_LEVEL = 3;
export const REPAIR_RADIUS = 76;
export const LUMEN_PICKUP_RADIUS = 34;
export const HAZARD_PLAYER_RADIUS = 28;
export const HAZARD_NEAR_BUFFER = 112;
export const HAZARD_CLOSE_CALL_BUFFER = 58;
export const HAZARD_CLOSE_CALL_ESCAPE_BUFFER = 94;
export const HIT_RECOVERY_SECONDS = 0.85;

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

export const SECTOR_LAYOUTS: Record<SectorId, SectorLayout> = {
  outerRing: {
    id: "outerRing",
    name: "北环补给",
    description: "信标沿外环分布，适合学习补给、维修和撤离节奏。",
    briefing: "外环路线清楚，先建立补给节奏。",
    relayPositions: [
      { x: 170, y: 150 },
      { x: 820, y: 165 },
      { x: 270, y: 560 },
      { x: 745, y: 495 }
    ],
    lumenPositions: [
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
    ],
    hazards: [
      { id: 0, position: { x: 300, y: 235 }, velocity: { x: 72, y: 38 }, radius: 27 },
      { id: 1, position: { x: 760, y: 335 }, velocity: { x: -62, y: 55 }, radius: 31 },
      { id: 2, position: { x: 510, y: 565 }, velocity: { x: 82, y: -45 }, radius: 25 }
    ],
    storms: [
      { id: 0, position: { x: 495, y: 235 }, radius: 82, phase: 0.8 },
      { id: 1, position: { x: 655, y: 520 }, radius: 74, phase: 2.2 },
      { id: 2, position: { x: 230, y: 395 }, radius: 66, phase: 4.1 }
    ],
    gatePosition: { x: 500, y: 55 }
  },
  crossCurrent: {
    id: "crossCurrent",
    name: "交叉洋流",
    description: "信标呈十字分布，横向穿越会遇到更多碎片切线。",
    briefing: "十字航线会拉长横穿距离，保留推进穿过中线。",
    relayPositions: [
      { x: 235, y: 205 },
      { x: 515, y: 132 },
      { x: 805, y: 318 },
      { x: 485, y: 585 }
    ],
    lumenPositions: [
      { x: 162, y: 150 },
      { x: 350, y: 132 },
      { x: 620, y: 168 },
      { x: 855, y: 210 },
      { x: 222, y: 402 },
      { x: 420, y: 362 },
      { x: 650, y: 420 },
      { x: 830, y: 536 },
      { x: 360, y: 630 },
      { x: 578, y: 624 }
    ],
    hazards: [
      { id: 0, position: { x: 270, y: 328 }, velocity: { x: 74, y: -52 }, radius: 28 },
      { id: 1, position: { x: 690, y: 220 }, velocity: { x: -78, y: 45 }, radius: 29 },
      { id: 2, position: { x: 710, y: 566 }, velocity: { x: -62, y: -74 }, radius: 26 }
    ],
    storms: [
      { id: 0, position: { x: 540, y: 276 }, radius: 78, phase: 1.1 },
      { id: 1, position: { x: 260, y: 520 }, radius: 70, phase: 2.8 },
      { id: 2, position: { x: 812, y: 438 }, radius: 66, phase: 4.0 }
    ],
    gatePosition: { x: 500, y: 55 }
  },
  southernArc: {
    id: "southernArc",
    name: "南弧残站",
    description: "下半区资源更多，但返航到北侧光门需要提前规划。",
    briefing: "南弧资源密集，撤离前别把电量花光。",
    relayPositions: [
      { x: 205, y: 455 },
      { x: 395, y: 605 },
      { x: 690, y: 590 },
      { x: 835, y: 405 }
    ],
    lumenPositions: [
      { x: 158, y: 250 },
      { x: 312, y: 318 },
      { x: 506, y: 260 },
      { x: 742, y: 252 },
      { x: 905, y: 332 },
      { x: 236, y: 590 },
      { x: 450, y: 520 },
      { x: 558, y: 648 },
      { x: 732, y: 514 },
      { x: 872, y: 610 }
    ],
    hazards: [
      { id: 0, position: { x: 330, y: 430 }, velocity: { x: 70, y: 65 }, radius: 30 },
      { id: 1, position: { x: 610, y: 330 }, velocity: { x: -74, y: 54 }, radius: 27 },
      { id: 2, position: { x: 805, y: 545 }, velocity: { x: -64, y: -68 }, radius: 30 }
    ],
    storms: [
      { id: 0, position: { x: 520, y: 430 }, radius: 78, phase: 0.4 },
      { id: 1, position: { x: 250, y: 270 }, radius: 68, phase: 2.4 },
      { id: 2, position: { x: 780, y: 245 }, radius: 72, phase: 4.6 }
    ],
    gatePosition: { x: 505, y: 55 }
  },
  stormSpine: {
    id: "stormSpine",
    name: "风暴脊线",
    description: "紫色风暴沿中线压迫路线，适合考验绕行和推进时机。",
    briefing: "中线风暴会切开战场，先选一侧清理再换边。",
    relayPositions: [
      { x: 155, y: 185 },
      { x: 215, y: 555 },
      { x: 790, y: 185 },
      { x: 835, y: 555 }
    ],
    lumenPositions: [
      { x: 112, y: 330 },
      { x: 286, y: 120 },
      { x: 338, y: 300 },
      { x: 300, y: 622 },
      { x: 460, y: 485 },
      { x: 558, y: 168 },
      { x: 672, y: 332 },
      { x: 756, y: 624 },
      { x: 890, y: 312 },
      { x: 904, y: 128 }
    ],
    hazards: [
      { id: 0, position: { x: 390, y: 230 }, velocity: { x: 66, y: 82 }, radius: 28 },
      { id: 1, position: { x: 620, y: 500 }, velocity: { x: -72, y: -76 }, radius: 28 },
      { id: 2, position: { x: 500, y: 350 }, velocity: { x: 88, y: -34 }, radius: 24 }
    ],
    storms: [
      { id: 0, position: { x: 505, y: 230 }, radius: 86, phase: 0.9 },
      { id: 1, position: { x: 500, y: 455 }, radius: 82, phase: 2.6 },
      { id: 2, position: { x: 505, y: 620 }, radius: 66, phase: 4.3 }
    ],
    gatePosition: { x: 500, y: 55 }
  },
  overclockCore: {
    id: "overclockCore",
    name: "核心超频",
    description: "目标靠近核心，奖励窗口快，但碎片会从外圈反复切入。",
    briefing: "核心距离短但危险密度高，脉冲和短推进都要留给修复窗口。",
    relayPositions: [
      { x: 390, y: 245 },
      { x: 635, y: 245 },
      { x: 370, y: 500 },
      { x: 650, y: 505 }
    ],
    lumenPositions: [
      { x: 194, y: 142 },
      { x: 500, y: 112 },
      { x: 846, y: 160 },
      { x: 210, y: 342 },
      { x: 490, y: 350 },
      { x: 792, y: 342 },
      { x: 150, y: 590 },
      { x: 395, y: 635 },
      { x: 620, y: 635 },
      { x: 858, y: 586 }
    ],
    hazards: [
      { id: 0, position: { x: 265, y: 250 }, velocity: { x: 92, y: 48 }, radius: 25 },
      { id: 1, position: { x: 760, y: 245 }, velocity: { x: -90, y: 52 }, radius: 25 },
      { id: 2, position: { x: 505, y: 610 }, velocity: { x: 64, y: -86 }, radius: 29 }
    ],
    storms: [
      { id: 0, position: { x: 500, y: 350 }, radius: 92, phase: 1.4 },
      { id: 1, position: { x: 240, y: 520 }, radius: 68, phase: 3.1 },
      { id: 2, position: { x: 800, y: 520 }, radius: 68, phase: 4.7 }
    ],
    gatePosition: { x: 500, y: 55 }
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
  routeSeed: number;
  sector: SectorId;
  upgrades: UpgradeState;
  wave: number;
  waveModifier: WaveModifierId;
  briefingActive: boolean;
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
  routeSeed?: number;
};

export function createInitialState(): GameState {
  const maxHull = 100;
  const maxCharge = 100;
  const sector: SectorId = "outerRing";
  const routeSeed = 0;
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
    relays: createRelays(sector, routeSeed, 1),
    lumen: createLumen(sector, routeSeed, 1),
    hazards: createHazards(sector, routeSeed, 1),
    storms: [],
    gate: { position: { ...SECTOR_LAYOUTS[sector].gatePosition }, open: false },
    contract: createContractState("lumenRoute", 0, createRunStats()),
    routeSeed,
    sector,
    upgrades: createUpgradeState(),
    wave: 1,
    waveModifier: "steadySignal",
    briefingActive: false,
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
  next.briefingActive = true;
  next.sector = getSectorFor(next.wave, next.difficulty);
  next.routeSeed = wonPreviousWave ? state.routeSeed : normalizeRouteSeed(options.routeSeed ?? createRouteSeed());
  applySectorLayout(next);
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
      position: varyRoutePosition({ x: 220 + i * 245, y: 260 + ((i * 133) % 280) }, next.routeSeed, next.wave, 0x7100 + i, 38),
      velocity: varyRouteVelocity({ x: 54 + i * 18, y: i % 2 === 0 ? 72 : -66 }, next.routeSeed, next.wave, 0x7200 + i),
      radius: 22 + i * 3
    }))
  );
  next.storms = createStorms(next.wave, next.difficulty, next.sector, next.routeSeed);
  const modifier = WAVE_MODIFIERS[next.waveModifier];
  const sector = SECTOR_LAYOUTS[next.sector];
  const route = getRoutePlan(next.routeSeed);
  next.message = wonPreviousWave
    ? `升级已安装。第 ${next.wave}/${next.campaignWaves} 波，${route.name} / ${sector.name} / ${modifier.name}：${sector.briefing}`
    : `${DIFFICULTY_SETTINGS[next.difficulty].name}模式，第 ${next.wave}/${next.campaignWaves} 波，${route.name} / ${sector.name} / ${modifier.name}：${sector.briefing}`;
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
  const playerActed = input.move.x !== 0 || input.move.y !== 0 || input.boost || input.repair || input.pulse;
  if (next.briefingActive && !playerActed) {
    next.shake = Math.max(0, next.shake - dt * 1.8);
    next.message = "开局读图缓冲：先看区域、事件和合约；移动后正式开始计时、耗电和危险。";
    return next;
  }
  if (next.briefingActive && playerActed) {
    next.briefingActive = false;
    next.message = "正式开始：先沿导引线回收流明，再前往蓝色信标。";
  }
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
    hazard.closeCallCooldown = Math.max(0, (hazard.closeCallCooldown ?? 0) - dt);
    hazard.position.x += hazard.velocity.x * dt * hazardSpeed;
    hazard.position.y += hazard.velocity.y * dt * hazardSpeed;
    if (hazard.position.x < 70 || hazard.position.x > next.arena.width - 70) {
      hazard.velocity.x *= -1;
    }
    if (hazard.position.y < 84 || hazard.position.y > next.arena.height - 70) {
      hazard.velocity.y *= -1;
    }
    const hazardDistance = distance(hazard.position, player.position);
    const collisionRadius = hazard.radius + HAZARD_PLAYER_RADIUS;
    if (hazardDistance < collisionRadius && player.invulnerable <= 0) {
      const damageScale = 1 - next.upgrades.shield * 0.12;
      player.hull = Math.max(0, player.hull - 16 * damageScale * difficulty.damageScale);
      player.charge = Math.max(0, player.charge - 7);
      player.invulnerable = HIT_RECOVERY_SECONDS;
      next.stats.hitsTaken += 1;
      next.combo = 1;
      next.comboTimer = 0;
      next.score = Math.max(0, next.score - 75);
      next.shake = 0.32;
      const away = subtract(player.position, hazard.position);
      const len = Math.hypot(away.x, away.y) || 1;
      player.velocity.x += (away.x / len) * 250;
      player.velocity.y += (away.y / len) * 250;
      hazard.closeCallArmed = false;
      hazard.closeCallCooldown = 1.2;
      hazard.closeCallClosest = undefined;
      next.message = "被虚空碎片击中，机体完整度下降。";
    } else {
      updateCloseCall(next, hazard, hazardDistance, collisionRadius);
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
  points += Math.min(6, state.stats.closeCalls * 2);
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

export function getRunPerformance(state: GameState): RunPerformance {
  const repairedRelays = state.relays.filter((relay) => relay.repaired).length;
  const relayProgress = state.relays.length > 0 ? repairedRelays / state.relays.length : 0;
  const contractPoints = state.contract.status === "completed" ? 14 : state.contract.status === "active" ? 6 : 0;
  let points = Math.round(relayProgress * 34) + contractPoints;

  points += state.bestCombo >= 4.5 ? 14 : state.bestCombo >= 3 ? 10 : state.bestCombo >= 2 ? 5 : 0;
  points += state.stats.hitsTaken === 0 ? 12 : state.stats.hitsTaken <= 1 ? 8 : state.stats.hitsTaken <= 3 ? 3 : 0;
  points += state.stats.stormSeconds <= 1 ? 8 : state.stats.stormSeconds <= 4 ? 4 : 0;
  points += state.elapsed <= state.wave * 48 ? 6 : state.elapsed <= state.wave * 66 ? 3 : 0;
  points += state.stats.lumenCollected >= Math.max(3, state.wave * 2) ? 5 : 0;
  points += Math.min(5, state.stats.closeCalls * 2);
  points += state.player.charge > state.player.maxCharge * 0.45 ? 5 : 0;
  points += state.gate.open ? 12 : 0;

  const cappedPoints = clampInt(points, 0, 100);
  const rating = ratingFromPoints(cappedPoints);
  return {
    ...rating,
    detail: getPerformanceDetail(state),
    fill: cappedPoints
  };
}

function ratingFromPoints(points: number): RunRating {
  if (points >= 82) {
    return {
      id: "S",
      name: "完美稳定",
      description: "路线、连锁和风险控制都很出色。",
      points
    };
  }
  if (points >= 62) {
    return {
      id: "A",
      name: "高效救援",
      description: "节奏良好，还有少量提分空间。",
      points
    };
  }
  if (points >= 36) {
    return {
      id: "B",
      name: "稳定推进",
      description: "主路线可控，继续补合约、连锁和无损表现。",
      points
    };
  }
  return {
    id: "C",
    name: "信号不稳",
    description: "先保证补给和生存，再追求速度与连锁。",
    points
  };
}

function getPerformanceDetail(state: GameState): string {
  if (state.status !== "playing") {
    return "开始后会实时显示评级压力和下一步提分目标。";
  }
  if (state.briefingActive) {
    return "读图缓冲：先看区域、合约和第一条流明路线，移动后正式计时。";
  }
  if (state.player.charge <= state.player.maxCharge * 0.28) {
    return "电量偏低：先回收流明，别硬修。";
  }
  if (state.player.hull <= state.player.maxHull * 0.36) {
    return "机体偏低：少穿碎片线，保留脉冲。";
  }
  if (state.contract.status === "failed") {
    return "合约已失败：继续清主目标，减少受击保住评级。";
  }
  if (state.contract.status === "active") {
    return `冲评级：优先完成合约「${CONTRACTS[state.contract.id].name}」。`;
  }
  if (state.stats.hitsTaken > 0) {
    return "受击会压低评级：保持距离，别原地硬修。";
  }
  if (state.stats.stormSeconds > 1) {
    return "风暴停留偏高：绕开紫色场再接信标。";
  }
  if (state.bestCombo < 3 && state.lumen.some((drop) => !drop.collected)) {
    return "连锁还有空间：顺路回收流明冲 A/S。";
  }
  if (state.stats.closeCalls >= 2 && state.stats.hitsTaken === 0) {
    return "擦险表现很好：继续贴边绕线，但别贪到撞碎片。";
  }
  if (state.gate.open) {
    return "光门已开：带着高电量撤离可保评级。";
  }
  return "路线稳定：继续修信标，保持无损和连锁。";
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

export function getContractFocus(state: GameState): ContractFocus {
  const contract = CONTRACTS[state.contract.id];
  const progress = getContractProgressText(state);
  const inactiveFocus: ContractFocus = {
    active: false,
    detail: contract.requirement,
    kind: "lumen",
    progress,
    targets: [],
    title: `战术合约：${contract.name}`,
    urgent: false
  };

  if (state.status !== "playing" || state.contract.status !== "active") {
    return inactiveFocus;
  }

  const deltas = getContractDeltas(state);
  const player = state.player.position;
  const threats = getHazardThreats(state).sort((a, b) => a.distance - b.distance);

  switch (state.contract.id) {
    case "lumenRoute": {
      const remaining = Math.max(0, 4 - deltas.lumenCollected);
      const targets = state.lumen
        .filter((drop) => !drop.collected)
        .map((drop) => ({ drop, distance: distance(drop.position, player) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, Math.max(1, remaining))
        .map(({ drop }) => drop.position);
      return {
        active: targets.length > 0,
        detail: "优先回收标出的金色流明，先把电量节奏建立起来。",
        kind: "lumen",
        progress,
        targets,
        title: "合约目标：流明航线",
        urgent: remaining <= 1
      };
    }
    case "relayRush": {
      const elapsed = state.elapsed - state.contract.startElapsed;
      const target = nearest(state.relays.filter((relay) => !relay.repaired), player)?.item.position;
      return {
        active: Boolean(target),
        detail: "直奔最近蓝色信标，先完成第一座维修。",
        kind: "relay",
        progress,
        targets: target ? [target] : [],
        title: "合约目标：速修信标",
        urgent: elapsed > 28
      };
    }
    case "cleanWave": {
      const nearTargets = threats.filter((threat) => threat.level !== "safe").map((threat) => threat.position);
      const fallbackTargets = threats.slice(0, 2).map((threat) => threat.position);
      return {
        active: true,
        detail: "粉色碎片会让无损合约失败，先读危险线再切入。",
        kind: "avoidHazard",
        progress,
        targets: nearTargets.length > 0 ? nearTargets : fallbackTargets,
        title: "合约目标：无损救援",
        urgent: nearTargets.length > 0
      };
    }
    case "stormSkipper": {
      const stormTargets = state.storms.map((storm) => storm.position);
      const inStorm = state.storms.some((storm) => distance(storm.position, player) < getStormActiveRadius(storm));
      return {
        active: stormTargets.length > 0,
        detail: "紫色风暴会计入停留时间，绕开后再修复。",
        kind: "avoidStorm",
        progress,
        targets: stormTargets,
        title: "合约目标：风暴掠行",
        urgent: inStorm || deltas.stormSeconds > 0.55
      };
    }
    case "pulseDiscipline": {
      const targetThreats = threats.filter((threat) => threat.level !== "safe").slice(0, 2);
      const fallbackTargets = threats.slice(0, 2);
      return {
        active: true,
        detail: "把脉冲留给最后关头，用走位和推进处理碎片。",
        kind: "conservePulse",
        progress,
        targets: (targetThreats.length > 0 ? targetThreats : fallbackTargets).map((threat) => threat.position),
        title: "合约目标：脉冲节律",
        urgent: deltas.pulseUses >= 1 || targetThreats.some((threat) => threat.level === "danger")
      };
    }
  }
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

export function getSectorFor(wave: number, difficulty: DifficultyId): SectorId {
  const standardOrder: SectorId[] = ["outerRing", "crossCurrent", "southernArc", "stormSpine", "overclockCore"];
  if (difficulty === "hardcore") {
    const hardcoreOrder: SectorId[] = ["stormSpine", "overclockCore", "crossCurrent", "southernArc", "outerRing"];
    return hardcoreOrder[clampInt(wave - 1, 0, hardcoreOrder.length - 1)];
  }
  return standardOrder[clampInt(wave - 1, 0, standardOrder.length - 1)];
}

export function getRoutePlan(seed: number): RoutePlan {
  const normalized = normalizeRouteSeed(seed);
  const callsigns = ["青灯", "星桥", "夜航", "棱镜", "岚脊", "银弦", "金涌", "北针"];
  const traits = [
    "信标和补给会出现轻微偏航，适合重新规划开局路线。",
    "危险源有轻微漂移，维修窗口需要重新观察。",
    "补给航线会微调，连锁路线不会每局完全相同。",
    "风暴相位和资源点略有变化，适合复盘后再挑战。"
  ];
  const code = normalized.toString(36).toUpperCase().padStart(4, "0").slice(-4);
  const name = `${callsigns[normalized % callsigns.length]}-${code}`;
  return {
    seed: normalized,
    code,
    name,
    description: traits[Math.floor(normalized / callsigns.length) % traits.length]
  };
}

export function normalizeRouteSeed(seed: number): number {
  const normalized = Math.abs(Math.trunc(seed)) % 1679616;
  return normalized === 0 ? 1 : normalized;
}

export function parseRouteSeed(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value
    .toUpperCase()
    .replace(/^LD[-_]?/, "")
    .replace(/^[\u4E00-\u9FA5]+[-_]?/, "")
    .replace(/[^0-9A-Z]/g, "");
  if (!cleaned) return undefined;
  const parsed = Number.parseInt(cleaned, 36);
  return Number.isFinite(parsed) ? normalizeRouteSeed(parsed) : undefined;
}

export function getCoachDirective(state: GameState): CoachDirective {
  const totalSteps = 4;
  if (state.status !== "playing") {
    return {
      id: "readContract",
      step: 1,
      totalSteps,
      title: "救援简报",
      detail: "选择难度后，按“补流明、修信标、撤离、升级”的顺序完成一波救援。",
      progress: "准备开始",
      urgent: false
    };
  }

  const player = state.player;
  const nearestLumen = nearest(state.lumen.filter((drop) => !drop.collected), player.position);
  if (state.briefingActive) {
    return {
      id: "readContract",
      step: 1,
      totalSteps,
      title: "开局读图缓冲",
      detail: "先看本波区域、事件和战术合约；移动、修复、推进或脉冲后正式开始计时。",
      progress: "移动后正式开始",
      target: nearestLumen?.item.position ?? nearest(state.relays.filter((relay) => !relay.repaired), player.position)?.item.position,
      urgent: false
    };
  }
  const activeStorm = state.storms.find((storm) => distance(storm.position, player.position) < getStormActiveRadius(storm));
  if (activeStorm) {
    return {
      id: "escapeStorm",
      step: Math.max(1, Math.min(totalSteps, state.stats.relaysRepaired + 1)),
      totalSteps,
      title: "紧急：脱离风暴",
      detail: "紫色区域会快速吸走电量。先用推进离开范围，再回头继续修复。",
      progress: `风暴停留 ${state.stats.stormSeconds.toFixed(1)} 秒`,
      urgent: true
    };
  }

  const dangerThreat = getHazardThreats(state).find((threat) => threat.level === "danger");
  if (dangerThreat) {
    const ready = player.pulseCooldown <= 0;
    return {
      id: "pulseDanger",
      step: Math.max(1, Math.min(totalSteps, state.stats.relaysRepaired + 1)),
      totalSteps,
      title: ready ? "紧急：Q / 脉冲键" : "紧急：推进拉开距离",
      detail: ready ? "粉色碎片已经贴近，立刻释放脉冲把它推开。" : "脉冲还在冷却，先横向推进，别原地硬修。",
      progress: ready ? "脉冲就绪" : `脉冲冷却 ${Math.ceil(player.pulseCooldown)} 秒`,
      urgent: true
    };
  }

  if (player.charge < player.maxCharge * 0.28 && nearestLumen) {
    return {
      id: "recoverCharge",
      step: 1,
      totalSteps,
      title: "先补电",
      detail: "电量过低时不要硬修信标，先吃金色流明恢复操作空间。",
      progress: `电量 ${Math.ceil(player.charge)}/${player.maxCharge}`,
      target: nearestLumen.item.position,
      urgent: true
    };
  }

  if (state.gate.open) {
    return {
      id: "exitGate",
      step: 4,
      totalSteps,
      title: "第 4 步：撤离",
      detail: "所有蓝色信标已经稳定，冲进北侧光门完成本波。",
      progress: `距离光门 ${formatDistance(distance(player.position, state.gate.position))}`,
      target: state.gate.position,
      urgent: false
    };
  }

  const repairTarget = getActiveRepairTarget(state);
  if (repairTarget) {
    return {
      id: "repairRelay",
      step: 3,
      totalSteps,
      title: "第 3 步：按住 E / 修复键",
      detail: "留在蓝色信标旁保持维修光束；键盘按 E，触控按修复键，离开会慢慢掉进度。",
      progress: `维修进度 ${Math.round(repairTarget.progress * 100)}%`,
      target: repairTarget.position,
      urgent: true
    };
  }

  const currentContract = CONTRACTS[state.contract.id];
  const contractAge = state.elapsed - state.contract.startElapsed;
  if (state.wave > 1 && state.contract.status === "active" && contractAge < 7) {
    const routeTarget = nearestLumen?.item.position ?? nearest(state.relays.filter((relay) => !relay.repaired), player.position)?.item.position;
    return {
      id: "readContract",
      step: 1,
      totalSteps,
      title: `先读合约：${currentContract.name}`,
      detail: currentContract.requirement,
      progress: getContractProgressText(state),
      target: routeTarget,
      urgent: false
    };
  }

  const nearestRelay = nearest(state.relays.filter((relay) => !relay.repaired), player.position);
  if (nearestRelay && state.contract.status === "completed") {
    return {
      id: "reachRelay",
      step: 2,
      totalSteps,
      title: "合约完成：继续修信标",
      detail: "副目标奖励已经结算。现在回到主路线，靠近剩余蓝色信标并按住 E / 修复键。",
      progress: `已修复 ${state.stats.relaysRepaired}/${state.relays.length}`,
      target: nearestRelay.item.position,
      urgent: false
    };
  }

  if (nearestRelay && state.contract.status === "failed") {
    return {
      id: "reachRelay",
      step: 2,
      totalSteps,
      title: "主目标优先：继续修信标",
      detail: "本波合约已经失败，但主目标仍可完成。先清剩余信标，再从北侧光门撤离。",
      progress: `已修复 ${state.stats.relaysRepaired}/${state.relays.length}`,
      target: nearestRelay.item.position,
      urgent: false
    };
  }

  if (state.wave === 1 && state.stats.lumenCollected < 2 && nearestLumen) {
    return {
      id: "collectLumen",
      step: 1,
      totalSteps,
      title: "第 1 步：先捡 2 个流明",
      detail: "金色流明会补电，也会建立连锁倍率。新手先补给，再去修信标。",
      progress: `${Math.min(state.stats.lumenCollected, 2)}/2 流明`,
      target: nearestLumen.item.position,
      urgent: false
    };
  }

  if (nearestRelay) {
    return {
      id: "reachRelay",
      step: 2,
      totalSteps,
      title: "第 2 步：靠近蓝色信标",
      detail: "贴近信标后按住 E / 修复键，边看危险圈边修，不要站在碎片路径上。",
      progress: `已修复 ${state.stats.relaysRepaired}/${state.relays.length}`,
      target: nearestRelay.item.position,
      urgent: false
    };
  }

  if (nearestLumen) {
    return {
      id: "collectLumen",
      step: 1,
      totalSteps,
      title: "补给并保持连锁",
      detail: "剩余流明可以补电和提分，适合在撤离前顺路回收。",
      progress: `${state.stats.lumenCollected} 流明已回收`,
      target: nearestLumen.item.position,
      urgent: false
    };
  }

  return {
    id: "exitGate",
    step: 4,
    totalSteps,
    title: "寻找北侧光门",
    detail: "主目标完成后从北侧撤离，保留电量会提高结算评价。",
    progress: "撤离阶段",
    target: state.gate.position,
    urgent: false
  };
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
  if (state.briefingActive) {
    const firstTarget =
      nearest(state.lumen.filter((drop) => !drop.collected), player.position)?.item.position ??
      nearest(state.relays.filter((relay) => !relay.repaired), player.position)?.item.position;
    return {
      kind: "lumen",
      title: "先读图再出发",
      detail: "安全缓冲中：确认合约和第一条流明路线后再移动。",
      target: firstTarget,
      urgent: false
    };
  }
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
      title: "按住 E / 修复键",
      detail: `信标已锁定，当前进度 ${Math.round(repairTarget.progress * 100)}%。键盘按 E，触控按修复键，离开会慢慢掉进度。`,
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
  if (nearestRelay && state.contract.status === "completed") {
    return {
      kind: "relay",
      title: "合约已完成，去修信标",
      detail: `副目标奖励已结算。继续靠近蓝色信标，距离 ${formatDistance(nearestRelay.distance)}。`,
      target: nearestRelay.item.position,
      urgent: false
    };
  }
  if (nearestRelay && state.contract.status === "failed") {
    return {
      kind: "relay",
      title: "合约失败，清主目标",
      detail: `本波仍可过关。继续靠近蓝色信标，距离 ${formatDistance(nearestRelay.distance)}。`,
      target: nearestRelay.item.position,
      urgent: false
    };
  }
  if (state.wave === 1 && state.stats.lumenCollected < 2 && nearestLumen) {
    return {
      kind: "lumen",
      title: "先捡 2 个流明",
      detail: `金色流明会补电并建立连锁，最近流明距离 ${formatDistance(nearestLumen.distance)}。`,
      target: nearestLumen.item.position,
      urgent: false
    };
  }
  if (nearestRelay) {
    return {
      kind: "relay",
      title: "前往最近信标",
      detail: `靠近后按住 E / 修复键，距离 ${formatDistance(nearestRelay.distance)}。`,
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
    closeCalls: 0,
    stormSeconds: 0,
    repairSeconds: 0,
    distanceTraveled: 0,
    wavesCleared: 0
  };
}

function createRelays(sector: SectorId, routeSeed: number, wave: number): Relay[] {
  const salt = sectorSalt(sector) + 0x1000;
  return SECTOR_LAYOUTS[sector].relayPositions.map((position, id) => ({
    id,
    position: varyRoutePosition(position, routeSeed, wave, salt + id, 24),
    progress: 0,
    repaired: false
  }));
}

function createLumen(sector: SectorId, routeSeed: number, wave: number): Lumen[] {
  const salt = sectorSalt(sector) + 0x2000;
  return SECTOR_LAYOUTS[sector].lumenPositions.map((position, id) => ({
    id,
    position: varyRoutePosition(position, routeSeed, wave, salt + id, 30),
    collected: false
  }));
}

function createHazards(sector: SectorId, routeSeed: number, wave: number): Hazard[] {
  const salt = sectorSalt(sector) + 0x3000;
  return SECTOR_LAYOUTS[sector].hazards.map((hazard) => ({
    ...hazard,
    position: varyRoutePosition(hazard.position, routeSeed, wave, salt + hazard.id, 34),
    velocity: varyRouteVelocity(hazard.velocity, routeSeed, wave, salt + hazard.id)
  }));
}

function applySectorLayout(state: GameState): void {
  const layout = SECTOR_LAYOUTS[state.sector];
  state.relays = createRelays(state.sector, state.routeSeed, state.wave);
  state.lumen = createLumen(state.sector, state.routeSeed, state.wave);
  state.hazards = createHazards(state.sector, state.routeSeed, state.wave);
  state.storms = [];
  const gatePosition = varyRoutePosition(layout.gatePosition, state.routeSeed, state.wave, sectorSalt(state.sector) + 0x4000, 24);
  state.gate = { position: { x: clamp(gatePosition.x, 430, 570), y: layout.gatePosition.y }, open: false };
}

function createStorms(wave: number, difficulty: DifficultyId, sector: SectorId, routeSeed: number): Storm[] {
  const baseStorms = SECTOR_LAYOUTS[sector].storms;
  const stormCount = clampInt(Math.ceil(wave / 2) + DIFFICULTY_SETTINGS[difficulty].stormBonus, 0, baseStorms.length);
  const salt = sectorSalt(sector) + 0x5000;
  return baseStorms.slice(0, stormCount).map((storm) => ({
    ...storm,
    position: varyRoutePosition(storm.position, routeSeed, wave, salt + storm.id, 24),
    phase: storm.phase + routeNoise(routeSeed, wave, salt + storm.id + 101) * Math.PI * 0.65
  }));
}

function createRouteSeed(): number {
  const timePart = Date.now() % 1679616;
  const randomPart = Math.floor(Math.random() * 1679616);
  return normalizeRouteSeed(timePart ^ randomPart);
}

function varyRoutePosition(position: Vec2, routeSeed: number, wave: number, salt: number, amount: number): Vec2 {
  if (routeSeed <= 0) return { ...position };
  const offsetX = (routeNoise(routeSeed, wave, salt) - 0.5) * amount * 2;
  const offsetY = (routeNoise(routeSeed, wave, salt + 97) - 0.5) * amount * 2;
  return {
    x: clamp(position.x + offsetX, 92, 908),
    y: clamp(position.y + offsetY, 96, 646)
  };
}

function varyRouteVelocity(velocity: Vec2, routeSeed: number, wave: number, salt: number): Vec2 {
  if (routeSeed <= 0) return { ...velocity };
  const scale = 0.92 + routeNoise(routeSeed, wave, salt + 211) * 0.16;
  const trimX = (routeNoise(routeSeed, wave, salt + 233) - 0.5) * 12;
  const trimY = (routeNoise(routeSeed, wave, salt + 251) - 0.5) * 12;
  return {
    x: (velocity.x + trimX) * scale,
    y: (velocity.y + trimY) * scale
  };
}

function routeNoise(seed: number, wave: number, salt: number): number {
  let value = (normalizeRouteSeed(seed) ^ Math.imul(wave + 11, 374761393) ^ Math.imul(salt + 17, 668265263)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 2246822519);
  value = Math.imul(value ^ (value >>> 13), 3266489917);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function sectorSalt(sector: SectorId): number {
  const order: SectorId[] = ["outerRing", "crossCurrent", "southernArc", "stormSpine", "overclockCore"];
  return (order.indexOf(sector) + 1) * 4096;
}

function awardScore(state: GameState, base: number, comboGain: number): void {
  state.combo = Math.min(5, state.combo + comboGain);
  state.comboTimer = COMBO_WINDOW_SECONDS;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.score += Math.round(
    base *
      state.combo *
      DIFFICULTY_SETTINGS[state.difficulty].scoreScale *
      (1 + WAVE_MODIFIERS[state.waveModifier].scoreBonus)
  );
}

function updateCloseCall(state: GameState, hazard: Hazard, hazardDistance: number, collisionRadius: number): void {
  const closeCallRadius = collisionRadius + HAZARD_CLOSE_CALL_BUFFER;
  const escapeRadius = collisionRadius + HAZARD_CLOSE_CALL_ESCAPE_BUFFER;

  if (state.player.invulnerable > 0) {
    hazard.closeCallArmed = false;
    return;
  }

  if (hazard.closeCallArmed) {
    hazard.closeCallClosest = Math.min(hazard.closeCallClosest ?? hazardDistance, hazardDistance);
    if (hazardDistance >= escapeRadius) {
      const closest = hazard.closeCallClosest ?? closeCallRadius;
      const tightness = Math.max(0, closeCallRadius - closest);
      const score = 90 + Math.round(tightness * 0.9);
      hazard.closeCallArmed = false;
      hazard.closeCallCooldown = 1.45;
      hazard.closeCallClosest = undefined;
      state.stats.closeCalls += 1;
      awardScore(state, score, 0.22);
      state.shake = Math.max(state.shake, 0.08);
      state.message = `擦险脱离，贴着碎片线安全穿出，${formatCombo(state.combo)} 连锁。`;
    }
    return;
  }

  if ((hazard.closeCallCooldown ?? 0) <= 0 && hazardDistance <= closeCallRadius) {
    hazard.closeCallArmed = true;
    hazard.closeCallClosest = hazardDistance;
  }
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
    closeCalls: state.stats.closeCalls - state.contract.startStats.closeCalls,
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
