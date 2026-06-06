import Phaser from "phaser";
import { GameScene } from "./game/GameScene";
import {
  DIFFICULTY_SETTINGS,
  UPGRADE_CATALOG,
  type DifficultyId,
  type GameStatus,
  type ObjectiveHint,
  type ResourceAlerts,
  type RunEndReason,
  type RunRating,
  type RunStats,
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

const overlay = document.querySelector<HTMLDivElement>("#overlay")!;
const objectiveTitle = document.querySelector<HTMLElement>("#objective-title")!;
const objectiveDetail = document.querySelector<HTMLElement>("#objective-detail")!;
const startButton = document.querySelector<HTMLButtonElement>("#start-button")!;
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
const boostPill = document.querySelector<HTMLElement>("#boost-pill")!;
const pulsePill = document.querySelector<HTMLElement>("#pulse-pill")!;
const loadoutStrip = document.querySelector<HTMLDivElement>("#loadout-strip")!;
const waveEvent = document.querySelector<HTMLDivElement>("#wave-event")!;
const waveEventTitle = document.querySelector<HTMLElement>("#wave-event-title")!;
const waveEventDetail = document.querySelector<HTMLElement>("#wave-event-detail")!;
const pilotTip = document.querySelector<HTMLDivElement>("#pilot-tip")!;
const pilotTipTitle = document.querySelector<HTMLElement>("#pilot-tip-title")!;
const pilotTipDetail = document.querySelector<HTMLElement>("#pilot-tip-detail")!;
const missionText = document.querySelector<HTMLElement>("#mission-text")!;
const upgradeChoices = document.querySelector<HTMLDivElement>("#upgrade-choices")!;
const helpButton = document.querySelector<HTMLButtonElement>("#help-button")!;
const resumeButton = document.querySelector<HTMLButtonElement>("#resume-button")!;
const difficultyPicker = document.querySelector<HTMLDivElement>("#difficulty-picker")!;
const difficultyButtons = document.querySelectorAll<HTMLButtonElement>("[data-difficulty]");
const difficultyDetail = document.querySelector<HTMLElement>("#difficulty-detail")!;
const audioToggle = document.querySelector<HTMLButtonElement>("#audio-toggle")!;
const overlayEyebrow = overlay.querySelector<HTMLElement>(".eyebrow")!;
const overlayTitle = overlay.querySelector<HTMLElement>("h1")!;
const overlayCopy = overlay.querySelector<HTMLElement>("p")!;
const howToPlay = document.querySelector<HTMLDivElement>("#how-to-play")!;
const runRecap = document.querySelector<HTMLDivElement>("#run-recap")!;
const recapRating = document.querySelector<HTMLDivElement>("#recap-rating")!;
const recapRatingGrade = document.querySelector<HTMLElement>("#recap-rating-grade")!;
const recapRatingName = document.querySelector<HTMLElement>("#recap-rating-name")!;
const recapRatingDetail = document.querySelector<HTMLElement>("#recap-rating-detail")!;
const recapMetrics = document.querySelector<HTMLDivElement>("#recap-metrics")!;
const recapAdvice = document.querySelector<HTMLElement>("#recap-advice")!;
const touchStick = document.querySelector<HTMLDivElement>("#touch-stick")!;
const touchStickKnob = document.querySelector<HTMLSpanElement>("#touch-stick span")!;
const touchButtons = document.querySelectorAll<HTMLButtonElement>("[data-touch-action]");
const STORAGE_KEY = "lumen-drift-save-v1";

type SaveData = {
  audioEnabled: boolean;
  bestCombo: number;
  bestScore: number;
  bestWave: number;
  clears: number;
  selectedDifficulty: DifficultyId;
};

type RunEndDetail = {
  bestCombo: number;
  charge: number;
  difficulty: DifficultyId;
  elapsed: number;
  endReason: RunEndReason;
  hull: number;
  message: string;
  rating: RunRating;
  score: number;
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
let saveData = loadSave();
let selectedDifficulty: DifficultyId = saveData.selectedDifficulty;
let audioBus: AudioBus;

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
  window.dispatchEvent(new CustomEvent("game:resume"));
});

helpButton.addEventListener("click", () => {
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

function launchRun(upgradeId?: UpgradeId): void {
  void audioBus.unlock();
  audioBus.play("start");
  overlay.classList.remove("show");
  runRecap.hidden = true;
  upgradeChoices.hidden = true;
  const runDifficulty = latestStatus === "won" ? latestDifficulty : selectedDifficulty;
  window.dispatchEvent(new CustomEvent("game:start", { detail: { difficulty: runDifficulty, upgradeId } }));
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
    bestCombo: number;
    boostReady: boolean;
    pulseReady: boolean;
    message: string;
    objectiveHint: ObjectiveHint;
    resourceAlerts: ResourceAlerts;
    difficulty: DifficultyId;
    campaignWaves: number;
    status: GameStatus;
    waveModifier: WaveModifier;
    upgradeSummaries: UpgradeSummary[];
    upgradeChoices: Upgrade[];
  };

  latestStatus = detail.status;
  latestScore = detail.score;
  latestWave = detail.wave;
  latestBestCombo = detail.bestCombo;
  latestDifficulty = detail.difficulty;
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
  boostPill.textContent = detail.boostReady ? "推进就绪" : "推进冷却中";
  pulsePill.textContent = detail.pulseReady ? "脉冲就绪" : "脉冲冷却中";
  boostPill.classList.toggle("cooling", !detail.boostReady);
  pulsePill.classList.toggle("cooling", !detail.pulseReady);
  latestUpgradeSummaries = detail.upgradeSummaries;
  renderLoadout(detail.upgradeSummaries, detail.status);
  waveEvent.hidden = detail.status !== "playing";
  waveEventTitle.textContent = `本波事件：${detail.waveModifier.name}`;
  waveEventDetail.textContent = detail.waveModifier.description;
  pilotTip.hidden = detail.status !== "playing";
  pilotTip.classList.toggle("urgent", detail.objectiveHint.urgent);
  pilotTip.dataset.kind = detail.objectiveHint.kind;
  pilotTipTitle.textContent = detail.objectiveHint.title;
  pilotTipDetail.textContent = detail.objectiveHint.detail;
  missionText.textContent = detail.message;
  objectiveTitle.textContent = `目标：第 ${detail.wave}/${detail.campaignWaves} 波，修复 ${detail.relays} 座信标`;
  objectiveDetail.textContent = `${DIFFICULTY_SETTINGS[detail.difficulty].name}模式 / ${detail.waveModifier.name}：${detail.waveModifier.briefing}`;
  latestUpgradeChoices = detail.upgradeChoices;
});

window.addEventListener("game:ended", (event) => {
  const detail = (event as CustomEvent).detail as RunEndDetail;
  latestStatus = detail.status;
  latestScore = detail.score;
  latestWave = detail.wave;
  latestBestCombo = detail.bestCombo;
  latestDifficulty = detail.difficulty;
  persistRunResult(detail.status);
  overlay.classList.add("show");
  howToPlay.hidden = true;
  setDifficultyPickerVisible(detail.status !== "won");
  resumeButton.hidden = true;
  startButton.hidden = false;
  overlayEyebrow.textContent =
    detail.status === "completed" ? "全域稳定" : detail.status === "won" ? "救援成功" : "救援失败";
  overlayTitle.textContent =
    detail.status === "completed" ? "五波完成" : detail.status === "won" ? "光网稳定" : "信号中断";
  overlayCopy.textContent = detail.message;
  renderRunRecap(detail);
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
  }
  overlay.classList.add("show");
  setDifficultyPickerVisible(latestStatus === "menu" || latestStatus === "lost" || latestStatus === "completed");
  overlayEyebrow.textContent = "玩法说明";
  overlayTitle.textContent = "维修、连锁、撤离";
  overlayCopy.textContent =
    "目标不是乱飞，而是在电量压力下规划路线：先补流明，再修信标，最后从北侧光门撤离。";
  runRecap.hidden = true;
  howToPlay.hidden = false;
  upgradeChoices.hidden = true;
  startButton.hidden = latestStatus === "paused";
  resumeButton.hidden = latestStatus !== "paused";
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
}

function updateAudioUi(): void {
  audioToggle.textContent = saveData.audioEnabled ? "音效 开" : "音效 关";
  audioToggle.setAttribute("aria-pressed", String(saveData.audioEnabled));
}

function updateRecordUi(): void {
  recordScore.textContent = saveData.bestScore.toLocaleString();
  recordWave.textContent = `${Math.max(1, saveData.bestWave)}/5`;
  recordCombo.textContent = `${saveData.bestCombo.toFixed(1)}x`;
}

function setDifficultyPickerVisible(visible: boolean): void {
  difficultyPicker.hidden = !visible;
  difficultyDetail.hidden = !visible;
}

function persistRunResult(status: "won" | "completed" | "lost"): void {
  saveData.bestScore = Math.max(saveData.bestScore, latestScore);
  saveData.bestWave = Math.max(saveData.bestWave, latestWave);
  saveData.bestCombo = Math.max(saveData.bestCombo, latestBestCombo);
  if (status === "completed") {
    saveData.clears += 1;
  }
  saveSave(saveData);
  updateRecordUi();
}

function renderRunRecap(detail: RunEndDetail): void {
  recapRating.dataset.grade = detail.rating.id;
  recapRatingGrade.textContent = detail.rating.id;
  recapRatingName.textContent = detail.rating.name;
  recapRatingDetail.textContent = `${detail.rating.points}/100 · ${detail.rating.description}`;
  const metrics: Array<[string, string]> = [
    ["分数", detail.score.toLocaleString()],
    ["波次", `${detail.wave}/5`],
    ["用时", formatDuration(detail.elapsed)],
    ["最佳连锁", `${detail.bestCombo.toFixed(1)}x`],
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
  recapAdvice.textContent = buildRunAdvice(detail);
  runRecap.hidden = false;
}

function buildRunAdvice(detail: RunEndDetail): string {
  const { stats } = detail;
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

function loadSave(): SaveData {
  const fallback: SaveData = {
    audioEnabled: true,
    bestCombo: 1,
    bestScore: 0,
    bestWave: 1,
    clears: 0,
    selectedDifficulty: "standard"
  };
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
      bestCombo: finiteNumber(parsed.bestCombo, fallback.bestCombo),
      bestScore: finiteNumber(parsed.bestScore, fallback.bestScore),
      bestWave: finiteNumber(parsed.bestWave, fallback.bestWave),
      clears: finiteNumber(parsed.clears, fallback.clears),
      selectedDifficulty: selected
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

type SoundKind = "boost" | "button" | "hit" | "loss" | "pickup" | "pulse" | "repair" | "start" | "win";

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
updateDifficultyUi();
updateAudioUi();
updateRecordUi();
