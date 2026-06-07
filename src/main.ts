import Phaser from "phaser";
import { GameScene } from "./game/GameScene";
import {
  ACHIEVEMENTS,
  CAMPAIGN_WAVES,
  CONTRACTS,
  DIFFICULTY_SETTINGS,
  SECTOR_LAYOUTS,
  UPGRADE_CATALOG,
  WAVE_MODIFIERS,
  getAchievementSummaries,
  getContractFor,
  getRoutePlan,
  getSectorFor,
  getUnlockedAchievementsForRun,
  getWaveModifierFor,
  parseRouteSeed,
  type AchievementId,
  type CoachDirective,
  type ContractSnapshot,
  type DifficultyId,
  type GameStatus,
  type ObjectiveHint,
  type ResourceAlerts,
  type RoutePlan,
  type RunPerformance,
  type RunEndReason,
  type RunRating,
  type RunStats,
  type SectorLayout,
  type Upgrade,
  type UpgradeId,
  type UpgradeSummary,
  type WaveModifier
} from "./game/simulation";
import "./styles.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-wrap",
  backgroundColor: "#070910",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  scene: [GameScene]
};

new Phaser.Game(config);

const gameWrap = document.querySelector<HTMLElement>("#game-wrap")!;
const shell = document.querySelector<HTMLDivElement>("#shell")!;
const bootStatus = document.querySelector<HTMLDivElement>("#boot-status");
const overlay = document.querySelector<HTMLDivElement>("#overlay")!;
const overlayPanel = overlay.querySelector<HTMLDivElement>(".panel")!;
const hud = document.querySelector<HTMLElement>("#hud")!;
const objectiveTitle = document.querySelector<HTMLElement>("#objective-title")!;
const objectiveDetail = document.querySelector<HTMLElement>("#objective-detail")!;
const waveIntro = document.querySelector<HTMLDivElement>("#wave-intro")!;
const waveIntroTitle = document.querySelector<HTMLElement>("#wave-intro-title")!;
const waveIntroDetail = document.querySelector<HTMLElement>("#wave-intro-detail")!;
const waveIntroContract = document.querySelector<HTMLElement>("#wave-intro-contract")!;
const missionToast = document.querySelector<HTMLDivElement>("#mission-toast")!;
const missionToastTitle = document.querySelector<HTMLElement>("#mission-toast-title")!;
const missionToastDetail = document.querySelector<HTMLElement>("#mission-toast-detail")!;
const combatLog = document.querySelector<HTMLDivElement>("#combat-log")!;
const combatLogTitle = document.querySelector<HTMLElement>("#combat-log-title")!;
const combatLogDetail = document.querySelector<HTMLElement>("#combat-log-detail")!;
const combatLogHistory = document.querySelector<HTMLOListElement>("#combat-log-history")!;
const startButton = document.querySelector<HTMLButtonElement>("#start-button")!;
const sessionTools = document.querySelector<HTMLDivElement>("#session-tools")!;
const copyRouteButton = document.querySelector<HTMLButtonElement>("#copy-route-button")!;
const restartRouteButton = document.querySelector<HTMLButtonElement>("#restart-route-button")!;
const motionToggle = document.querySelector<HTMLButtonElement>("#motion-toggle")!;
const labelToggle = document.querySelector<HTMLButtonElement>("#label-toggle")!;
const resetSaveButton = document.querySelector<HTMLButtonElement>("#reset-save-button")!;
const sessionFeedback = document.querySelector<HTMLElement>("#session-feedback")!;
const chargeFill = document.querySelector<HTMLElement>("#charge-fill")!;
const hullFill = document.querySelector<HTMLElement>("#hull-fill")!;
const chargeValue = document.querySelector<HTMLElement>("#charge-value")!;
const hullValue = document.querySelector<HTMLElement>("#hull-value")!;
const chargeMeter = chargeFill.parentElement as HTMLDivElement;
const hullMeter = hullFill.parentElement as HTMLDivElement;
const relayValue = document.querySelector<HTMLElement>("#relay-value")!;
const lumenValue = document.querySelector<HTMLElement>("#lumen-value")!;
const waveValue = document.querySelector<HTMLElement>("#wave-value")!;
const scoreValue = document.querySelector<HTMLElement>("#score-value")!;
const comboValue = document.querySelector<HTMLElement>("#combo-value")!;
const bestComboValue = document.querySelector<HTMLElement>("#best-combo-value")!;
const recordScore = document.querySelector<HTMLElement>("#record-score")!;
const recordWave = document.querySelector<HTMLElement>("#record-wave")!;
const recordCombo = document.querySelector<HTMLElement>("#record-combo")!;
const recordContracts = document.querySelector<HTMLElement>("#record-contracts")!;
const boostPill = document.querySelector<HTMLElement>("#boost-pill")!;
const pulsePill = document.querySelector<HTMLElement>("#pulse-pill")!;
const comboTimer = document.querySelector<HTMLDivElement>("#combo-timer")!;
const comboTimerValue = document.querySelector<HTMLElement>("#combo-timer-value")!;
const comboTimerFill = document.querySelector<HTMLElement>("#combo-timer-fill")!;
const signalPanel = document.querySelector<HTMLDivElement>("#signal-panel")!;
const signalGrade = document.querySelector<HTMLElement>("#signal-grade")!;
const signalPoints = document.querySelector<HTMLElement>("#signal-points")!;
const signalFill = document.querySelector<HTMLElement>("#signal-fill")!;
const signalDetail = document.querySelector<HTMLElement>("#signal-detail")!;
const loadoutStrip = document.querySelector<HTMLDivElement>("#loadout-strip")!;
const waveEvent = document.querySelector<HTMLDivElement>("#wave-event")!;
const waveEventTitle = document.querySelector<HTMLElement>("#wave-event-title")!;
const waveEventDetail = document.querySelector<HTMLElement>("#wave-event-detail")!;
const contractPanel = document.querySelector<HTMLDivElement>("#contract-panel")!;
const contractTitle = document.querySelector<HTMLElement>("#contract-title")!;
const contractRequirement = document.querySelector<HTMLElement>("#contract-requirement")!;
const contractProgress = document.querySelector<HTMLElement>("#contract-progress")!;
const contractReward = document.querySelector<HTMLElement>("#contract-reward")!;
const coachPanel = document.querySelector<HTMLDivElement>("#coach-panel")!;
const coachTitle = document.querySelector<HTMLElement>("#coach-title")!;
const coachStep = document.querySelector<HTMLElement>("#coach-step")!;
const coachRail = document.querySelector<HTMLDivElement>("#coach-rail")!;
const coachDetail = document.querySelector<HTMLElement>("#coach-detail")!;
const coachProgress = document.querySelector<HTMLElement>("#coach-progress")!;
const pilotTip = document.querySelector<HTMLDivElement>("#pilot-tip")!;
const pilotTipTitle = document.querySelector<HTMLElement>("#pilot-tip-title")!;
const pilotTipDetail = document.querySelector<HTMLElement>("#pilot-tip-detail")!;
const missionText = document.querySelector<HTMLElement>("#mission-text")!;
const radarPanel = document.querySelector<HTMLDivElement>("#radar-panel")!;
const radarSummary = document.querySelector<HTMLElement>("#radar-summary")!;
const radarMap = document.querySelector<SVGSVGElement>("#radar-map")!;
const upgradeChoices = document.querySelector<HTMLDivElement>("#upgrade-choices")!;
const helpButton = document.querySelector<HTMLButtonElement>("#help-button")!;
const mobilePauseButton = document.querySelector<HTMLButtonElement>("#mobile-pause-button")!;
const resumeButton = document.querySelector<HTMLButtonElement>("#resume-button")!;
const difficultyPicker = document.querySelector<HTMLDivElement>("#difficulty-picker")!;
const difficultyButtons = document.querySelectorAll<HTMLButtonElement>("[data-difficulty]");
const difficultyDetail = document.querySelector<HTMLElement>("#difficulty-detail")!;
const achievementStrip = document.querySelector<HTMLDivElement>("#achievement-strip")!;
const runHistory = document.querySelector<HTMLDivElement>("#run-history")!;
const audioToggle = document.querySelector<HTMLButtonElement>("#audio-toggle")!;
const dailyRouteButton = document.querySelector<HTMLButtonElement>("#daily-route-button")!;
const dailyDetail = document.querySelector<HTMLElement>("#daily-detail")!;
const overlayEyebrow = overlay.querySelector<HTMLElement>(".eyebrow")!;
const overlayTitle = overlay.querySelector<HTMLElement>("h1")!;
const overlayCopy = overlay.querySelector<HTMLElement>("p")!;
const quickBrief = document.querySelector<HTMLDivElement>("#quick-brief")!;
const controlPrimer = document.querySelector<HTMLDivElement>("#control-primer")!;
const loopPrimer = document.querySelector<HTMLDivElement>("#loop-primer")!;
const gameDossier = document.querySelector<HTMLDivElement>("#game-dossier")!;
const launchBrief = document.querySelector<HTMLDivElement>("#launch-brief")!;
const firstMinuteRoute = document.querySelector<HTMLDivElement>("#first-minute-route")!;
const launchCommit = document.querySelector<HTMLDivElement>("#launch-commit")!;
const missionBrief = document.querySelector<HTMLDivElement>("#mission-brief")!;
const fieldGuide = document.querySelector<HTMLDivElement>("#field-guide")!;
const tacticalScan = document.querySelector<HTMLDivElement>("#tactical-scan")!;
const tacticalScanSummary = document.querySelector<HTMLElement>("#tactical-scan-summary")!;
const tacticalScanMap = document.querySelector<SVGSVGElement>("#tactical-scan-map")!;
const howToPlay = document.querySelector<HTMLDivElement>("#how-to-play")!;
const nextRunPanel = document.querySelector<HTMLDivElement>("#next-run-panel")!;
const nextRunTitle = document.querySelector<HTMLElement>("#next-run-title")!;
const nextRunFocus = document.querySelector<HTMLElement>("#next-run-focus")!;
const nextRunGoals = document.querySelector<HTMLDivElement>("#next-run-goals")!;
const runRecap = document.querySelector<HTMLDivElement>("#run-recap")!;
const recapRating = document.querySelector<HTMLDivElement>("#recap-rating")!;
const recapRatingGrade = document.querySelector<HTMLElement>("#recap-rating-grade")!;
const recapRatingName = document.querySelector<HTMLElement>("#recap-rating-name")!;
const recapRatingDetail = document.querySelector<HTMLElement>("#recap-rating-detail")!;
const contractRecap = document.querySelector<HTMLDivElement>("#contract-recap")!;
const contractRecapTitle = document.querySelector<HTMLElement>("#contract-recap-title")!;
const contractRecapDetail = document.querySelector<HTMLElement>("#contract-recap-detail")!;
const recapMetrics = document.querySelector<HTMLDivElement>("#recap-metrics")!;
const recapActionPlan = document.querySelector<HTMLDivElement>("#recap-action-plan")!;
const achievementUnlocks = document.querySelector<HTMLDivElement>("#achievement-unlocks")!;
const recapAdvice = document.querySelector<HTMLElement>("#recap-advice")!;
const touchStick = document.querySelector<HTMLDivElement>("#touch-stick")!;
const touchStickKnob = document.querySelector<HTMLSpanElement>("#touch-stick span")!;
const touchButtons = document.querySelectorAll<HTMLButtonElement>("[data-touch-action]");
const STORAGE_KEY = "lumen-drift-save-v1";

type MissionToastTone = "danger" | "primary" | "success" | "warning";
type CombatLogTone = MissionToastTone;

type CombatLogEntry = {
  detail: string;
  title: string;
  tone: CombatLogTone;
};

type SaveData = {
  achievements: AchievementId[];
  audioEnabled: boolean;
  bestCombo: number;
  bestContracts: number;
  bestScore: number;
  bestWave: number;
  clears: number;
  dailyBest?: DailyBestEntry;
  largeLabels: boolean;
  reducedMotion: boolean;
  runHistory: RunHistoryEntry[];
  selectedDifficulty: DifficultyId;
  totalContracts: number;
};

type DailyBestEntry = {
  key: string;
  difficulty: DifficultyId;
  elapsed: number;
  ratingId: RunRating["id"];
  ratingName: string;
  routeName: string;
  routeSeed: number;
  score: number;
  timestamp: number;
  wave: number;
};

type RunHistoryEntry = {
  id: string;
  bestCombo: number;
  contractStatus: ContractSnapshot["status"];
  contractsCompleted: number;
  difficulty: DifficultyId;
  elapsed: number;
  ratingId: RunRating["id"];
  ratingName: string;
  routeSeed: number;
  routeName: string;
  score: number;
  status: RunEndDetail["status"];
  timestamp: number;
  wave: number;
};

type NextRunGoal = {
  label: string;
  text: string;
  tone: "primary" | "steady" | "warning" | "complete";
};

type RecapPlanStep = {
  detail: string;
  label: string;
  title: string;
  tone: "primary" | "steady" | "warning" | "complete";
};

type UpgradeRecommendation = {
  id: UpgradeId;
  label: string;
  reason: string;
};

type UpgradeForecast = {
  contractName: string;
  contractRequirement: string;
  eventBriefing: string;
  eventName: string;
  sectorBriefing: string;
  sectorName: string;
  wave: number;
  totalWaves: number;
};

type RadarSnapshot = {
  arena: { width: number; height: number };
  gate: { open: boolean; position: { x: number; y: number } };
  guide?: {
    kind: "gate" | "lumen" | "relay" | "repair";
    position: { x: number; y: number };
    title: string;
    urgent: boolean;
  };
  hazards: Array<{ id: number; position: { x: number; y: number }; radius: number }>;
  lumen: Array<{ collected: boolean; id: number; position: { x: number; y: number } }>;
  player: { position: { x: number; y: number } };
  relays: Array<{ id: number; position: { x: number; y: number }; progress: number; repaired: boolean }>;
  storms: Array<{ activeRadius: number; id: number; position: { x: number; y: number }; radius: number }>;
};

const COACH_STEP_LABELS = ["补流明", "找信标", "按住维修", "撤离"] as const;
let coachRailItems: HTMLSpanElement[] = [];

type RunEndDetail = {
  bestCombo: number;
  campaignStats: RunStats;
  charge: number;
  contract: ContractSnapshot;
  difficulty: DifficultyId;
  elapsed: number;
  endReason: RunEndReason;
  hull: number;
  message: string;
  rating: RunRating;
  routePlan: RoutePlan;
  score: number;
  sector: SectorLayout;
  stats: RunStats;
  status: "won" | "completed" | "lost";
  wave: number;
  waveModifier: WaveModifier;
};

let latestUpgradeChoices: Upgrade[] = [];
let latestUpgradeSummaries: UpgradeSummary[] = [];
let latestEndDetail: RunEndDetail | undefined;
let latestStatus: GameStatus = "menu";
let latestScore = 0;
let latestWave = 1;
let latestBestCombo = 1;
let latestDifficulty: DifficultyId = "standard";
let latestRadarSnapshot: RadarSnapshot | undefined;
let latestRoutePlan: RoutePlan | undefined;
let saveData = loadSave();
let selectedDifficulty: DifficultyId = saveData.selectedDifficulty;
let audioBus: AudioBus;
let resetSaveArmed = false;
let resetSaveTimer: number | undefined;
let latestWaveIntroKey = "";
let waveIntroExpiresAt = 0;
let waveIntroTimer: number | undefined;
let latestMissionToastKey = "";
let missionToastTimer: number | undefined;
let combatLogTimer: number | undefined;
let combatLogEntries: CombatLogEntry[] = [];
const COMBAT_LOG_HISTORY_LIMIT = 3;

window.__lumenVirtualInput = {
  move: { x: 0, y: 0 },
  boost: false,
  repair: false,
  pulse: false,
  tap: { boost: 0, repair: 0, pulse: 0 }
};
window.__lumenSettings = {
  largeLabels: saveData.largeLabels,
  reducedMotion: saveData.reducedMotion
};

startButton.addEventListener("click", () => {
  launchRun();
});

resumeButton.addEventListener("click", () => {
  audioBus.play("button");
  overlay.classList.remove("show");
  hideTacticalScan();
  disarmResetSave();
  window.dispatchEvent(new CustomEvent("game:resume"));
  focusGameSurface();
});

gameWrap.addEventListener("pointerdown", () => {
  if (latestStatus === "playing") {
    focusGameSurface();
  }
});

helpButton.addEventListener("click", () => {
  audioBus.play("button");
  resetVirtualInput();
  showHelpOverlay();
});

mobilePauseButton.addEventListener("click", () => {
  audioBus.play("button");
  resetVirtualInput();
  showHelpOverlay();
});

difficultyButtons.forEach((button) => {
  const difficulty = button.dataset.difficulty as DifficultyId;
  button.addEventListener("click", () => {
    selectedDifficulty = difficulty;
    saveData.selectedDifficulty = selectedDifficulty;
    saveSave(saveData);
    updateDifficultyUi();
    audioBus.play("button");
  });
});

audioToggle.addEventListener("click", () => {
  saveData.audioEnabled = !saveData.audioEnabled;
  saveSave(saveData);
  updateAudioUi();
  if (saveData.audioEnabled) {
    void audioBus.unlock();
    audioBus.play("button");
  }
});

motionToggle.addEventListener("click", () => {
  saveData.reducedMotion = !saveData.reducedMotion;
  saveSave(saveData);
  updateSettingsUi("设置已保存：精简动效会关闭抖动和粒子尾迹。");
  audioBus.play("button");
});

labelToggle.addEventListener("click", () => {
  saveData.largeLabels = !saveData.largeLabels;
  saveSave(saveData);
  updateSettingsUi("设置已保存：画布标签和关键信息会更醒目。");
  audioBus.play("button");
});

dailyRouteButton.addEventListener("click", () => {
  launchDailyChallenge();
});

copyRouteButton.addEventListener("click", () => {
  audioBus.play("button");
  void copyRouteLink();
});

restartRouteButton.addEventListener("click", () => {
  if (!latestRoutePlan) return;
  audioBus.play("start");
  disarmResetSave();
  overlay.classList.remove("show");
  hideTacticalScan();
  runRecap.hidden = true;
  achievementUnlocks.hidden = true;
  upgradeChoices.hidden = true;
  window.dispatchEvent(
    new CustomEvent("game:start", {
      detail: { difficulty: latestDifficulty, routeSeed: latestRoutePlan.seed }
    })
  );
});

resetSaveButton.addEventListener("click", () => {
  audioBus.play("button");
  if (!resetSaveArmed) {
    armResetSave();
    return;
  }
  saveData = createDefaultSave();
  selectedDifficulty = saveData.selectedDifficulty;
  saveSave(saveData);
  updateAudioUi();
  updateSettingsUi();
  updateDifficultyUi();
  updateRecordUi();
  updateAchievementUi();
  updateRunHistoryUi();
  updateNextRunPanel();
  disarmResetSave();
  setSessionFeedback("本地存档已清空。");
});

function launchRun(upgradeId?: UpgradeId): void {
  void audioBus.unlock();
  audioBus.play("start");
  overlay.classList.remove("show");
  hideTacticalScan();
  latestWaveIntroKey = "";
  latestMissionToastKey = "";
  hideMissionToast(true);
  hideCombatLog(true);
  hideWaveIntro(true);
  disarmResetSave();
  runRecap.hidden = true;
  achievementUnlocks.hidden = true;
  upgradeChoices.hidden = true;
  latestEndDetail = undefined;
  const runDifficulty = latestStatus === "won" ? latestDifficulty : selectedDifficulty;
  const routeSeed = latestStatus === "won" ? undefined : getRequestedRouteSeed();
  window.dispatchEvent(new CustomEvent("game:start", { detail: { difficulty: runDifficulty, routeSeed, upgradeId } }));
  focusGameSurface();
}

function launchDailyChallenge(): void {
  const daily = getDailyChallenge();
  void audioBus.unlock();
  audioBus.play("start");
  latestDifficulty = selectedDifficulty;
  saveData.selectedDifficulty = selectedDifficulty;
  saveSave(saveData);
  updateDifficultyUi();
  overlay.classList.remove("show");
  hideTacticalScan();
  latestWaveIntroKey = "";
  latestMissionToastKey = "";
  hideMissionToast(true);
  hideCombatLog(true);
  hideWaveIntro(true);
  disarmResetSave();
  runRecap.hidden = true;
  achievementUnlocks.hidden = true;
  upgradeChoices.hidden = true;
  latestEndDetail = undefined;
  window.dispatchEvent(
    new CustomEvent("game:start", {
      detail: { difficulty: selectedDifficulty, routeSeed: daily.seed }
    })
  );
  focusGameSurface();
}

function focusGameSurface(): void {
  const focus = () => {
    gameWrap.focus({ preventScroll: true });
  };
  focus();
  window.requestAnimationFrame(focus);
  window.setTimeout(focus, 80);
}

window.addEventListener("game:hud", (event) => {
  const detail = (event as CustomEvent).detail as {
    charge: number;
    hull: number;
    maxHull: number;
    maxCharge: number;
    relays: string;
    lumen: number;
    wave: number;
    score: number;
    combo: number;
    comboTimer: number;
    comboWindow: number;
    bestCombo: number;
    boostReady: boolean;
    pulseReady: boolean;
    message: string;
    contract: ContractSnapshot;
    performance: RunPerformance;
    briefingActive: boolean;
    coachDirective: CoachDirective;
    objectiveHint: ObjectiveHint;
    resourceAlerts: ResourceAlerts;
    radar: RadarSnapshot;
    routePlan: RoutePlan;
    difficulty: DifficultyId;
    campaignWaves: number;
    status: GameStatus;
    waveModifier: WaveModifier;
    sector: SectorLayout;
    upgradeSummaries: UpgradeSummary[];
    upgradeChoices: Upgrade[];
  };

  latestStatus = detail.status;
  setShellStatus(detail.status);
  setShellBriefingActive(detail.status === "playing" && detail.briefingActive);
  latestScore = detail.score;
  latestWave = detail.wave;
  latestBestCombo = detail.bestCombo;
  latestDifficulty = detail.difficulty;
  latestRoutePlan = detail.routePlan;
  latestRadarSnapshot = detail.radar;
  if (detail.status !== "playing") {
    hideCombatLog(true);
  }
  chargeFill.style.width = `${ratio(detail.charge, detail.maxCharge)}%`;
  hullFill.style.width = `${ratio(detail.hull, detail.maxHull)}%`;
  chargeMeter.dataset.alert = detail.resourceAlerts.charge;
  hullMeter.dataset.alert = detail.resourceAlerts.hull;
  chargeValue.textContent = String(Math.ceil(detail.charge));
  hullValue.textContent = String(Math.ceil(detail.hull));
  relayValue.textContent = detail.relays;
  lumenValue.textContent = String(detail.lumen);
  waveValue.textContent = String(detail.wave);
  scoreValue.textContent = detail.score.toLocaleString();
  comboValue.textContent = `${detail.combo.toFixed(1)}x`;
  bestComboValue.textContent = `${detail.bestCombo.toFixed(1)}x`;
  renderComboTimer(detail.combo, detail.comboTimer, detail.comboWindow, detail.status);
  boostPill.textContent = detail.boostReady ? "推进就绪" : "推进冷却中";
  pulsePill.textContent = detail.pulseReady ? "脉冲就绪" : "脉冲冷却中";
  boostPill.classList.toggle("cooling", !detail.boostReady);
  pulsePill.classList.toggle("cooling", !detail.pulseReady);
  renderPerformance(detail.performance, detail.status);
  latestUpgradeSummaries = detail.upgradeSummaries;
  renderLoadout(detail.upgradeSummaries, detail.status);
  waveEvent.hidden = detail.status !== "playing";
  waveEventTitle.textContent = `本波事件：${detail.waveModifier.name}`;
  waveEventDetail.textContent = detail.waveModifier.description;
  contractPanel.hidden = detail.status !== "playing";
  contractPanel.dataset.status = detail.contract.status;
  contractTitle.textContent = `战术合约：${detail.contract.name}`;
  contractRequirement.textContent = detail.contract.requirement;
  contractProgress.textContent = detail.contract.progress;
  contractReward.textContent = `奖励 ${detail.contract.rewardScore.toLocaleString()} 分`;
  renderCoachDirective(detail.coachDirective, detail.status);
  renderRadar(detail.radar, detail.status);
  const showPilotTip = detail.status === "playing" && detail.coachDirective.id === "readContract";
  pilotTip.hidden = !showPilotTip;
  pilotTip.classList.toggle("urgent", detail.objectiveHint.urgent);
  pilotTip.dataset.kind = detail.objectiveHint.kind;
  pilotTipTitle.textContent = detail.objectiveHint.title;
  pilotTipDetail.textContent = detail.objectiveHint.detail;
  missionText.textContent = buildMissionStatusText(detail.message, detail.objectiveHint);
  objectiveTitle.textContent = buildObjectiveStripTitle(detail.objectiveHint);
  objectiveDetail.textContent = buildObjectiveStripDetail(detail);
  updateWaveIntro(detail);
  renderMissionToast(detail);
  latestUpgradeChoices = detail.upgradeChoices;
});

window.addEventListener("game:ended", (event) => {
  const detail = (event as CustomEvent).detail as RunEndDetail;
  latestStatus = detail.status;
  setShellStatus(detail.status);
  setShellBriefingActive(false);
  latestScore = detail.score;
  latestWave = detail.wave;
  latestBestCombo = detail.bestCombo;
  latestDifficulty = detail.difficulty;
  latestRoutePlan = detail.routePlan;
  latestEndDetail = detail;
  const newlyUnlocked = persistRunResult(detail);
  overlay.classList.add("show");
  hideTacticalScan();
  hideMissionToast(true);
  hideCombatLog(true);
  hideWaveIntro(true);
  howToPlay.hidden = true;
  achievementStrip.hidden = true;
  runHistory.hidden = false;
  setDifficultyPickerVisible(detail.status !== "won");
  resumeButton.hidden = true;
  startButton.hidden = false;
  overlayEyebrow.textContent =
    detail.status === "completed" ? "全域稳定" : detail.status === "won" ? "救援成功" : "救援失败";
  overlayTitle.textContent =
    detail.status === "completed" ? "五波完成" : detail.status === "won" ? "光网稳定" : "信号中断";
  overlayCopy.textContent = buildRunEndCopy(detail);
  quickBrief.hidden = true;
  controlPrimer.hidden = true;
  loopPrimer.hidden = true;
  gameDossier.hidden = true;
  launchBrief.hidden = true;
  firstMinuteRoute.hidden = true;
  launchCommit.hidden = true;
  missionBrief.hidden = true;
  fieldGuide.hidden = true;
  renderRunRecap(detail, newlyUnlocked);
  updateNextRunPanel(detail);
  updateSessionTools();
  startButton.textContent =
    detail.status === "completed" ? "再次救援" : detail.status === "won" ? "不升级，进入下一波" : "重新救援";
  startButton.hidden = detail.status === "won";
  upgradeChoices.hidden = detail.status !== "won";
  if (detail.status === "won") {
    renderUpgradeChoices(detail);
  }
});

window.addEventListener("game:feedback", (event) => {
  const detail = (event as CustomEvent).detail as {
    detail?: string;
    kind: SoundKind;
    title?: string;
    tone?: CombatLogTone;
  };
  audioBus.play(detail.kind);
  if (detail.title && detail.detail) {
    showCombatLog(detail.title, detail.detail, detail.tone ?? feedbackToneFor(detail.kind));
  }
});

function renderUpgradeChoices(detail = latestEndDetail): void {
  const choices = latestUpgradeChoices.length > 0 ? latestUpgradeChoices : Object.values(UPGRADE_CATALOG).slice(0, 3);
  const summaries = new Map(latestUpgradeSummaries.map((summary) => [summary.id, summary]));
  const recommendation = detail ? buildUpgradeRecommendation(detail, choices) : undefined;
  const forecast = detail ? buildUpgradeForecast(detail) : undefined;
  const header = document.createElement("div");
  header.className = "upgrade-brief";
  const headerTitle = document.createElement("strong");
  const headerDetail = document.createElement("span");
  headerTitle.textContent = recommendation
    ? `升级建议：优先 ${UPGRADE_CATALOG[recommendation.id].name}`
    : "选择一项改装";
  headerDetail.textContent = recommendation
    ? `短板原因：${recommendation.reason}`
    : "根据下一波风险选择改装；每项都会显示升级前和升级后收益。";
  header.append(headerTitle, headerDetail);
  if (forecast) {
    header.append(createUpgradeForecastNode(forecast));
  }
  const optionNodes = choices.map((choice) => {
      const summary = summaries.get(choice.id);
      const recommended = recommendation?.id === choice.id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-option";
      button.dataset.recommended = String(recommended);
      button.innerHTML = `
        <strong>${choice.name} <small>等级 ${summary?.level ?? 0}/${summary?.maxLevel ?? 3}</small></strong>
        <span class="upgrade-tag">${recommended && recommendation ? `系统推荐 · ${recommendation.label}` : getUpgradeRoleLabel(choice.id)}</span>
        <span>${choice.description}</span>
        <em>选择理由：${recommended && recommendation ? recommendation.reason : getUpgradeChoiceReason(choice.id)}</em>
        <em>升级前：${summary?.currentEffect ?? "基础配置"}</em>
        <em>升级后：${summary?.nextEffect ?? "已满级"}</em>
      `;
      button.addEventListener("click", () => launchRun(choice.id));
      return button;
    });
  const skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "upgrade-skip";
  skipButton.textContent = "暂不升级，直接进入下一波";
  skipButton.addEventListener("click", () => launchRun());
  upgradeChoices.replaceChildren(header, ...optionNodes, skipButton);
}

function renderLoadout(summaries: UpgradeSummary[], status: GameStatus): void {
  loadoutStrip.hidden = status === "menu";
  if (loadoutStrip.hidden) return;
  loadoutStrip.replaceChildren(
    ...summaries.map((summary) => {
      const item = document.createElement("span");
      item.title = `${summary.name}: ${summary.currentEffect}`;
      item.textContent = `${shortUpgradeName(summary.id)} ${summary.level}/${summary.maxLevel}`;
      item.classList.toggle("active", summary.level > 0);
      return item;
    })
  );
}

function renderPerformance(performance: RunPerformance, status: GameStatus): void {
  signalPanel.hidden = status !== "playing";
  if (signalPanel.hidden) return;
  signalPanel.dataset.grade = performance.id;
  signalGrade.textContent = performance.id;
  signalPoints.textContent = `${performance.points}/100`;
  signalFill.style.width = `${Math.max(0, Math.min(100, performance.fill))}%`;
  signalDetail.textContent = performance.detail;
}

function renderComboTimer(combo: number, timer: number, windowSeconds: number, status: GameStatus): void {
  comboTimer.hidden = status === "menu";
  if (comboTimer.hidden) return;
  const active = status === "playing" && combo > 1 && timer > 0;
  const fill = active ? ratio(timer, windowSeconds) : 0;
  comboTimer.dataset.state = active ? (fill <= 28 ? "ending" : "active") : "idle";
  comboTimerFill.style.width = `${fill}%`;
  comboTimerValue.textContent = active ? `${combo.toFixed(1)}x · ${timer.toFixed(1)}秒` : "完成得分动作后开启";
}

function renderCoachDirective(directive: CoachDirective, status: GameStatus): void {
  coachPanel.hidden = status !== "playing";
  if (coachPanel.hidden) return;
  coachPanel.dataset.urgent = String(directive.urgent);
  coachPanel.setAttribute("aria-label", `路线教练：${directive.title}`);
  coachTitle.textContent = directive.title;
  coachStep.textContent = `${directive.step}/${directive.totalSteps}`;
  coachDetail.textContent = directive.detail;
  coachProgress.textContent = directive.progress;
  renderCoachRail(directive);
}

function renderCoachRail(directive: CoachDirective): void {
  const stepCount = Math.max(1, directive.totalSteps);
  if (coachRailItems.length !== stepCount) {
    coachRailItems = Array.from({ length: stepCount }, () => document.createElement("span"));
    coachRail.replaceChildren(...coachRailItems);
  }
  coachRailItems.forEach((item, index) => {
    const step = index + 1;
    const state = step < directive.step ? "done" : step === directive.step ? "active" : "next";
    const label = COACH_STEP_LABELS[index] ?? `步骤${step}`;
    const title =
      step < directive.step
        ? `${label}：已完成`
        : step === directive.step
          ? `${label}：当前目标，${directive.progress}`
          : `${label}：后续目标`;
    if (item.dataset.state !== state) item.dataset.state = state;
    if (item.textContent !== label) item.textContent = label;
    if (item.title !== title) item.title = title;
    if (item.getAttribute("role") !== "listitem") item.setAttribute("role", "listitem");
    if (state === "active") {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function renderMissionToast(detail: {
  campaignWaves: number;
  contract: ContractSnapshot;
  objectiveHint: ObjectiveHint;
  radar: RadarSnapshot;
  routePlan: RoutePlan;
  status: GameStatus;
  wave: number;
}): void {
  if (detail.status !== "playing") {
    hideMissionToast();
    return;
  }

  const toast = buildMissionToast(detail);
  if (!toast) return;
  if (toast.key === latestMissionToastKey) return;
  latestMissionToastKey = toast.key;
  showMissionToast(toast.title, toast.detail, toast.tone);
}

function buildMissionToast(detail: {
  campaignWaves: number;
  contract: ContractSnapshot;
  objectiveHint: ObjectiveHint;
  radar: RadarSnapshot;
  routePlan: RoutePlan;
  wave: number;
}): { detail: string; key: string; title: string; tone: MissionToastTone } | undefined {
  const baseKey = `${detail.routePlan.seed}-${detail.wave}`;
  if (detail.objectiveHint.urgent) {
    return {
      key: `${baseKey}-urgent-${detail.objectiveHint.kind}-${detail.objectiveHint.title}`,
      title: detail.objectiveHint.kind === "danger" ? "紧急避险" : "路线优先级改变",
      detail: detail.objectiveHint.detail,
      tone: "danger"
    };
  }
  if (detail.radar.gate.open) {
    return {
      key: `${baseKey}-gate-open`,
      title: "光门开启",
      detail: `第 ${detail.wave}/${detail.campaignWaves} 波主目标完成。现在向北侧光门撤离，保留电量会提高评级。`,
      tone: "success"
    };
  }
  if (detail.contract.status === "completed") {
    return {
      key: `${baseKey}-contract-complete-${detail.contract.id}`,
      title: "合约完成，切回主目标",
      detail: `${detail.contract.name}奖励已结算。现在继续修剩余蓝色信标；全部亮起后从北侧光门撤离。`,
      tone: "success"
    };
  }
  if (detail.contract.status === "failed") {
    return {
      key: `${baseKey}-contract-failed-${detail.contract.id}`,
      title: "合约失败，主目标仍可完成",
      detail: "别重开也别乱飞，继续按导航修信标并撤离，本波依然能过。",
      tone: "warning"
    };
  }
  if (detail.objectiveHint.kind === "repair") {
    return {
      key: `${baseKey}-repair-lock`,
      title: "维修圈已锁定",
      detail: "按住 E / 修复键保持维修光束。危险靠近时先松手撤出，进度不会立刻清空。",
      tone: "primary"
    };
  }
  if (detail.objectiveHint.title === "先读图再出发") {
    return {
      key: `${baseKey}-briefing`,
      title: "安全读图缓冲",
      detail: "现在不会耗电或受击。先看金色流明、蓝色信标和本波合约，再移动出发。",
      tone: "primary"
    };
  }
  return undefined;
}

function showMissionToast(title: string, detail: string, tone: MissionToastTone): void {
  if (isCompactPlayViewport()) {
    hideCombatLog(true);
  }
  window.clearTimeout(missionToastTimer);
  missionToast.dataset.tone = tone;
  missionToastTitle.textContent = title;
  missionToastDetail.textContent = detail;
  missionToast.hidden = false;
  window.requestAnimationFrame(() => {
    missionToast.classList.add("show");
  });
  missionToastTimer = window.setTimeout(() => hideMissionToast(), tone === "danger" ? 3000 : 3800);
}

function hideMissionToast(immediate = false): void {
  window.clearTimeout(missionToastTimer);
  if (missionToast.hidden) return;
  missionToast.classList.remove("show");
  if (immediate) {
    missionToast.hidden = true;
    return;
  }
  missionToastTimer = window.setTimeout(() => {
    if (!missionToast.classList.contains("show")) {
      missionToast.hidden = true;
    }
  }, 220);
}

function showCombatLog(title: string, detail: string, tone: CombatLogTone): void {
  if (latestStatus !== "playing") return;
  if (isCompactPlayViewport()) {
    hideMissionToast(true);
  }
  window.clearTimeout(combatLogTimer);
  combatLogEntries = [{ detail, title, tone }, ...combatLogEntries].slice(0, COMBAT_LOG_HISTORY_LIMIT);
  combatLog.dataset.tone = tone;
  combatLogTitle.textContent = title;
  combatLogDetail.textContent = detail;
  renderCombatLogHistory();
  combatLog.hidden = false;
  window.requestAnimationFrame(() => {
    combatLog.classList.add("show");
  });
  combatLogTimer = window.setTimeout(() => hideCombatLog(), tone === "danger" ? 3600 : 2800);
}

function hideCombatLog(immediate = false): void {
  window.clearTimeout(combatLogTimer);
  if (combatLog.hidden) {
    if (immediate) clearCombatLogHistory();
    return;
  }
  combatLog.classList.remove("show");
  if (immediate) {
    combatLog.hidden = true;
    clearCombatLogHistory();
    return;
  }
  combatLogTimer = window.setTimeout(() => {
    if (!combatLog.classList.contains("show")) {
      combatLog.hidden = true;
      clearCombatLogHistory();
    }
  }, 200);
}

function renderCombatLogHistory(): void {
  const previousEntries = combatLogEntries.slice(1);
  combatLogHistory.hidden = previousEntries.length === 0;
  combatLogHistory.replaceChildren(
    ...previousEntries.map((entry) => {
      const item = document.createElement("li");
      item.dataset.tone = entry.tone;
      const titleNode = document.createElement("b");
      const detailNode = document.createElement("span");
      titleNode.textContent = entry.title;
      detailNode.textContent = entry.detail;
      item.append(titleNode, detailNode);
      return item;
    })
  );
}

function clearCombatLogHistory(): void {
  combatLogEntries = [];
  combatLogHistory.hidden = true;
  combatLogHistory.replaceChildren();
}

function isCompactPlayViewport(): boolean {
  return window.matchMedia("(max-width: 700px), (max-height: 480px) and (orientation: landscape), (pointer: coarse)").matches;
}

function feedbackToneFor(kind: SoundKind): CombatLogTone {
  if (kind === "hit" || kind === "loss") return "danger";
  if (
    kind === "closeCall" ||
    kind === "contract" ||
    kind === "pickup" ||
    kind === "repair" ||
    kind === "score" ||
    kind === "win"
  ) {
    return "success";
  }
  return "primary";
}

function buildObjectiveStripTitle(hint: ObjectiveHint): string {
  if (hint.urgent) return `紧急任务：${hint.title}`;
  if (hint.kind === "gate") return `撤离任务：${hint.title}`;
  if (hint.kind === "repair") return `维修任务：${hint.title}`;
  return `当前任务：${hint.title}`;
}

function buildObjectiveStripDetail(detail: {
  briefingActive: boolean;
  campaignWaves: number;
  contract: ContractSnapshot;
  difficulty: DifficultyId;
  objectiveHint: ObjectiveHint;
  relays: string;
  routePlan: RoutePlan;
  sector: SectorLayout;
  wave: number;
  waveModifier: WaveModifier;
}): string {
  const contractStatus =
    detail.contract.status === "active"
      ? `${detail.contract.name}：${detail.contract.progress}`
      : `${detail.contract.name}：${getContractStatusLabel(detail.contract.status)}`;
  const waveContext = `第 ${detail.wave}/${detail.campaignWaves} 波 · 信标 ${detail.relays}`;
  if (detail.briefingActive) {
    return `${detail.objectiveHint.detail} · ${waveContext} · 合约 ${contractStatus}`;
  }
  if (detail.objectiveHint.urgent) {
    return `${detail.objectiveHint.detail} · ${waveContext}`;
  }
  return `${detail.objectiveHint.detail} · ${waveContext} · 合约 ${contractStatus}`;
}

function buildMissionStatusText(message: string, hint: ObjectiveHint): string {
  if (hint.urgent || hint.kind === "danger" || hint.kind === "repair" || hint.kind === "gate") {
    return `${hint.title}：${hint.detail}`;
  }
  if (hint.kind === "lumen" || hint.kind === "relay") {
    return `${hint.title}：${hint.detail}`;
  }
  return message;
}

function renderRadar(radar: RadarSnapshot, status: GameStatus): void {
  radarPanel.hidden = status !== "playing";
  if (radarPanel.hidden) {
    radarMap.replaceChildren();
    return;
  }

  radarMap.setAttribute("viewBox", `0 0 ${radar.arena.width} ${radar.arena.height}`);
  radarSummary.textContent = buildRadarSummary(radar);
  radarMap.replaceChildren(...createRadarNodes(radar));
}

function renderTacticalScan(): void {
  const shouldShow = latestStatus === "paused" && Boolean(latestRadarSnapshot);
  tacticalScan.hidden = !shouldShow;
  if (!shouldShow || !latestRadarSnapshot) {
    tacticalScanMap.replaceChildren();
    return;
  }

  tacticalScanMap.setAttribute("viewBox", `0 0 ${latestRadarSnapshot.arena.width} ${latestRadarSnapshot.arena.height}`);
  tacticalScanSummary.textContent = latestRoutePlan
    ? `${latestRoutePlan.name} · ${buildRadarSummary(latestRadarSnapshot)}`
    : buildRadarSummary(latestRadarSnapshot);
  tacticalScanMap.replaceChildren(...createRadarNodes(latestRadarSnapshot));
}

function updateWaveIntro(detail: {
  campaignWaves: number;
  contract: ContractSnapshot;
  routePlan: RoutePlan;
  sector: SectorLayout;
  status: GameStatus;
  wave: number;
  waveModifier: WaveModifier;
}): void {
  if (detail.status !== "playing") {
    hideWaveIntro();
    return;
  }

  const introKey = `${detail.routePlan.seed}-${detail.wave}-${detail.sector.id}-${detail.waveModifier.id}`;
  if (introKey === latestWaveIntroKey) {
    if (!waveIntro.hidden && Date.now() >= waveIntroExpiresAt) {
      hideWaveIntro(true);
    }
    return;
  }

  latestWaveIntroKey = introKey;
  waveIntroExpiresAt = Date.now() + 3600;
  waveIntroTitle.textContent = `第 ${detail.wave}/${detail.campaignWaves} 波 · ${detail.sector.name}`;
  waveIntroDetail.textContent = `${detail.waveModifier.name}：${detail.sector.briefing} ${detail.waveModifier.briefing}`;
  waveIntroContract.textContent = `战术合约：${detail.contract.name} · ${detail.contract.requirement}`;
  waveIntro.hidden = false;
  window.clearTimeout(waveIntroTimer);
  waveIntro.classList.add("show");
  waveIntroTimer = window.setTimeout(() => hideWaveIntro(true), 3600);
}

function hideWaveIntro(immediate = false): void {
  window.clearTimeout(waveIntroTimer);
  waveIntroExpiresAt = 0;
  if (waveIntro.hidden) return;
  waveIntro.classList.remove("show");
  if (immediate) {
    waveIntro.hidden = true;
    return;
  }
  waveIntroTimer = window.setTimeout(() => {
    if (!waveIntro.classList.contains("show")) {
      waveIntro.hidden = true;
    }
  }, 260);
}

function hideTacticalScan(): void {
  tacticalScan.hidden = true;
  tacticalScanMap.replaceChildren();
}

function buildRadarSummary(radar: RadarSnapshot): string {
  const repairedRelays = radar.relays.filter((relay) => relay.repaired).length;
  const remainingLumen = radar.lumen.filter((drop) => !drop.collected).length;
  const guide = radar.guide ? ` · 导航 ${radar.guide.title}` : "";
  return `${repairedRelays}/${radar.relays.length} 信标 · ${remainingLumen} 流明 · ${radar.storms.length} 风暴${guide}`;
}

function createRadarNodes(radar: RadarSnapshot): SVGElement[] {
  return [
    createSvgNode("rect", {
      class: "radar-bg",
      "data-kind": "arena",
      x: 0,
      y: 0,
      width: radar.arena.width,
      height: radar.arena.height,
      rx: 24
    }),
    ...radar.relays.flatMap((relay, index) => {
      const nextRelay = radar.relays[(index + 1) % radar.relays.length];
      return nextRelay
        ? [
            createSvgNode("line", {
              class: relay.repaired && nextRelay.repaired ? "radar-link repaired" : "radar-link",
              "data-kind": "route",
              x1: relay.position.x,
              y1: relay.position.y,
              x2: nextRelay.position.x,
              y2: nextRelay.position.y
            })
          ]
        : [];
    }),
    ...(radar.guide
      ? [
          createSvgNode("line", {
            class: radar.guide.urgent ? "radar-guide urgent" : "radar-guide",
            "data-kind": "guide",
            x1: radar.player.position.x,
            y1: radar.player.position.y,
            x2: radar.guide.position.x,
            y2: radar.guide.position.y
          }),
          createSvgNode("circle", {
            class: `radar-guide-target ${radar.guide.kind}${radar.guide.urgent ? " urgent" : ""}`,
            "data-kind": "guide",
            cx: radar.guide.position.x,
            cy: radar.guide.position.y,
            r: radar.guide.urgent ? 44 : 38
          })
        ]
      : []),
    ...radar.storms.map((storm) =>
      createSvgNode("circle", {
        class: "radar-storm",
        "data-kind": "storm",
        cx: storm.position.x,
        cy: storm.position.y,
        r: Math.max(storm.radius, storm.activeRadius)
      })
    ),
    ...radar.lumen
      .filter((drop) => !drop.collected)
      .map((drop) =>
        createSvgNode("circle", {
          class: "radar-lumen",
          "data-kind": "lumen",
          cx: drop.position.x,
          cy: drop.position.y,
          r: 18
        })
      ),
    ...radar.hazards.map((hazard) =>
      createSvgNode("circle", {
        class: "radar-hazard",
        "data-kind": "hazard",
        cx: hazard.position.x,
        cy: hazard.position.y,
        r: hazard.radius + 12
      })
    ),
    ...radar.relays.map((relay) =>
      createSvgNode("circle", {
        class: relay.repaired ? "radar-relay repaired" : "radar-relay",
        "data-kind": "relay",
        cx: relay.position.x,
        cy: relay.position.y,
        r: relay.repaired ? 34 : 30
      })
    ),
    createSvgNode("circle", {
      class: radar.gate.open ? "radar-gate open" : "radar-gate",
      "data-kind": "gate",
      cx: radar.gate.position.x,
      cy: radar.gate.position.y,
      r: radar.gate.open ? 34 : 26
    }),
    createSvgNode("polygon", {
      class: "radar-player",
      "data-kind": "player",
      points: `${radar.player.position.x},${radar.player.position.y - 28} ${radar.player.position.x + 24},${radar.player.position.y + 22} ${radar.player.position.x - 24},${radar.player.position.y + 22}`
    })
  ];
}

function createSvgNode(tag: string, attributes: Record<string, string | number>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, String(value));
  });
  return node;
}

function shortUpgradeName(id: UpgradeId): string {
  const names: Record<UpgradeId, string> = {
    engine: "引擎",
    repair: "织机",
    capacitor: "电容",
    pulse: "脉冲",
    shield: "曜盾"
  };
  return names[id];
}

function buildUpgradeRecommendation(detail: RunEndDetail, choices: Upgrade[]): UpgradeRecommendation | undefined {
  const available = new Set(choices.map((choice) => choice.id));
  const pick = (id: UpgradeId, label: string, reason: string): UpgradeRecommendation | undefined =>
    available.has(id) ? { id, label, reason } : undefined;
  const contractPick = buildContractUpgradeRecommendation(detail, pick);
  const forecastPick = buildForecastUpgradeRecommendation(detail, pick);
  const candidates: Array<UpgradeRecommendation | undefined> = [
    contractPick,
    detail.charge < 34 || detail.stats.lumenCollected < Math.max(3, detail.wave * 2)
      ? pick("capacitor", "续航修正", "电量或流明回收偏低，电容能提高最大电量和补给收益。")
      : undefined,
    detail.stats.stormSeconds > 2.2
      ? pick("engine", "风暴脱离", "紫色风暴停留偏久，引擎能让推进和转场更可靠。")
      : undefined,
    detail.stats.hitsTaken > 0 && detail.stats.pulseUses === 0
      ? pick("pulse", "碎片控场", "本波受击但几乎没用脉冲，扩大脉冲更适合处理贴脸碎片。")
      : undefined,
    detail.stats.hitsTaken >= 2 || detail.hull < 52
      ? pick("shield", "容错提升", "受击或剩余机体压力偏高，曜盾能降低碰撞惩罚。")
      : undefined,
    detail.elapsed > detail.wave * 58
      ? pick("repair", "提速清波", "清波时间偏长，信标织机能缩短维修窗口并提高信标收益。")
      : undefined,
    forecastPick,
    detail.rating.points < 62
      ? pick("repair", "评级提分", "当前评级还有提升空间，更快修复能减少耗电并稳定过波节奏。")
      : undefined,
    detail.stats.hitsTaken === 0 && detail.contract.status === "completed"
      ? pick("repair", "冲分路线", "本波路线稳定，信标织机能把稳定操作转成更高分数。")
      : undefined,
    pick(choices[0]?.id ?? "engine", "均衡强化", "继续强化当前可选改装，为下一波更高密度路线保留余量。")
  ];
  return candidates.find(Boolean);
}

function buildUpgradeForecast(detail: RunEndDetail): UpgradeForecast | undefined {
  if (detail.status !== "won" || detail.wave >= CAMPAIGN_WAVES) {
    return undefined;
  }
  const nextWave = Math.min(detail.wave + 1, CAMPAIGN_WAVES);
  const sector = SECTOR_LAYOUTS[getSectorFor(nextWave, detail.difficulty)];
  const event = WAVE_MODIFIERS[getWaveModifierFor(nextWave, detail.difficulty)];
  const contract = CONTRACTS[getContractFor(nextWave, detail.difficulty)];
  return {
    contractName: contract.name,
    contractRequirement: contract.requirement,
    eventBriefing: event.briefing,
    eventName: event.name,
    sectorBriefing: sector.briefing,
    sectorName: sector.name,
    wave: nextWave,
    totalWaves: CAMPAIGN_WAVES
  };
}

function createUpgradeForecastNode(forecast: UpgradeForecast): HTMLElement {
  const forecastNode = document.createElement("div");
  forecastNode.className = "upgrade-forecast";

  const title = document.createElement("b");
  title.textContent = `下一波预报：第 ${forecast.wave}/${forecast.totalWaves} 波`;

  const chips = document.createElement("div");
  chips.className = "upgrade-forecast-chips";
  chips.append(
    createForecastChip("区域", forecast.sectorName),
    createForecastChip("事件", forecast.eventName),
    createForecastChip("合约", forecast.contractName)
  );

  const detail = document.createElement("span");
  detail.textContent = `${forecast.sectorBriefing} ${forecast.eventBriefing} 合约目标：${forecast.contractRequirement}`;

  forecastNode.append(title, chips, detail);
  return forecastNode;
}

function createForecastChip(label: string, value: string): HTMLElement {
  const chip = document.createElement("em");
  chip.textContent = `${label}：${value}`;
  return chip;
}

function buildForecastUpgradeRecommendation(
  detail: RunEndDetail,
  pick: (id: UpgradeId, label: string, reason: string) => UpgradeRecommendation | undefined
): UpgradeRecommendation | undefined {
  if (detail.status !== "won" || detail.wave >= CAMPAIGN_WAVES) return undefined;
  const nextWave = detail.wave + 1;
  const nextContract = getContractFor(nextWave, detail.difficulty);
  const nextModifier = getWaveModifierFor(nextWave, detail.difficulty);
  if (nextContract === "relayRush" || nextModifier === "overclockedGrid") {
    return pick("repair", "下一波速修", "下一波维修窗口更关键，信标织机能缩短站桩时间。");
  }
  if (nextContract === "stormSkipper" || nextModifier === "stormFront") {
    return pick("engine", "下一波绕风暴", "下一波风暴压力更高，引擎能更快脱离紫色区域。");
  }
  if (nextContract === "cleanWave" || nextModifier === "shardCurrent") {
    return detail.stats.pulseUses === 0
      ? pick("pulse", "下一波控碎片", "下一波碎片切线更危险，脉冲能保护维修窗口。")
      : pick("shield", "下一波防碰撞", "下一波更考验无损路线，曜盾能提高容错。");
  }
  if (nextContract === "lumenRoute" || nextModifier === "lumenSurge") {
    return pick("capacitor", "下一波补给", "下一波适合围绕流明路线冲分，电容能放大补给价值。");
  }
  return undefined;
}

function buildContractUpgradeRecommendation(
  detail: RunEndDetail,
  pick: (id: UpgradeId, label: string, reason: string) => UpgradeRecommendation | undefined
): UpgradeRecommendation | undefined {
  if (detail.contract.status !== "failed") return undefined;
  if (detail.contract.id === "lumenRoute") {
    return pick("capacitor", "合约补给", "流明航线失败，下一波先强化续航和补给收益。");
  }
  if (detail.contract.id === "relayRush") {
    return pick("repair", "速修补强", "速修信标失败，信标织机能直接缩短第一座信标维修时间。");
  }
  if (detail.contract.id === "cleanWave") {
    return detail.stats.pulseUses === 0
      ? pick("pulse", "无损控场", "无损合约失败且脉冲使用不足，先强化脉冲处理贴脸碎片。")
      : pick("shield", "无损容错", "无损合约失败，曜盾能降低碰撞造成的整局损失。");
  }
  if (detail.contract.id === "stormSkipper") {
    return pick("engine", "绕风暴", "风暴掠行失败，引擎能让你更快离开紫色区域。");
  }
  return pick("engine", "节奏控制", "脉冲节律失败，先强化移动能力，减少被迫交技能的情况。");
}

function getUpgradeRoleLabel(id: UpgradeId): string {
  const labels: Record<UpgradeId, string> = {
    engine: "机动",
    repair: "维修",
    capacitor: "续航",
    pulse: "控场",
    shield: "防护"
  };
  return labels[id];
}

function getUpgradeChoiceReason(id: UpgradeId): string {
  const reasons: Record<UpgradeId, string> = {
    engine: "提高移动和推进效率，适合穿出风暴、赶往远端信标。",
    repair: "缩短按住维修的风险时间，也能提高信标得分。",
    capacitor: "提高最大电量和流明回电，让修到一半撤出补给更安全。",
    pulse: "扩大脉冲范围，把贴脸粉色碎片推远，保护维修窗口。",
    shield: "提高机体上限并降低碰撞伤害，适合先稳住通关。"
  };
  return reasons[id];
}

function showHelpOverlay(reason: "manual" | "interruption" = "manual"): void {
  if (latestStatus === "won") {
    setSessionFeedback("先选择一项升级；也可以使用升级列表末尾的次要按钮跳过。");
    return;
  }
  resetVirtualInput();
  if (latestStatus === "playing") {
    window.dispatchEvent(new CustomEvent("game:pause"));
    latestStatus = "paused";
    setShellStatus(latestStatus);
    setShellBriefingActive(false);
  }
  overlay.classList.add("show");
  const paused = latestStatus === "paused";
  achievementStrip.hidden = false;
  runHistory.hidden = true;
  updateAchievementUi();
  setDifficultyPickerVisible(latestStatus === "menu" || latestStatus === "lost" || latestStatus === "completed");
  overlayEyebrow.textContent = paused ? (reason === "interruption" ? "已自动暂停" : "暂停战术说明") : "玩法说明";
  overlayTitle.textContent = paused ? "先看路线，再继续" : "维修、连锁、撤离";
  overlayCopy.textContent = paused
    ? reason === "interruption"
      ? "页面失焦或切后台时已自动暂停，不会继续耗电或受击。先看战术扫描确认路线，再继续游戏。"
      : "游戏已暂停，不会耗电或受击。先看战术扫描确认流明、信标、危险和光门，再继续执行当前目标。"
    : "目标不是乱飞，而是在电量压力下规划路线：先补流明，再修信标，最后从北侧光门撤离。";
  runRecap.hidden = true;
  quickBrief.hidden = paused;
  controlPrimer.hidden = paused;
  loopPrimer.hidden = paused;
  gameDossier.hidden = false;
  launchBrief.hidden = false;
  firstMinuteRoute.hidden = false;
  launchCommit.hidden = paused;
  missionBrief.hidden = false;
  fieldGuide.hidden = false;
  renderTacticalScan();
  howToPlay.hidden = false;
  updateNextRunPanel();
  upgradeChoices.hidden = true;
  startButton.hidden = latestStatus === "paused";
  resumeButton.hidden = latestStatus !== "paused";
  updateSessionTools();
  if (latestStatus !== "paused") {
    startButton.textContent = getMenuStartLabel();
  }
  resetOverlayPanelScroll();
}

function resetOverlayPanelScroll(): void {
  overlayPanel.focus({ preventScroll: true });
  overlayPanel.scrollTop = 0;
  window.requestAnimationFrame(() => {
    overlayPanel.scrollTop = 0;
  });
  window.setTimeout(() => {
    overlayPanel.scrollTop = 0;
  }, 60);
}

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "h") {
    if (latestStatus === "won") {
      setSessionFeedback("过波后先处理升级选择，避免丢失下一波改装。");
      return;
    }
    showHelpOverlay();
  }
  if (event.key === "Escape" && latestStatus === "paused") {
    overlay.classList.remove("show");
    hideTacticalScan();
    disarmResetSave();
    window.dispatchEvent(new CustomEvent("game:resume"));
    focusGameSurface();
  }
});

function pauseForInterruption(): void {
  resetVirtualInput();
  if (latestStatus !== "playing") return;
  showHelpOverlay("interruption");
  setSessionFeedback("已自动暂停：页面失焦或切后台。");
}

function ratio(value: number, max: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
}

touchStick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  touchStick.setPointerCapture(event.pointerId);
  updateStick(event);
});

touchStick.addEventListener("pointermove", (event) => {
  if (touchStick.hasPointerCapture(event.pointerId)) {
    event.preventDefault();
    updateStick(event);
  }
});

touchStick.addEventListener("pointerup", endStickInput);
touchStick.addEventListener("pointercancel", endStickInput);
touchStick.addEventListener("lostpointercapture", endStickInput);
touchStick.addEventListener("contextmenu", (event) => event.preventDefault());

touchButtons.forEach((button) => {
  const action = button.dataset.touchAction as "boost" | "repair" | "pulse";
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    window.__lumenVirtualInput![action] = true;
    if (action !== "repair") {
      bufferTouchTap(action);
    }
    button.dataset.active = "true";
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    if (action !== "repair") {
      bufferTouchTap(action);
    }
  });
  const releaseAction = (event: PointerEvent) => {
    event.preventDefault();
    if (button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }
    window.__lumenVirtualInput![action] = false;
    delete button.dataset.active;
  };
  button.addEventListener("pointerup", releaseAction);
  button.addEventListener("pointercancel", releaseAction);
  button.addEventListener("lostpointercapture", releaseAction);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

window.addEventListener("blur", pauseForInterruption);
window.addEventListener("pagehide", pauseForInterruption);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseForInterruption();
  }
});

function updateStick(event: PointerEvent): void {
  const rect = touchStick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const distance = Math.hypot(dx, dy);
  const maxDistance = rect.width * 0.34;
  const scale = distance > maxDistance ? maxDistance / distance : 1;
  const x = dx * scale;
  const y = dy * scale;
  touchStickKnob.style.setProperty("--stick-x", `${x}px`);
  touchStickKnob.style.setProperty("--stick-y", `${y}px`);
  window.__lumenVirtualInput!.move = {
    x: x / maxDistance,
    y: y / maxDistance
  };
}

function endStickInput(event: PointerEvent): void {
  event.preventDefault();
  if (touchStick.hasPointerCapture(event.pointerId)) {
    touchStick.releasePointerCapture(event.pointerId);
  }
  resetStick();
}

function resetStick(): void {
  touchStickKnob.style.setProperty("--stick-x", "0px");
  touchStickKnob.style.setProperty("--stick-y", "0px");
  window.__lumenVirtualInput!.move = { x: 0, y: 0 };
}

function bufferTouchTap(action: "boost" | "repair" | "pulse"): void {
  window.__lumenVirtualInput!.tap ??= { boost: 0, repair: 0, pulse: 0 };
  window.__lumenVirtualInput!.tap[action] = 4;
}

function resetVirtualInput(): void {
  resetStick();
  window.__lumenVirtualInput!.boost = false;
  window.__lumenVirtualInput!.repair = false;
  window.__lumenVirtualInput!.pulse = false;
  window.__lumenVirtualInput!.tap = { boost: 0, repair: 0, pulse: 0 };
  touchButtons.forEach((button) => {
    delete button.dataset.active;
  });
}

function updateDifficultyUi(): void {
  difficultyButtons.forEach((button) => {
    const active = button.dataset.difficulty === selectedDifficulty;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const difficulty = DIFFICULTY_SETTINGS[selectedDifficulty];
  difficultyDetail.textContent = `${difficulty.name}模式：${difficulty.description}`;
  if (latestStatus === "menu" || latestStatus === "lost" || latestStatus === "completed") {
    startButton.textContent = getMenuStartLabel();
  }
  updateDailyChallengeUi();
  updateNextRunPanel();
}

function getMenuStartLabel(): string {
  const difficultyName = DIFFICULTY_SETTINGS[selectedDifficulty].name;
  if (latestStatus === "lost") return `重新开始${difficultyName}救援`;
  if (latestStatus === "completed") return `再次挑战${difficultyName}救援`;
  return `开始${difficultyName}救援`;
}

function updateAudioUi(): void {
  audioToggle.textContent = saveData.audioEnabled ? "音效 开" : "音效 关";
  audioToggle.setAttribute("aria-pressed", String(saveData.audioEnabled));
}

function updateSettingsUi(message?: string): void {
  window.__lumenSettings = {
    largeLabels: saveData.largeLabels,
    reducedMotion: saveData.reducedMotion
  };
  shell.dataset.reducedMotion = String(saveData.reducedMotion);
  shell.dataset.largeLabels = String(saveData.largeLabels);
  motionToggle.textContent = saveData.reducedMotion ? "精简动效 开" : "精简动效 关";
  motionToggle.setAttribute("aria-pressed", String(saveData.reducedMotion));
  labelToggle.textContent = saveData.largeLabels ? "大字标签 开" : "大字标签 关";
  labelToggle.setAttribute("aria-pressed", String(saveData.largeLabels));
  window.dispatchEvent(new CustomEvent("game:settings", { detail: window.__lumenSettings }));
  if (message) {
    setSessionFeedback(message);
  }
}

function updateDailyChallengeUi(): void {
  const daily = getDailyChallenge();
  const difficulty = DIFFICULTY_SETTINGS[selectedDifficulty];
  dailyRouteButton.textContent = `今日挑战 · ${daily.routeName}`;
  dailyRouteButton.title = `${daily.label}，${difficulty.name}模式，固定救援代号 ${daily.routeName}`;
  dailyDetail.textContent = buildDailyChallengeDetail(daily);
}

function updateNextRunPanel(detail?: RunEndDetail): void {
  const summary = buildNextRunSummary(detail);
  nextRunPanel.hidden = false;
  nextRunTitle.textContent = summary.title;
  nextRunFocus.textContent = summary.focus;
  nextRunGoals.replaceChildren(
    ...summary.goals.map((goal) => {
      const item = document.createElement("article");
      item.dataset.tone = goal.tone;
      const label = document.createElement("strong");
      const text = document.createElement("span");
      label.textContent = goal.label;
      text.textContent = goal.text;
      item.append(label, text);
      return item;
    })
  );
}

function buildNextRunSummary(detail?: RunEndDetail): { title: string; focus: string; goals: NextRunGoal[] } {
  const difficulty = DIFFICULTY_SETTINGS[selectedDifficulty];
  const daily = getDailyChallenge();
  const dailyBest = getCurrentDailyBest(daily);
  const nextAchievement = getNextAchievementTarget();
  const lastRun = saveData.runHistory[0];
  const title = detail?.status === "won" ? "下一波目标" : "下一局目标";
  const focus = buildNextRunFocus(detail, dailyBest);
  const goals: NextRunGoal[] = [
    {
      label: "当前路线",
      text:
        detail?.status === "won"
          ? `继续 ${detail.routePlan.name}，第 ${Math.min(detail.wave + 1, 5)}/5 波会换区域和事件。`
          : `普通救援生成新代号；今日挑战固定为 ${daily.routeName}。`,
      tone: "primary"
    },
    {
      label: "难度节奏",
      text: `${difficulty.name}模式：${difficulty.description}`,
      tone: selectedDifficulty === "hardcore" ? "warning" : "steady"
    },
    {
      label: "今日挑战",
      text: dailyBest
        ? `今日最佳 ${dailyBest.score.toLocaleString()} 分 / ${dailyBest.ratingId} ${dailyBest.ratingName} / 第 ${dailyBest.wave}/5 波。`
        : `${daily.label}还没有成绩，打一把会记录当天固定路线。`,
      tone: dailyBest ? "complete" : "primary"
    },
    {
      label: nextAchievement ? `成就目标：${nextAchievement.name}` : "成就目标",
      text: nextAchievement ? nextAchievement.requirement : "成就已全解锁，下一步冲硬核高分和今日最佳。",
      tone: nextAchievement ? "steady" : "complete"
    }
  ];

  if (lastRun && !detail) {
    goals[0] = {
      label: "上次路线",
      text: `${lastRun.routeName}：${getRunStatusLabel(lastRun.status)}，${lastRun.score.toLocaleString()} 分，合约 ${lastRun.contractsCompleted}/5。`,
      tone: lastRun.status === "lost" ? "warning" : "complete"
    };
  }

  if (detail?.status === "lost") {
    goals[1] = {
      label: "修正重点",
      text: buildLossCorrection(detail),
      tone: "warning"
    };
  } else if (detail?.status === "won") {
    goals[1] = {
      label: "升级判断",
      text: buildUpgradeAdvice(detail),
      tone: "primary"
    };
  } else if (detail?.status === "completed") {
    goals[1] = {
      label: "发行循环",
      text: detail.difficulty === "hardcore" ? "硬核已通关，下一步冲今日挑战和 S 级速度。" : "完整五波已通关，可以切硬核或用今日挑战复盘路线。",
      tone: "complete"
    };
  }

  return { title, focus, goals };
}

function buildNextRunFocus(detail: RunEndDetail | undefined, dailyBest: DailyBestEntry | undefined): string {
  if (!detail) {
    if (!saveData.achievements.includes("firstRepair")) {
      return "首次目标：先完成 4 个流明合约，再修复第一座蓝色信标。";
    }
    if (saveData.bestWave < 2) {
      return "下一局先稳定第一波：补流明、修 4 座信标、从北侧光门撤离。";
    }
    if (saveData.bestContracts === 0) {
      return "下一局把战术合约当成路线目标，完成后再撤离。";
    }
    if (!dailyBest) {
      return "今日挑战还没有成绩，适合用固定路线练习和复盘。";
    }
    return "下一局目标：读合约、保连锁、少受击，把实时评级推到 A 或 S。";
  }

  if (detail.status === "won") {
    return `第 ${detail.wave}/5 波已稳定。先选升级，再进入第 ${Math.min(detail.wave + 1, 5)}/5 波读新合约。`;
  }
  if (detail.status === "completed") {
    return "五波救援完成。下一局可以挑战硬核、今日挑战，或追求 S 级无损高分。";
  }
  return buildLossCorrection(detail);
}

function buildLossCorrection(detail: RunEndDetail): string {
  if (detail.endReason === "chargeDepleted") {
    return detail.stats.lumenCollected < 3
      ? "电量归零：开局先吃 2-3 个流明，别直接硬修信标。"
      : "电量归零：修到节点后可以先离开补流明，再回到信标继续。";
  }
  if (detail.endReason === "hullDestroyed") {
    return detail.stats.pulseUses === 0
      ? "机体损毁：粉色碎片贴近时用 Q / 脉冲键，不要把技能留到失败。"
      : "机体损毁：减少穿越碎片线，推进用于脱离危险，不只用于赶路。";
  }
  return "信号中断：先保命完成主目标，再追求合约、连锁和 S 级评价。";
}

function buildUpgradeAdvice(detail: RunEndDetail): string {
  if (detail.stats.stormSeconds > 2 || detail.charge < 34) return "缺电或风暴停留偏高，优先深层电容或矢量引擎。";
  if (detail.stats.hitsTaken > 0 || detail.hull < 46) return "受击偏多，优先曜盾机体；如果常被贴脸，选棱镜脉冲。";
  if (detail.elapsed > detail.wave * 58) return "清波偏慢，优先信标织机或矢量引擎。";
  return "路线稳定，可以按冲分选择信标织机，或按续航选择深层电容。";
}

function getCurrentDailyBest(daily: ReturnType<typeof getDailyChallenge>): DailyBestEntry | undefined {
  const best = saveData.dailyBest;
  return best && best.key === daily.key && best.routeSeed === daily.seed ? best : undefined;
}

function getNextAchievementTarget(): ReturnType<typeof getAchievementSummaries>[number] | undefined {
  return getAchievementSummaries(saveData.achievements).find((summary) => !summary.unlocked);
}

function updateRecordUi(): void {
  recordScore.textContent = saveData.bestScore.toLocaleString();
  recordWave.textContent = `${Math.max(1, saveData.bestWave)}/5`;
  recordCombo.textContent = `${saveData.bestCombo.toFixed(1)}x`;
  recordContracts.textContent = `${saveData.bestContracts}/5`;
}

function setShellStatus(status: GameStatus): void {
  shell.dataset.status = status;
}

function setShellBriefingActive(active: boolean): void {
  shell.dataset.briefing = String(active);
}

function syncOverlayState(): void {
  const active = overlay.classList.contains("show");
  shell.dataset.overlay = String(active);
  [gameWrap, objectiveTitle.parentElement, radarPanel, hud, waveIntro, missionToast, combatLog].forEach((element) => {
    if (!element) return;
    element.setAttribute("aria-hidden", String(active));
    (element as HTMLElement & { inert?: boolean }).inert = active;
  });
}

function setDifficultyPickerVisible(visible: boolean): void {
  difficultyPicker.hidden = !visible;
  difficultyDetail.hidden = !visible;
  dailyDetail.hidden = !visible;
}

function updateSessionTools(message?: string): void {
  const overlayVisible = overlay.classList.contains("show");
  const inUpgradeChoice = latestStatus === "won";
  sessionTools.hidden = !overlayVisible;
  copyRouteButton.hidden = !latestRoutePlan;
  restartRouteButton.hidden = !(latestStatus === "paused" && latestRoutePlan);
  resetSaveButton.hidden = inUpgradeChoice;
  if (message) {
    setSessionFeedback(message);
    return;
  }
  if (latestRoutePlan) {
    setSessionFeedback(`救援代号 ${latestRoutePlan.name}`);
  } else {
    setSessionFeedback("本地设置");
  }
}

function completeBootStatus(): void {
  document.body.dataset.gameReady = "true";
  window.setTimeout(() => {
    if (document.body.dataset.gameReady === "true") {
      bootStatus?.setAttribute("hidden", "");
    }
  }, 240);
}

function buildRouteLink(): string | undefined {
  if (!latestRoutePlan) return undefined;
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("route", latestRoutePlan.name);
  return url.toString();
}

async function copyRouteLink(): Promise<void> {
  const link = buildRouteLink();
  if (!link) {
    setSessionFeedback("还没有可复制的救援代号。");
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    setSessionFeedback("路线链接已复制。");
  } catch {
    setSessionFeedback(link);
  }
}

function armResetSave(): void {
  resetSaveArmed = true;
  resetSaveButton.textContent = "再次点击确认清空";
  setSessionFeedback("将清空本地成绩、成就和设置。");
  if (resetSaveTimer) {
    window.clearTimeout(resetSaveTimer);
  }
  resetSaveTimer = window.setTimeout(() => {
    disarmResetSave();
    updateSessionTools();
  }, 4200);
}

function disarmResetSave(): void {
  resetSaveArmed = false;
  resetSaveButton.textContent = "清空本地存档";
  if (resetSaveTimer) {
    window.clearTimeout(resetSaveTimer);
    resetSaveTimer = undefined;
  }
}

function setSessionFeedback(message: string): void {
  sessionFeedback.textContent = message;
}

function persistRunResult(detail: RunEndDetail): AchievementId[] {
  saveData.bestScore = Math.max(saveData.bestScore, detail.score);
  saveData.bestWave = Math.max(saveData.bestWave, detail.wave);
  saveData.bestCombo = Math.max(saveData.bestCombo, detail.bestCombo);
  saveData.bestContracts = Math.max(saveData.bestContracts, detail.campaignStats.contractsCompleted);
  if (detail.contract.status === "completed") {
    saveData.totalContracts += 1;
  }
  if (detail.status === "completed") {
    saveData.clears += 1;
  }
  const previous = new Set(saveData.achievements);
  const runAchievements = getUnlockedAchievementsForRun(detail);
  const newlyUnlocked = runAchievements.filter((id) => !previous.has(id));
  saveData.achievements = Array.from(new Set([...saveData.achievements, ...runAchievements]));
  saveData.runHistory = [createRunHistoryEntry(detail), ...saveData.runHistory].slice(0, 5);
  persistDailyBest(detail);
  saveSave(saveData);
  updateRecordUi();
  updateDailyChallengeUi();
  updateAchievementUi();
  updateRunHistoryUi();
  updateNextRunPanel(detail);
  return newlyUnlocked;
}

function renderRunRecap(detail: RunEndDetail, newlyUnlocked: AchievementId[]): void {
  recapRating.dataset.grade = detail.rating.id;
  recapRatingGrade.textContent = detail.rating.id;
  recapRatingName.textContent = detail.rating.name;
  recapRatingDetail.textContent = `${detail.rating.points}/100 · ${detail.rating.description}`;
  renderContractRecap(detail.contract);
  const metrics: Array<[string, string]> = [
    ["分数", detail.score.toLocaleString()],
    ["波次", `${detail.wave}/5`],
    ["用时", formatDuration(detail.elapsed)],
    ["最佳连锁", `${detail.bestCombo.toFixed(1)}x`],
    [
      detail.status === "completed" ? "合约" : "本波合约",
      detail.status === "completed" ? `${detail.stats.contractsCompleted}/5` : `${detail.stats.contractsCompleted}/1`
    ],
    ["代号", detail.routePlan.name],
    ["区域", detail.sector.name],
    ["事件", detail.waveModifier.name],
    ["流明", String(detail.stats.lumenCollected)],
    ["信标", String(detail.stats.relaysRepaired)],
    ["擦险", String(detail.stats.closeCalls)],
    ["受击", String(detail.stats.hitsTaken)],
    ["风暴", formatSeconds(detail.stats.stormSeconds)]
  ];
  recapMetrics.replaceChildren(
    ...metrics.map(([label, value]) => {
      const item = document.createElement("span");
      const valueNode = document.createElement("b");
      valueNode.textContent = value;
      item.textContent = label;
      item.append(valueNode);
      return item;
    })
  );
  renderRecapActionPlan(detail);
  renderAchievementUnlocks(newlyUnlocked);
  recapAdvice.textContent = buildRunAdvice(detail);
  runRecap.hidden = false;
}

function renderRecapActionPlan(detail: RunEndDetail): void {
  const plan = buildRecapActionPlan(detail);
  const header = document.createElement("div");
  header.className = "recap-plan-header";

  const title = document.createElement("strong");
  title.textContent = detail.status === "won" ? "下一波作战计划" : "下一局作战计划";

  const summary = document.createElement("span");
  summary.textContent = buildRecapPlanSummary(detail);

  header.append(title, summary);
  recapActionPlan.replaceChildren(
    header,
    ...plan.map((step, index) => {
      const item = document.createElement("article");
      item.dataset.tone = step.tone;

      const badge = document.createElement("b");
      badge.textContent = String(index + 1);

      const label = document.createElement("em");
      label.textContent = step.label;

      const stepTitle = document.createElement("strong");
      stepTitle.textContent = step.title;

      const detailText = document.createElement("span");
      detailText.textContent = step.detail;

      item.append(badge, label, stepTitle, detailText);
      return item;
    })
  );
}

function buildRecapPlanSummary(detail: RunEndDetail): string {
  if (detail.status === "won") {
    return `第 ${detail.wave}/5 波完成，先看下一波预报，再按短板选升级。`;
  }
  if (detail.status === "completed") {
    return "五波救援完成，下一局可以把目标切到硬核、今日挑战或 S 级路线。";
  }
  if (detail.endReason === "chargeDepleted") {
    return `失误根因：${buildLossRootCause(detail)}。下一局先把补给路线跑顺。`;
  }
  if (detail.endReason === "hullDestroyed") {
    return `失误根因：${buildLossRootCause(detail)}。下一局先保脉冲和撤离路线。`;
  }
  return `失误根因：${buildLossRootCause(detail)}。下一局先完成主目标，再追副目标和连锁。`;
}

function buildRunEndCopy(detail: RunEndDetail): string {
  if (detail.status === "won" || detail.status === "completed") {
    return detail.message;
  }
  return `${detail.message} 失误根因：${buildLossRootCause(detail)}。${buildLossNextAction(detail)}`;
}

function buildLossRootCause(detail: RunEndDetail): string {
  if (detail.endReason === "chargeDepleted") {
    if (detail.stats.stormSeconds > 2.5) return "在紫色风暴里停留太久，电量被持续吸走";
    if (detail.stats.lumenCollected < Math.max(3, detail.wave * 2)) return "补给路线不足，开局和维修间隔没有吃够流明";
    if (detail.stats.repairSeconds > detail.wave * 12) return "低电量时硬修信标，没有利用节点锁定后撤补给";
    return "电量规划不足，推进、维修和绕路消耗叠在一起";
  }
  if (detail.endReason === "hullDestroyed") {
    if (detail.stats.pulseUses === 0) return "粉色碎片贴脸时没有使用 Q / 脉冲键清场";
    if (detail.stats.hitsTaken >= 3) return "连续穿过碎片密集线，受击后没有等恢复窗口";
    return "维修时站位过贪，碎片轨迹切进维修圈后没有先撤";
  }
  if (detail.contract.status === "failed") {
    return `战术合约“${detail.contract.name}”打乱了主路线`;
  }
  return "主目标节奏中断，补给、维修和撤离顺序没有稳定下来";
}

function buildLossNextAction(detail: RunEndDetail): string {
  if (detail.endReason === "chargeDepleted") {
    return "下一局先沿虚线补流明，修到节点后低电就撤出来补给。";
  }
  if (detail.endReason === "hullDestroyed") {
    return "下一局把脉冲留给贴脸碎片，受击后先横向拉开再回去维修。";
  }
  return "下一局先完成 4 座信标和北侧撤离，再追合约和连锁。";
}

function buildRecapActionPlan(detail: RunEndDetail): RecapPlanStep[] {
  if (detail.status === "won") {
    return buildWonRecapPlan(detail);
  }
  if (detail.status === "completed") {
    return buildCompletedRecapPlan(detail);
  }
  if (detail.endReason === "chargeDepleted") {
    return buildChargeLossRecapPlan(detail);
  }
  if (detail.endReason === "hullDestroyed") {
    return buildHullLossRecapPlan(detail);
  }
  return [
    {
      label: "开局",
      title: "先补给再维修",
      detail: "开局读图缓冲里先沿虚线补流明，再靠近蓝色信标按住修复。",
      tone: "primary"
    },
    {
      label: "中段",
      title: "主目标优先",
      detail: "合约完成或失败后都回到修信标；不要为了副目标把电量和机体打空。",
      tone: "steady"
    },
    {
      label: "收尾",
      title: "修完立刻撤离",
      detail: "4 座信标亮起后，导航会指向北侧光门，进门后才能升级和推进下一波。",
      tone: "complete"
    }
  ];
}

function buildChargeLossRecapPlan(detail: RunEndDetail): RecapPlanStep[] {
  const lowSupply = detail.stats.lumenCollected < Math.max(3, detail.wave * 3);
  const stormHeavy = detail.stats.stormSeconds > 2.5;
  return [
    {
      label: "开局",
      title: lowSupply ? "先吃 2-3 个流明" : "把补给点当作路线节点",
      detail: lowSupply
        ? "不要一开局直冲信标。先沿导航吃金色流明，把电量抬起来再开始维修。"
        : "每次维修前先确认附近金色流明位置，电量低于三分之一就先撤出来补给。",
      tone: "warning"
    },
    {
      label: "维修",
      title: "锁节点后再撤",
      detail: `本局维修了 ${formatSeconds(detail.stats.repairSeconds)}。信标每 25% 锁一个节点，电量低时先撤出补流明，再回到节点继续修。`,
      tone: "primary"
    },
    {
      label: "危险",
      title: stormHeavy ? "别在风暴里硬修" : "推进留给脱险",
      detail: stormHeavy
        ? `本局风暴停留 ${formatSeconds(detail.stats.stormSeconds)}。进紫色风暴后立刻 Space / 推进键穿出，再回头找信标。`
        : "推进不是只用来赶路；低电量时优先用它脱离风暴和碎片线。",
      tone: stormHeavy ? "warning" : "steady"
    }
  ];
}

function buildHullLossRecapPlan(detail: RunEndDetail): RecapPlanStep[] {
  const noPulse = detail.stats.pulseUses === 0;
  const manyHits = detail.stats.hitsTaken >= 3;
  return [
    {
      label: "保命",
      title: noPulse ? "碎片贴脸就按脉冲" : "脉冲后立刻拉开",
      detail: noPulse
        ? "本局没有使用 Q / 脉冲键。粉色碎片贴近时先推开，再决定是否继续修复。"
        : `本局用了 ${detail.stats.pulseUses} 次脉冲。脉冲后不要原地硬修，先移动到碎片线外侧。`,
      tone: "warning"
    },
    {
      label: "路线",
      title: manyHits ? "绕开碎片密集线" : "从外圈切入信标",
      detail: manyHits
        ? `本局受击 ${detail.stats.hitsTaken} 次。下一局优先绕外圈，等碎片轨迹错开后再推进切入。`
        : "从信标外侧切入，看到粉色轨迹线穿过维修圈时先等半秒，不要贴着碎片修。",
      tone: manyHits ? "warning" : "steady"
    },
    {
      label: "升级",
      title: "优先曜盾或棱镜脉冲",
      detail: "如果下一波仍常被撞，胜利后优先选曜盾机体；如果是贴脸来不及躲，选棱镜脉冲。",
      tone: "primary"
    }
  ];
}

function buildWonRecapPlan(detail: RunEndDetail): RecapPlanStep[] {
  const nextWave = Math.min(detail.wave + 1, 5);
  return [
    {
      label: "升级",
      title: "先补短板再冲分",
      detail: buildUpgradeAdvice(detail),
      tone: "primary"
    },
    {
      label: "预报",
      title: `读第 ${nextWave}/5 波区域和合约`,
      detail: "升级卡上会显示下一波区域、事件和合约；先按合约规划路线，再决定是否冒险抢连锁。",
      tone: "steady"
    },
    {
      label: "目标",
      title: detail.contract.status === "completed" ? "延续合约节奏" : "先稳主目标",
      detail:
        detail.contract.status === "completed"
          ? `本波合约“${detail.contract.name}”已完成。下一波继续先读合约，再修信标撤离。`
          : `本波合约“${detail.contract.name}”未完成。下一波先保证 4 座信标和撤离，再追副目标。`,
      tone: detail.contract.status === "completed" ? "complete" : "warning"
    }
  ];
}

function buildCompletedRecapPlan(detail: RunEndDetail): RecapPlanStep[] {
  return [
    {
      label: "复盘",
      title: detail.stats.hitsTaken <= 2 ? "路线已经稳定" : "先减少碰撞",
      detail:
        detail.stats.hitsTaken <= 2
          ? "五波已经跑通，下一局可以把目标切到更高难度、今日挑战或 S 级时间。"
          : `通关但受击 ${detail.stats.hitsTaken} 次。下一局先保脉冲、绕碎片，再追连锁。`,
      tone: detail.stats.hitsTaken <= 2 ? "complete" : "warning"
    },
    {
      label: "冲分",
      title: "把合约当路线骨架",
      detail: `本局完成 ${detail.stats.contractsCompleted}/5 个合约。想冲 A/S，开波先读合约，再安排补给和维修顺序。`,
      tone: "primary"
    },
    {
      label: "挑战",
      title: detail.difficulty === "hardcore" ? "冲今日最佳" : "切硬核或今日挑战",
      detail:
        detail.difficulty === "hardcore"
          ? "硬核已通关，接下来用固定每日路线压时间、保无损、冲 S 级。"
          : "标准通关后可以尝试硬核，或用今日挑战固定代号反复优化路线。",
      tone: "steady"
    }
  ];
}

function renderContractRecap(contract: ContractSnapshot): void {
  contractRecap.hidden = false;
  contractRecap.dataset.status = contract.status;
  const statusText = contract.status === "completed" ? "完成" : contract.status === "failed" ? "失败" : "进行中";
  contractRecapTitle.textContent = `战术合约：${contract.name} · ${statusText}`;
  contractRecapDetail.textContent =
    contract.status === "completed"
      ? `${contract.requirement}，奖励 ${contract.rewardScore.toLocaleString()} 分已结算。`
      : `${contract.requirement}。${contract.progress}`;
}

function updateAchievementUi(): void {
  const summaries = getAchievementSummaries(saveData.achievements);
  const unlockedCount = summaries.filter((summary) => summary.unlocked).length;
  const nextTargets = summaries.filter((summary) => !summary.unlocked).slice(0, 3);
  const completedTargets = summaries.filter((summary) => summary.unlocked).slice(-2);
  const targets = nextTargets.length > 0 ? nextTargets : completedTargets;

  const header = document.createElement("div");
  header.className = "achievement-header";
  header.innerHTML = `<strong>成就 ${unlockedCount}/${summaries.length}</strong><span>${buildAchievementStatusText(unlockedCount, summaries.length)}</span>`;

  achievementStrip.replaceChildren(
    header,
    ...targets.map((summary) => {
      const item = document.createElement("article");
      item.className = "achievement-card";
      item.classList.toggle("unlocked", summary.unlocked);
      item.innerHTML = `
        <strong>${summary.unlocked ? "已完成" : "挑战"} · ${summary.name}</strong>
        <span>${summary.unlocked ? summary.description : summary.requirement}</span>
      `;
      return item;
    })
  );
}

function updateRunHistoryUi(): void {
  const header = document.createElement("div");
  header.className = "run-history-header";
  const headerTitle = document.createElement("strong");
  headerTitle.textContent = "航行日志";
  const headerDetail = document.createElement("span");
  headerDetail.textContent =
    saveData.runHistory.length > 0 ? "最近路线、评级和合约表现。" : "完成一局后会记录最近路线。";
  header.append(headerTitle, headerDetail);

  if (saveData.runHistory.length === 0) {
    const empty = document.createElement("article");
    empty.className = "run-history-empty";
    empty.textContent = "暂无记录。先完成或失败一局，日志会保留最近 5 次救援。";
    runHistory.replaceChildren(header, empty);
    return;
  }

  runHistory.replaceChildren(header, ...saveData.runHistory.slice(0, 3).map(createRunHistoryCard));
}

function createRunHistoryCard(entry: RunHistoryEntry): HTMLElement {
  const card = document.createElement("article");
  card.className = "run-history-card";
  card.dataset.grade = entry.ratingId;

  const grade = document.createElement("b");
  grade.textContent = entry.ratingId;

  const title = document.createElement("strong");
  title.textContent = `${entry.routeName} · ${getRunStatusLabel(entry.status)}`;

  const score = document.createElement("span");
  score.textContent = `${DIFFICULTY_SETTINGS[entry.difficulty].name} / ${entry.score.toLocaleString()} 分 / 第 ${entry.wave}/5 波`;

  const detail = document.createElement("em");
  detail.textContent = `${entry.ratingName} · 合约 ${entry.contractsCompleted}/5 · ${getContractStatusLabel(entry.contractStatus)} · ${formatDuration(entry.elapsed)}`;

  const replayButton = document.createElement("button");
  replayButton.type = "button";
  replayButton.textContent = "重跑路线";
  replayButton.addEventListener("click", () => replayRunHistory(entry));

  card.append(grade, title, score, detail, replayButton);
  return card;
}

function replayRunHistory(entry: RunHistoryEntry): void {
  void audioBus.unlock();
  audioBus.play("start");
  selectedDifficulty = entry.difficulty;
  saveData.selectedDifficulty = selectedDifficulty;
  saveSave(saveData);
  updateDifficultyUi();
  disarmResetSave();
  overlay.classList.remove("show");
  hideTacticalScan();
  latestWaveIntroKey = "";
  hideWaveIntro(true);
  runRecap.hidden = true;
  achievementUnlocks.hidden = true;
  upgradeChoices.hidden = true;
  window.dispatchEvent(
    new CustomEvent("game:start", {
      detail: { difficulty: entry.difficulty, routeSeed: entry.routeSeed }
    })
  );
}

function renderAchievementUnlocks(newlyUnlocked: AchievementId[]): void {
  achievementUnlocks.hidden = newlyUnlocked.length === 0;
  if (achievementUnlocks.hidden) {
    achievementUnlocks.replaceChildren();
    return;
  }
  achievementUnlocks.replaceChildren(
    ...newlyUnlocked.map((id) => {
      const achievement = ACHIEVEMENTS[id];
      const item = document.createElement("span");
      item.innerHTML = `<b>新成就：${achievement.name}</b>${achievement.description}`;
      return item;
    })
  );
}

function buildAchievementStatusText(unlockedCount: number, total: number): string {
  if (unlockedCount === 0) return "先完成第一座信标，建立救援节奏。";
  if (unlockedCount < total) return "继续挑战无损、S 级和完整通关。";
  return "成就全解锁，下一步冲击硬核高分。";
}

function buildRunAdvice(detail: RunEndDetail): string {
  const { stats } = detail;
  if ((detail.status === "won" || detail.status === "completed") && detail.contract.status === "failed") {
    return `复盘：主目标完成了，但战术合约“${detail.contract.name}”没达成。下一次先围绕合约规划路线，再决定是否冒险修复。`;
  }
  if ((detail.status === "won" || detail.status === "completed") && detail.contract.status === "completed") {
    return detail.status === "completed"
      ? `复盘：最终合约“${detail.contract.name}”已完成，整轮路线目标很清楚。下一局可以挑战更高难度或冲 S 级高分。`
      : `复盘：本波合约“${detail.contract.name}”已完成，说明路线目标很清楚。下一波继续先读合约，再选择升级和路线。`;
  }
  if (detail.status === "completed") {
    return stats.hitsTaken <= 2
      ? "复盘：这次救援很干净。下一目标可以挑战硬核，重点保持连锁倍率冲高分。"
      : "复盘：已经通关。想继续提分，优先减少碰撞，连锁被打断会损失大量分数。";
  }
  if (detail.status === "won") {
    if (stats.hitsTaken === 0) {
      return "复盘：本轮路线很稳。下一波威胁会增加，可以优先升级引擎或电容来保留节奏。";
    }
    return "复盘：已经稳定本波。升级时按短板选择：缺电选电容，常撞碎片选曜盾，修复压力大选信标织机。";
  }
  if (detail.endReason === "chargeDepleted") {
    if (stats.lumenCollected < Math.max(3, detail.wave * 3)) {
      return "下一次建议：先规划金色流明路线再修信标，电量低时不要硬修。";
    }
    if (stats.stormSeconds > 2.5) {
      return "下一次建议：紫色风暴停留太久，推进穿出风暴后再回头修复。";
    }
    return "下一次建议：修复会持续耗电，修到一半也可以先离开补流明再回来。";
  }
  if (detail.endReason === "hullDestroyed") {
    if (stats.pulseUses === 0) {
      return "下一次建议：粉色碎片靠近时按 Q / 脉冲键推开，别把脉冲留到机体见底。";
    }
    if (stats.hitsTaken >= 3) {
      return "下一次建议：碰撞过多会清空连锁，先绕开碎片密集区，再用推进切入信标。";
    }
    return "下一次建议：受击后有短暂无敌，利用这段时间拉开距离，不要原地继续修。";
  }
  return "下一次建议：先补给、再修复、最后撤离；保持移动比贪一次修复更重要。";
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remaining = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${String(remaining).padStart(2, "0")}` : `${remaining}秒`;
}

function formatSeconds(seconds: number): string {
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}秒`;
}

function getRequestedRouteSeed(): number | undefined {
  const params = new URLSearchParams(window.location.search);
  return parseRouteSeed(params.get("route") ?? params.get("seed"));
}

function getDailyChallenge(date = new Date()): { key: string; label: string; routeName: string; seed: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const seed = hashDailyChallengeKey(key);
  return {
    key,
    label: `${month}月${day}日今日挑战`,
    routeName: getRoutePlan(seed).name,
    seed
  };
}

function buildDailyChallengeDetail(daily: ReturnType<typeof getDailyChallenge>): string {
  const best = saveData.dailyBest;
  if (!best || best.key !== daily.key || best.routeSeed !== daily.seed) {
    return `${daily.label}固定代号 ${daily.routeName}。完成一局后会记录今日最佳。`;
  }
  return `今日最佳：${DIFFICULTY_SETTINGS[best.difficulty].name} / ${best.score.toLocaleString()} 分 / ${best.ratingId} ${best.ratingName} / 第 ${best.wave}/5 波 / ${formatDuration(best.elapsed)}。`;
}

function persistDailyBest(detail: RunEndDetail): void {
  const daily = getDailyChallenge();
  if (detail.routePlan.seed !== daily.seed) return;
  const next = createDailyBestEntry(detail, daily.key);
  const previous = saveData.dailyBest;
  if (!previous || previous.key !== daily.key || previous.routeSeed !== daily.seed || isBetterDailyBest(next, previous)) {
    saveData.dailyBest = next;
  }
}

function createDailyBestEntry(detail: RunEndDetail, key: string): DailyBestEntry {
  return {
    key,
    difficulty: detail.difficulty,
    elapsed: detail.elapsed,
    ratingId: detail.rating.id,
    ratingName: detail.rating.name,
    routeName: detail.routePlan.name,
    routeSeed: detail.routePlan.seed,
    score: detail.score,
    timestamp: Date.now(),
    wave: detail.wave
  };
}

function isBetterDailyBest(next: DailyBestEntry, previous: DailyBestEntry): boolean {
  if (next.score !== previous.score) return next.score > previous.score;
  if (next.wave !== previous.wave) return next.wave > previous.wave;
  if (ratingValue(next.ratingId) !== ratingValue(previous.ratingId)) {
    return ratingValue(next.ratingId) > ratingValue(previous.ratingId);
  }
  return next.elapsed < previous.elapsed;
}

function ratingValue(id: RunRating["id"]): number {
  const values: Record<RunRating["id"], number> = { S: 4, A: 3, B: 2, C: 1 };
  return values[id];
}

function hashDailyChallengeKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % 1679615 + 1;
}

function createDefaultSave(): SaveData {
  return {
    achievements: [],
    audioEnabled: true,
    bestCombo: 1,
    bestContracts: 0,
    bestScore: 0,
    bestWave: 1,
    clears: 0,
    dailyBest: undefined,
    largeLabels: false,
    reducedMotion: false,
    runHistory: [],
    selectedDifficulty: "standard",
    totalContracts: 0
  };
}

function loadSave(): SaveData {
  const fallback = createDefaultSave();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const selected =
      parsed.selectedDifficulty && parsed.selectedDifficulty in DIFFICULTY_SETTINGS
        ? parsed.selectedDifficulty
        : fallback.selectedDifficulty;
    return {
      audioEnabled: parsed.audioEnabled ?? fallback.audioEnabled,
      achievements: parseAchievements(parsed.achievements),
      bestCombo: finiteNumber(parsed.bestCombo, fallback.bestCombo),
      bestContracts: finiteNumber(parsed.bestContracts, fallback.bestContracts),
      bestScore: finiteNumber(parsed.bestScore, fallback.bestScore),
      bestWave: finiteNumber(parsed.bestWave, fallback.bestWave),
      clears: finiteNumber(parsed.clears, fallback.clears),
      dailyBest: parseDailyBest(parsed.dailyBest),
      largeLabels: Boolean(parsed.largeLabels ?? fallback.largeLabels),
      reducedMotion: Boolean(parsed.reducedMotion ?? fallback.reducedMotion),
      runHistory: parseRunHistory(parsed.runHistory),
      selectedDifficulty: selected,
      totalContracts: finiteNumber(parsed.totalContracts, fallback.totalContracts)
    };
  } catch {
    return fallback;
  }
}

function saveSave(next: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is optional; gameplay should keep working if the browser blocks it.
  }
}

function finiteNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value ?? fallback);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function parseAchievements(value: unknown): AchievementId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is AchievementId => typeof id === "string" && id in ACHIEVEMENTS);
}

function parseRunHistory(value: unknown): RunHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeRunHistoryEntry(entry))
    .filter((entry): entry is RunHistoryEntry => Boolean(entry))
    .slice(0, 5);
}

function parseDailyBest(value: unknown): DailyBestEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<DailyBestEntry>;
  const difficulty = entry.difficulty && entry.difficulty in DIFFICULTY_SETTINGS ? entry.difficulty : "standard";
  const ratingId = isRatingId(entry.ratingId) ? entry.ratingId : "C";
  const routeSeed = Number(entry.routeSeed);
  if (!Number.isFinite(routeSeed) || routeSeed <= 0 || typeof entry.key !== "string") {
    return undefined;
  }
  return {
    key: entry.key.slice(0, 16),
    difficulty,
    elapsed: Math.max(0, finiteNumber(entry.elapsed, 0)),
    ratingId,
    ratingName: typeof entry.ratingName === "string" ? entry.ratingName.slice(0, 16) : "信号残缺",
    routeName: typeof entry.routeName === "string" ? entry.routeName.slice(0, 24) : getRoutePlan(routeSeed).name,
    routeSeed,
    score: Math.max(0, Math.round(finiteNumber(entry.score, 0))),
    timestamp: finiteNumber(entry.timestamp, Date.now()),
    wave: Math.max(1, Math.min(5, Math.round(finiteNumber(entry.wave, 1))))
  };
}

function normalizeRunHistoryEntry(value: unknown): RunHistoryEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<RunHistoryEntry>;
  const difficulty = entry.difficulty && entry.difficulty in DIFFICULTY_SETTINGS ? entry.difficulty : "standard";
  const status = isRunHistoryStatus(entry.status) ? entry.status : "lost";
  const contractStatus = isContractStatus(entry.contractStatus) ? entry.contractStatus : "failed";
  const ratingId = isRatingId(entry.ratingId) ? entry.ratingId : "C";
  const routeSeed = normalizeHistoryRouteSeed(entry.routeSeed, entry.routeName);
  return {
    id: typeof entry.id === "string" ? entry.id : `legacy-${Date.now()}`,
    bestCombo: finiteNumber(entry.bestCombo, 1),
    contractStatus,
    contractsCompleted: Math.max(0, Math.min(5, Math.round(finiteNumber(entry.contractsCompleted, 0)))),
    difficulty,
    elapsed: Math.max(0, finiteNumber(entry.elapsed, 0)),
    ratingId,
    ratingName: typeof entry.ratingName === "string" ? entry.ratingName : "信号残缺",
    routeSeed,
    routeName: typeof entry.routeName === "string" ? entry.routeName.slice(0, 24) : "星桥-0000",
    score: Math.max(0, Math.round(finiteNumber(entry.score, 0))),
    status,
    timestamp: finiteNumber(entry.timestamp, Date.now()),
    wave: Math.max(1, Math.min(5, Math.round(finiteNumber(entry.wave, 1))))
  };
}

function createRunHistoryEntry(detail: RunEndDetail): RunHistoryEntry {
  return {
    id: `${Date.now()}-${detail.routePlan.code}-${detail.wave}`,
    bestCombo: detail.bestCombo,
    contractStatus: detail.contract.status,
    contractsCompleted: detail.campaignStats.contractsCompleted,
    difficulty: detail.difficulty,
    elapsed: detail.elapsed,
    ratingId: detail.rating.id,
    ratingName: detail.rating.name,
    routeName: detail.routePlan.name,
    routeSeed: detail.routePlan.seed,
    score: detail.score,
    status: detail.status,
    timestamp: Date.now(),
    wave: detail.wave
  };
}

function getRunStatusLabel(status: RunEndDetail["status"]): string {
  if (status === "completed") return "全域稳定";
  if (status === "won") return "救援成功";
  return "信号中断";
}

function getContractStatusLabel(status: ContractSnapshot["status"]): string {
  if (status === "completed") return "合约完成";
  if (status === "failed") return "合约失败";
  return "合约进行中";
}

function isRunHistoryStatus(value: unknown): value is RunEndDetail["status"] {
  return value === "won" || value === "completed" || value === "lost";
}

function isContractStatus(value: unknown): value is ContractSnapshot["status"] {
  return value === "active" || value === "completed" || value === "failed";
}

function isRatingId(value: unknown): value is RunRating["id"] {
  return value === "S" || value === "A" || value === "B" || value === "C";
}

function normalizeHistoryRouteSeed(seed: unknown, routeName: unknown): number {
  const numericSeed = Number(seed);
  if (Number.isFinite(numericSeed) && numericSeed > 0) {
    return numericSeed;
  }
  return parseRouteSeed(typeof routeName === "string" ? routeName : undefined) ?? 1;
}

type SoundKind =
  | "boost"
  | "button"
  | "closeCall"
  | "contract"
  | "hit"
  | "loss"
  | "pickup"
  | "pulse"
  | "repair"
  | "score"
  | "start"
  | "win";

class AudioBus {
  private context?: AudioContext;

  constructor(private readonly enabled: () => boolean) {}

  async unlock(): Promise<void> {
    if (!this.enabled()) return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  play(kind: SoundKind): void {
    if (!this.enabled() || !this.context) return;
    const sounds: Record<SoundKind, Array<[number, number, number]>> = {
      boost: [[160, 0.07, 0.035], [260, 0.06, 0.026]],
      button: [[520, 0.04, 0.02]],
      closeCall: [[820, 0.035, 0.026], [1180, 0.055, 0.022]],
      contract: [[620, 0.06, 0.032], [920, 0.08, 0.028], [1240, 0.1, 0.024]],
      hit: [[130, 0.11, 0.05], [82, 0.13, 0.035]],
      loss: [[180, 0.12, 0.04], [120, 0.18, 0.035]],
      pickup: [[660, 0.05, 0.035], [980, 0.07, 0.028]],
      pulse: [[260, 0.06, 0.035], [720, 0.12, 0.025]],
      repair: [[420, 0.08, 0.03], [760, 0.1, 0.03]],
      score: [[760, 0.035, 0.022]],
      start: [[300, 0.05, 0.025], [540, 0.08, 0.025]],
      win: [[520, 0.08, 0.035], [760, 0.09, 0.03], [1120, 0.12, 0.025]]
    };
    sounds[kind].forEach(([frequency, duration, volume], index) => {
      this.tone(frequency, duration, volume, index * 0.055);
    });
  }

  private tone(frequency: number, duration: number, volume: number, delay: number): void {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

audioBus = new AudioBus(() => saveData.audioEnabled);
setShellStatus(latestStatus);
setShellBriefingActive(false);
updateDifficultyUi();
updateAudioUi();
updateSettingsUi();
updateDailyChallengeUi();
updateRecordUi();
updateAchievementUi();
updateRunHistoryUi();
updateSessionTools();
new MutationObserver(syncOverlayState).observe(overlay, { attributeFilter: ["class"], attributes: true });
syncOverlayState();
completeBootStatus();
