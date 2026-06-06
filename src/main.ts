import Phaser from "phaser";
import { GameScene } from "./game/GameScene";
import {
  ACHIEVEMENTS,
  DIFFICULTY_SETTINGS,
  UPGRADE_CATALOG,
  getAchievementSummaries,
  getRoutePlan,
  getUnlockedAchievementsForRun,
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

const shell = document.querySelector<HTMLDivElement>("#shell")!;
const overlay = document.querySelector<HTMLDivElement>("#overlay")!;
const objectiveTitle = document.querySelector<HTMLElement>("#objective-title")!;
const objectiveDetail = document.querySelector<HTMLElement>("#objective-detail")!;
const startButton = document.querySelector<HTMLButtonElement>("#start-button")!;
const sessionTools = document.querySelector<HTMLDivElement>("#session-tools")!;
const copyRouteButton = document.querySelector<HTMLButtonElement>("#copy-route-button")!;
const restartRouteButton = document.querySelector<HTMLButtonElement>("#restart-route-button")!;
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
const coachDetail = document.querySelector<HTMLElement>("#coach-detail")!;
const coachProgress = document.querySelector<HTMLElement>("#coach-progress")!;
const pilotTip = document.querySelector<HTMLDivElement>("#pilot-tip")!;
const pilotTipTitle = document.querySelector<HTMLElement>("#pilot-tip-title")!;
const pilotTipDetail = document.querySelector<HTMLElement>("#pilot-tip-detail")!;
const missionText = document.querySelector<HTMLElement>("#mission-text")!;
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
const missionBrief = document.querySelector<HTMLDivElement>("#mission-brief")!;
const fieldGuide = document.querySelector<HTMLDivElement>("#field-guide")!;
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
const achievementUnlocks = document.querySelector<HTMLDivElement>("#achievement-unlocks")!;
const recapAdvice = document.querySelector<HTMLElement>("#recap-advice")!;
const touchStick = document.querySelector<HTMLDivElement>("#touch-stick")!;
const touchStickKnob = document.querySelector<HTMLSpanElement>("#touch-stick span")!;
const touchButtons = document.querySelectorAll<HTMLButtonElement>("[data-touch-action]");
const STORAGE_KEY = "lumen-drift-save-v1";

type SaveData = {
  achievements: AchievementId[];
  audioEnabled: boolean;
  bestCombo: number;
  bestContracts: number;
  bestScore: number;
  bestWave: number;
  clears: number;
  dailyBest?: DailyBestEntry;
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

type RunEndDetail = {
  bestCombo: number;
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
let latestStatus: GameStatus = "menu";
let latestScore = 0;
let latestWave = 1;
let latestBestCombo = 1;
let latestDifficulty: DifficultyId = "standard";
let latestRoutePlan: RoutePlan | undefined;
let saveData = loadSave();
let selectedDifficulty: DifficultyId = saveData.selectedDifficulty;
let audioBus: AudioBus;
let resetSaveArmed = false;
let resetSaveTimer: number | undefined;

window.__lumenVirtualInput = {
  move: { x: 0, y: 0 },
  boost: false,
  repair: false,
  pulse: false
};

startButton.addEventListener("click", () => {
  launchRun();
});

resumeButton.addEventListener("click", () => {
  audioBus.play("button");
  overlay.classList.remove("show");
  disarmResetSave();
  window.dispatchEvent(new CustomEvent("game:resume"));
});

helpButton.addEventListener("click", () => {
  audioBus.play("button");
  showHelpOverlay();
});

mobilePauseButton.addEventListener("click", () => {
  audioBus.play("button");
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
  disarmResetSave();
  runRecap.hidden = true;
  achievementUnlocks.hidden = true;
  upgradeChoices.hidden = true;
  const runDifficulty = latestStatus === "won" ? latestDifficulty : selectedDifficulty;
  const routeSeed = latestStatus === "won" ? undefined : getRequestedRouteSeed();
  window.dispatchEvent(new CustomEvent("game:start", { detail: { difficulty: runDifficulty, routeSeed, upgradeId } }));
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
  disarmResetSave();
  runRecap.hidden = true;
  achievementUnlocks.hidden = true;
  upgradeChoices.hidden = true;
  window.dispatchEvent(
    new CustomEvent("game:start", {
      detail: { difficulty: selectedDifficulty, routeSeed: daily.seed }
    })
  );
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
    coachDirective: CoachDirective;
    objectiveHint: ObjectiveHint;
    resourceAlerts: ResourceAlerts;
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
  latestScore = detail.score;
  latestWave = detail.wave;
  latestBestCombo = detail.bestCombo;
  latestDifficulty = detail.difficulty;
  latestRoutePlan = detail.routePlan;
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
  const showPilotTip = detail.status === "playing" && detail.coachDirective.id === "readContract";
  pilotTip.hidden = !showPilotTip;
  pilotTip.classList.toggle("urgent", detail.objectiveHint.urgent);
  pilotTip.dataset.kind = detail.objectiveHint.kind;
  pilotTipTitle.textContent = detail.objectiveHint.title;
  pilotTipDetail.textContent = detail.objectiveHint.detail;
  missionText.textContent = detail.message;
  objectiveTitle.textContent = `目标：第 ${detail.wave}/${detail.campaignWaves} 波，修复 ${detail.relays} 座信标`;
  objectiveDetail.textContent = `${DIFFICULTY_SETTINGS[detail.difficulty].name}模式 / 救援代号 ${detail.routePlan.name} / ${detail.sector.name} / ${detail.waveModifier.name}：${detail.sector.briefing} ${detail.waveModifier.briefing}`;
  latestUpgradeChoices = detail.upgradeChoices;
});

window.addEventListener("game:ended", (event) => {
  const detail = (event as CustomEvent).detail as RunEndDetail;
  latestStatus = detail.status;
  setShellStatus(detail.status);
  latestScore = detail.score;
  latestWave = detail.wave;
  latestBestCombo = detail.bestCombo;
  latestDifficulty = detail.difficulty;
  latestRoutePlan = detail.routePlan;
  const newlyUnlocked = persistRunResult(detail);
  overlay.classList.add("show");
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
  overlayCopy.textContent = detail.message;
  missionBrief.hidden = true;
  fieldGuide.hidden = true;
  renderRunRecap(detail, newlyUnlocked);
  updateNextRunPanel(detail);
  updateSessionTools();
  startButton.textContent =
    detail.status === "completed" ? "再次救援" : detail.status === "won" ? "不升级，进入下一波" : "重新救援";
  upgradeChoices.hidden = detail.status !== "won";
  if (detail.status === "won") {
    renderUpgradeChoices();
  }
});

window.addEventListener("game:feedback", (event) => {
  const detail = (event as CustomEvent).detail as { kind: SoundKind };
  audioBus.play(detail.kind);
});

function renderUpgradeChoices(): void {
  const choices = latestUpgradeChoices.length > 0 ? latestUpgradeChoices : Object.values(UPGRADE_CATALOG).slice(0, 3);
  const summaries = new Map(latestUpgradeSummaries.map((summary) => [summary.id, summary]));
  upgradeChoices.replaceChildren(
    ...choices.map((choice) => {
      const summary = summaries.get(choice.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-option";
      button.innerHTML = `
        <strong>${choice.name} <small>Lv ${summary?.level ?? 0}/${summary?.maxLevel ?? 3}</small></strong>
        <span>${choice.description}</span>
        <em>当前：${summary?.currentEffect ?? "基础配置"}</em>
        <em>升级后：${summary?.nextEffect ?? "已满级"}</em>
      `;
      button.addEventListener("click", () => launchRun(choice.id));
      return button;
    })
  );
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
  coachTitle.textContent = directive.title;
  coachStep.textContent = `${directive.step}/${directive.totalSteps}`;
  coachDetail.textContent = directive.detail;
  coachProgress.textContent = directive.progress;
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

function showHelpOverlay(): void {
  if (latestStatus === "playing") {
    window.dispatchEvent(new CustomEvent("game:pause"));
    latestStatus = "paused";
    setShellStatus(latestStatus);
  }
  overlay.classList.add("show");
  achievementStrip.hidden = false;
  runHistory.hidden = true;
  updateAchievementUi();
  setDifficultyPickerVisible(latestStatus === "menu" || latestStatus === "lost" || latestStatus === "completed");
  overlayEyebrow.textContent = "玩法说明";
  overlayTitle.textContent = "维修、连锁、撤离";
  overlayCopy.textContent =
    "目标不是乱飞，而是在电量压力下规划路线：先补流明，再修信标，最后从北侧光门撤离。";
  runRecap.hidden = true;
  missionBrief.hidden = false;
  fieldGuide.hidden = false;
  howToPlay.hidden = false;
  updateNextRunPanel();
  upgradeChoices.hidden = true;
  startButton.hidden = latestStatus === "paused";
  resumeButton.hidden = latestStatus !== "paused";
  updateSessionTools();
  if (latestStatus !== "paused") {
    startButton.textContent = "开始救援";
  }
}

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "h") {
    showHelpOverlay();
  }
  if (event.key === "Escape" && latestStatus === "paused") {
    overlay.classList.remove("show");
    disarmResetSave();
    window.dispatchEvent(new CustomEvent("game:resume"));
  }
});

function ratio(value: number, max: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
}

touchStick.addEventListener("pointerdown", (event) => {
  touchStick.setPointerCapture(event.pointerId);
  updateStick(event);
});

touchStick.addEventListener("pointermove", (event) => {
  if (touchStick.hasPointerCapture(event.pointerId)) {
    updateStick(event);
  }
});

touchStick.addEventListener("pointerup", resetStick);
touchStick.addEventListener("pointercancel", resetStick);

touchButtons.forEach((button) => {
  const action = button.dataset.touchAction as "boost" | "repair" | "pulse";
  button.addEventListener("pointerdown", () => {
    window.__lumenVirtualInput![action] = true;
  });
  button.addEventListener("pointerup", () => {
    window.__lumenVirtualInput![action] = false;
  });
  button.addEventListener("pointercancel", () => {
    window.__lumenVirtualInput![action] = false;
  });
  button.addEventListener("pointerleave", () => {
    window.__lumenVirtualInput![action] = false;
  });
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

function resetStick(): void {
  touchStickKnob.style.setProperty("--stick-x", "0px");
  touchStickKnob.style.setProperty("--stick-y", "0px");
  window.__lumenVirtualInput!.move = { x: 0, y: 0 };
}

function updateDifficultyUi(): void {
  difficultyButtons.forEach((button) => {
    const active = button.dataset.difficulty === selectedDifficulty;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const difficulty = DIFFICULTY_SETTINGS[selectedDifficulty];
  difficultyDetail.textContent = `${difficulty.name}模式：${difficulty.description}`;
  updateDailyChallengeUi();
  updateNextRunPanel();
}

function updateAudioUi(): void {
  audioToggle.textContent = saveData.audioEnabled ? "音效 开" : "音效 关";
  audioToggle.setAttribute("aria-pressed", String(saveData.audioEnabled));
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
      return "首次目标：先捡 2 个金色流明，再修复第一座蓝色信标。";
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
      : "电量归零：修到一半可以先离开补流明，再回到信标继续。";
  }
  if (detail.endReason === "hullDestroyed") {
    return detail.stats.pulseUses === 0
      ? "机体损毁：粉色碎片贴近时用 Q 脉冲，不要把技能留到失败。"
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
  saveData.bestContracts = Math.max(saveData.bestContracts, detail.stats.contractsCompleted);
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
    ["合约", `${detail.stats.contractsCompleted}/5`],
    ["代号", detail.routePlan.name],
    ["区域", detail.sector.name],
    ["事件", detail.waveModifier.name],
    ["流明", String(detail.stats.lumenCollected)],
    ["信标", String(detail.stats.relaysRepaired)],
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
  renderAchievementUnlocks(newlyUnlocked);
  recapAdvice.textContent = buildRunAdvice(detail);
  runRecap.hidden = false;
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
      return "下一次建议：粉色碎片靠近时按 Q 脉冲推开，别把脉冲留到机体见底。";
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
    contractsCompleted: detail.stats.contractsCompleted,
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
  | "contract"
  | "hit"
  | "loss"
  | "pickup"
  | "pulse"
  | "repair"
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
      contract: [[620, 0.06, 0.032], [920, 0.08, 0.028], [1240, 0.1, 0.024]],
      hit: [[130, 0.11, 0.05], [82, 0.13, 0.035]],
      loss: [[180, 0.12, 0.04], [120, 0.18, 0.035]],
      pickup: [[660, 0.05, 0.035], [980, 0.07, 0.028]],
      pulse: [[260, 0.06, 0.035], [720, 0.12, 0.025]],
      repair: [[420, 0.08, 0.03], [760, 0.1, 0.03]],
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
updateDifficultyUi();
updateAudioUi();
updateDailyChallengeUi();
updateRecordUi();
updateAchievementUi();
updateRunHistoryUi();
updateSessionTools();
