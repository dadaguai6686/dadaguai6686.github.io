import Phaser from "phaser";
import { InputMapper } from "./input";
import {
  COMBO_WINDOW_SECONDS,
  createInitialState,
  getActiveRepairTarget,
  getCoachDirective,
  getContractFocus,
  getContractSnapshot,
  getCurrentWaveStats,
  getHazardThreats,
  HIT_RECOVERY_SECONDS,
  getObjectiveHint,
  getResourceAlerts,
  RELAY_CHECKPOINT_COUNT,
  getRunPerformance,
  getRoutePlan,
  getRunRating,
  getStormActiveRadius,
  getUpgradeChoices,
  getUpgradeSummaries,
  pauseRun,
  projectHazardPosition,
  resumeRun,
  restartRun,
  SECTOR_LAYOUTS,
  updateSimulation,
  WAVE_MODIFIERS,
  withRunStats,
  type CoachDirective,
  type ContractFocus,
  type ContractSnapshot,
  type DifficultyId,
  type GameState,
  type Hazard,
  type InputState,
  type Lumen,
  type LossContext,
  type ObjectiveHint,
  type ResourceAlerts,
  type RoutePlan,
  type RunPerformance,
  type RunRating,
  type Relay,
  type RunEndReason,
  type RunStats,
  type SectorLayout,
  type Storm,
  type Upgrade,
  type UpgradeId,
  type UpgradeSummary,
  type WaveModifier
} from "./simulation";

type HudSnapshot = {
  charge: number;
  hull: number;
  relays: string;
  lumen: number;
  wave: number;
  score: number;
  combo: number;
  comboTimer: number;
  comboWindow: number;
  bestCombo: number;
  difficulty: DifficultyId;
  campaignWaves: number;
  maxHull: number;
  maxCharge: number;
  boostReady: boolean;
  pulseReady: boolean;
  message: string;
  objectiveHint: ObjectiveHint;
  coachDirective: CoachDirective;
  resourceAlerts: ResourceAlerts;
  routePlan: RoutePlan;
  status: GameState["status"];
  waveModifier: WaveModifier;
  sector: SectorLayout;
  contract: ContractSnapshot;
  performance: RunPerformance;
  briefingActive: boolean;
  radar: RadarSnapshot;
  upgradeSummaries: UpgradeSummary[];
  upgradeChoices: Upgrade[];
};

type RadarSnapshot = {
  arena: { width: number; height: number };
  gate: { open: boolean; position: { x: number; y: number } };
  guide?: RadarGuide;
  hazards: Array<{ id: number; position: { x: number; y: number }; radius: number }>;
  lumen: Array<{ collected: boolean; id: number; position: { x: number; y: number } }>;
  player: { position: { x: number; y: number } };
  relays: Array<{ id: number; position: { x: number; y: number }; progress: number; repaired: boolean }>;
  storms: Array<{ activeRadius: number; id: number; position: { x: number; y: number }; radius: number }>;
};

type RadarGuide = {
  kind: "gate" | "lumen" | "relay" | "repair";
  position: { x: number; y: number };
  title: string;
  urgent: boolean;
};

type FeedbackKind =
  | "boost"
  | "closeCall"
  | "contract"
  | "hit"
  | "loss"
  | "pickup"
  | "pulse"
  | "repair"
  | "score"
  | "win";

type FeedbackTone = "danger" | "primary" | "success" | "warning";

type FeedbackCue = {
  detail: string;
  kind: FeedbackKind;
  text: string;
  title: string;
  position: { x: number; y: number };
  color: number;
  scale?: number;
  tone: FeedbackTone;
};

type SectorVisual = {
  accent: number;
  base: number;
  grid: number;
  haze: number;
  secondary: number;
};

type RoutePreviewWaypoint = {
  color: number;
  label: string;
  position: { x: number; y: number };
};

type WorldLabelKind = "gate" | "hazard" | "lumen" | "relay" | "storm";

type QaBrowserInputDetail = {
  durationSeconds?: number;
  kind?: "keyboard" | "touch";
  move?: { x?: number; y?: number };
};

const SECTOR_VISUALS: Record<GameState["sector"], SectorVisual> = {
  outerRing: {
    accent: 0x67f4ff,
    base: 0x07101a,
    grid: 0x1f5364,
    haze: 0x16394d,
    secondary: 0xffd76e
  },
  crossCurrent: {
    accent: 0x70ffcf,
    base: 0x07131a,
    grid: 0x235f65,
    haze: 0x16434d,
    secondary: 0xffd76e
  },
  southernArc: {
    accent: 0xffd76e,
    base: 0x0d0d18,
    grid: 0x514326,
    haze: 0x473015,
    secondary: 0x67f4ff
  },
  stormSpine: {
    accent: 0xb388ff,
    base: 0x090817,
    grid: 0x3a2b68,
    haze: 0x251747,
    secondary: 0xff5f9b
  },
  overclockCore: {
    accent: 0xffffff,
    base: 0x070b12,
    grid: 0x5d4a22,
    haze: 0x4a2f12,
    secondary: 0x67f4ff
  }
};

export class GameScene extends Phaser.Scene {
  private state: GameState = createInitialState();
  private inputMapper?: InputMapper;
  private worldLayer?: Phaser.GameObjects.Container;
  private relayViews = new Map<number, Phaser.GameObjects.Container>();
  private lumenViews = new Map<number, Phaser.GameObjects.Container>();
  private hazardViews = new Map<number, Phaser.GameObjects.Container>();
  private stormViews = new Map<number, Phaser.GameObjects.Container>();
  private playerView?: Phaser.GameObjects.Container;
  private gateView?: Phaser.GameObjects.Container;
  private navigatorView?: Phaser.GameObjects.Graphics;
  private navigatorLabel?: Phaser.GameObjects.Text;
  private readabilityView?: Phaser.GameObjects.Graphics;
  private repairPromptLabel?: Phaser.GameObjects.Text;
  private recoveryLabel?: Phaser.GameObjects.Text;
  private routePreviewLabels: Phaser.GameObjects.Text[] = [];
  private starLayer?: Phaser.GameObjects.Graphics;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastRepairDecayFeedbackAt = 0;
  private lastCanvasSignatureAt = Number.NEGATIVE_INFINITY;
  private lastCanvasSignatureKey = "";
  private largeLabels = false;
  private reducedMotion = false;

  create(): void {
    this.applySettings(window.__lumenSettings);
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.createTextures();
    this.createWorld();
    this.createHudBridge();
    this.renderState();
    window.dispatchEvent(new CustomEvent("game:scene-ready"));
    this.scale.on("resize", this.onResize, this);
  }

  update(_: number, deltaMs: number): void {
    if (!this.inputMapper) return;
    const previousStatus = this.state.status;
    const previousCollectedIds = new Set(this.state.lumen.filter((drop) => drop.collected).map((drop) => drop.id));
    const previousRepairedIds = new Set(this.state.relays.filter((relay) => relay.repaired).map((relay) => relay.id));
    const previousRelayCheckpoints = new Map(this.state.relays.map((relay) => [relay.id, relay.checkpoint]));
    const previousRelayProgress = new Map(this.state.relays.map((relay) => [relay.id, relay.progress]));
    const previousHull = this.state.player.hull;
    const previousBoostCooldown = this.state.player.boostCooldown;
    const previousCloseCalls = this.state.stats.closeCalls;
    const previousContractStatus = this.state.contract.status;
    const previousPulseCooldown = this.state.player.pulseCooldown;
    const input = this.inputMapper.read();
    const previousScore = this.state.score;
    this.state = updateSimulation(this.state, input, Math.min(deltaMs / 1000, 0.033));
    this.renderState();
    this.emitHud();
    this.emitFeedback({
      previousBoostCooldown,
      previousCloseCalls,
      previousCollectedIds,
      previousContractStatus,
      previousHull,
      previousPulseCooldown,
      previousRelayCheckpoints,
      previousRelayProgress,
      previousRepairedIds,
      previousScore,
      previousStatus
    });
    if (previousStatus === "playing" && this.state.status !== "playing") {
      const waveStats = this.state.status === "completed" ? this.state.stats : getCurrentWaveStats(this.state);
      const ratingState = withRunStats(this.state, waveStats);
      window.dispatchEvent(
        new CustomEvent("game:ended", {
          detail: {
            bestCombo: this.state.bestCombo,
            campaignStats: this.state.stats as RunStats,
            charge: this.state.player.charge,
            contract: getContractSnapshot(this.state),
            difficulty: this.state.difficulty,
            elapsed: this.state.elapsed,
            endReason: this.state.endReason as RunEndReason,
            hull: this.state.player.hull,
            lossContext: this.state.lossContext as LossContext,
            message: this.state.message,
            rating: getRunRating(ratingState) as RunRating,
            routePlan: getRoutePlan(this.state.routeSeed) as RoutePlan,
            score: this.state.score,
            sector: SECTOR_LAYOUTS[this.state.sector] as SectorLayout,
            stats: waveStats as RunStats,
            status: this.state.status,
            wave: this.state.wave,
            waveModifier: WAVE_MODIFIERS[this.state.waveModifier] as WaveModifier
          }
        })
      );
    }
  }

  startRun(): void {
    this.startRunWithUpgrade();
  }

  startRunWithUpgrade(upgradeId?: UpgradeId, difficulty?: DifficultyId, routeSeed?: number): void {
    this.resetInput();
    this.state = restartRun(this.state, upgradeId, { difficulty, routeSeed });
    this.createWorld();
    this.resetInput();
    this.renderState();
    this.emitHud();
  }

  private createHudBridge(): void {
    window.addEventListener("game:start", (event) => {
      const detail = (event as CustomEvent<{ difficulty?: DifficultyId; routeSeed?: number; upgradeId?: UpgradeId }>).detail;
      this.startRunWithUpgrade(detail?.upgradeId, detail?.difficulty, detail?.routeSeed);
    });
    window.addEventListener("game:pause", () => {
      this.resetInput();
      this.state = pauseRun(this.state);
      this.resetInput();
      this.renderState();
      this.emitHud();
    });
    window.addEventListener("game:resume", () => {
      this.resetInput();
      this.state = resumeRun(this.state);
      this.renderState();
      this.emitHud();
    });
    window.addEventListener("game:settings", (event) => {
      const previousLargeLabels = this.largeLabels;
      this.applySettings((event as CustomEvent<{ largeLabels?: boolean; reducedMotion?: boolean }>).detail);
      if (previousLargeLabels !== this.largeLabels) {
        this.createWorld();
        this.renderState();
      }
    });
    window.addEventListener("game:qa-state", (event) => {
      const detail = (event as CustomEvent<{ state?: GameState }>).detail;
      if (!detail?.state) return;
      this.resetInput();
      this.state = structuredClone(detail.state);
      this.createWorld();
      this.renderState();
      this.emitHud();
    });
    window.addEventListener("game:qa-browser-input", (event) => {
      this.applyLocalReleaseQaBrowserInput((event as CustomEvent<QaBrowserInputDetail>).detail);
    });
  }

  private resetInput(): void {
    this.inputMapper?.reset();
  }

  private applyLocalReleaseQaBrowserInput(detail?: QaBrowserInputDetail): void {
    if (!isLocalReleaseQaMode() || this.state.status !== "playing") return;
    const move = normalizeQaMove(detail?.move);
    if (!move) return;

    const durationSeconds = Phaser.Math.Clamp(detail?.durationSeconds ?? 0.62, 0.1, 1);
    const input: InputState = { boost: false, move, pulse: false, repair: false };
    const frameSeconds = 1 / 60;

    for (let elapsed = 0; elapsed < durationSeconds; elapsed += frameSeconds) {
      this.state = updateSimulation(this.state, input, Math.min(frameSeconds, durationSeconds - elapsed));
      if (this.state.status !== "playing") break;
    }

    this.renderState();
    this.emitHud();
  }

  private createWorld(): void {
    this.worldLayer?.destroy();
    this.relayViews.clear();
    this.lumenViews.clear();
    this.hazardViews.clear();
    this.stormViews.clear();
    this.navigatorLabel = undefined;
    this.repairPromptLabel = undefined;
    this.recoveryLabel = undefined;
    this.routePreviewLabels = [];

    this.worldLayer = this.add.container(0, 0);
    this.starLayer = this.add.graphics();
    this.worldLayer.add(this.starLayer);
    this.drawBackdrop();

    this.navigatorView = this.add.graphics();
    this.worldLayer.add(this.navigatorView);

    this.gateView = this.createGate();
    this.worldLayer.add(this.gateView);

    this.state.relays.forEach((relay) => {
      const view = this.createRelay(relay);
      this.relayViews.set(relay.id, view);
      this.worldLayer?.add(view);
    });

    this.state.lumen.forEach((drop) => {
      const view = this.createLumen(drop);
      this.lumenViews.set(drop.id, view);
      this.worldLayer?.add(view);
    });

    this.state.storms.forEach((storm) => {
      const view = this.createStorm(storm);
      this.stormViews.set(storm.id, view);
      this.worldLayer?.add(view);
    });

    this.state.hazards.forEach((hazard) => {
      const view = this.createHazard(hazard);
      this.hazardViews.set(hazard.id, view);
      this.worldLayer?.add(view);
    });

    this.readabilityView = this.add.graphics();
    this.worldLayer.add(this.readabilityView);

    this.playerView = this.createPlayer();
    this.worldLayer.add(this.playerView);

    this.trail = this.add.particles(0, 0, "spark", {
      lifespan: 420,
      speed: { min: 16, max: 60 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.75, end: 0 },
      tint: [0x66f2ff, 0xffd66c],
      quantity: 2,
      frequency: 35,
      blendMode: Phaser.BlendModes.ADD
    });
    this.worldLayer.add(this.trail);

    this.inputMapper?.destroy();
    this.inputMapper = new InputMapper(this.input.keyboard!);
    this.onResize();
  }

  private drawBackdrop(): void {
    const graphics = this.starLayer!;
    const visual = SECTOR_VISUALS[this.state.sector];
    graphics.clear();
    graphics.fillStyle(visual.base, 1);
    graphics.fillRect(0, 0, this.state.arena.width, this.state.arena.height);

    this.drawSectorField(graphics, visual);

    for (let i = 0; i < 120; i += 1) {
      const x = (i * 137.31) % this.state.arena.width;
      const y = (i * 91.77) % this.state.arena.height;
      const size = 1 + ((i * 17) % 4) * 0.35;
      const alpha = 0.25 + ((i * 29) % 60) / 100;
      graphics.fillStyle(i % 5 === 0 ? visual.secondary : visual.accent, alpha);
      graphics.fillCircle(x, y, size);
    }

    graphics.lineStyle(1, visual.grid, 0.42);
    for (let x = 70; x < this.state.arena.width; x += 70) {
      graphics.lineBetween(x, 0, x - 90, this.state.arena.height);
    }
    graphics.lineStyle(1, visual.haze, 0.5);
    for (let y = 80; y < this.state.arena.height; y += 80) {
      graphics.lineBetween(0, y, this.state.arena.width, y + 90);
    }

    graphics.lineStyle(3, visual.accent, 0.3);
    this.state.relays.forEach((relay, index) => {
      const nextRelay = this.state.relays[(index + 1) % this.state.relays.length];
      graphics.lineBetween(relay.position.x, relay.position.y, nextRelay.position.x, nextRelay.position.y);
    });

    graphics.lineStyle(2, visual.secondary, 0.2);
    graphics.strokeCircle(500, 350, 250);
    graphics.lineStyle(5, visual.accent, 0.18);
    graphics.strokeRoundedRect(42, 42, this.state.arena.width - 84, this.state.arena.height - 84, 18);
    graphics.lineStyle(2, visual.secondary, 0.28);
    graphics.lineBetween(452, 48, 548, 48);
    graphics.lineBetween(432, 75, 568, 75);
  }

  private drawSectorField(graphics: Phaser.GameObjects.Graphics, visual: SectorVisual): void {
    switch (this.state.sector) {
      case "outerRing":
        this.drawOuterRingField(graphics, visual);
        break;
      case "crossCurrent":
        this.drawCrossCurrentField(graphics, visual);
        break;
      case "southernArc":
        this.drawSouthernArcField(graphics, visual);
        break;
      case "stormSpine":
        this.drawStormSpineField(graphics, visual);
        break;
      case "overclockCore":
        this.drawOverclockCoreField(graphics, visual);
        break;
    }
  }

  private drawOuterRingField(graphics: Phaser.GameObjects.Graphics, visual: SectorVisual): void {
    graphics.lineStyle(14, visual.haze, 0.28);
    graphics.strokeCircle(500, 350, 310);
    graphics.lineStyle(5, visual.accent, 0.14);
    graphics.strokeCircle(500, 350, 286);
    graphics.strokeCircle(500, 350, 214);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const inner = 228;
      const outer = 325;
      graphics.lineStyle(2, visual.secondary, 0.13);
      graphics.lineBetween(
        500 + Math.cos(angle) * inner,
        350 + Math.sin(angle) * inner,
        500 + Math.cos(angle) * outer,
        350 + Math.sin(angle) * outer
      );
    }
    graphics.lineStyle(9, visual.accent, 0.22);
    for (let angle = -0.15; angle < Math.PI * 2; angle += Math.PI / 2.7) {
      graphics.arc(500, 350, 344, angle, angle + 0.38);
    }
    graphics.lineStyle(3, visual.secondary, 0.22);
    for (let angle = 0.28; angle < Math.PI * 2; angle += Math.PI / 3) {
      const x = 500 + Math.cos(angle) * 322;
      const y = 350 + Math.sin(angle) * 322;
      graphics.strokeRoundedRect(x - 28, y - 10, 56, 20, 6);
    }
  }

  private drawCrossCurrentField(graphics: Phaser.GameObjects.Graphics, visual: SectorVisual): void {
    graphics.lineStyle(34, visual.haze, 0.22);
    graphics.lineBetween(60, 124, 930, 620);
    graphics.lineBetween(76, 610, 920, 112);
    graphics.lineStyle(4, visual.accent, 0.22);
    for (let offset = -80; offset <= 80; offset += 40) {
      graphics.lineBetween(88, 112 + offset, 920, 592 + offset);
      graphics.lineBetween(100, 596 + offset, 910, 128 + offset);
    }
    graphics.fillStyle(visual.secondary, 0.12);
    graphics.fillTriangle(496, 292, 538, 350, 496, 408);
    graphics.fillTriangle(504, 292, 462, 350, 504, 408);
    graphics.fillStyle(visual.accent, 0.18);
    for (let offset = -120; offset <= 160; offset += 80) {
      graphics.fillTriangle(238 + offset, 246 + offset * 0.42, 274 + offset, 258 + offset * 0.42, 246 + offset, 284 + offset * 0.42);
      graphics.fillTriangle(782 - offset, 520 - offset * 0.42, 746 - offset, 508 - offset * 0.42, 774 - offset, 482 - offset * 0.42);
    }
  }

  private drawSouthernArcField(graphics: Phaser.GameObjects.Graphics, visual: SectorVisual): void {
    graphics.lineStyle(30, visual.haze, 0.24);
    graphics.arc(500, 700, 420, Math.PI * 1.08, Math.PI * 1.92);
    graphics.lineStyle(6, visual.accent, 0.2);
    graphics.arc(500, 700, 360, Math.PI * 1.08, Math.PI * 1.92);
    graphics.arc(500, 700, 270, Math.PI * 1.12, Math.PI * 1.88);
    graphics.fillStyle(visual.secondary, 0.09);
    graphics.fillRect(92, 525, 816, 120);
    graphics.lineStyle(2, visual.secondary, 0.17);
    for (let x = 140; x <= 860; x += 90) {
      graphics.lineBetween(x, 530, x - 44, 645);
    }
    graphics.fillStyle(visual.haze, 0.32);
    graphics.fillRoundedRect(310, 548, 380, 74, 18);
    graphics.lineStyle(4, visual.accent, 0.2);
    graphics.strokeRoundedRect(328, 562, 344, 42, 14);
    graphics.lineStyle(2, visual.secondary, 0.22);
    for (let x = 356; x <= 644; x += 48) {
      graphics.lineBetween(x, 562, x + 30, 604);
      graphics.lineBetween(x + 30, 562, x, 604);
    }
  }

  private drawStormSpineField(graphics: Phaser.GameObjects.Graphics, visual: SectorVisual): void {
    graphics.fillStyle(visual.haze, 0.28);
    graphics.fillRect(430, 70, 140, 580);
    graphics.lineStyle(8, visual.accent, 0.2);
    graphics.lineBetween(500, 76, 500, 640);
    graphics.lineStyle(3, visual.secondary, 0.23);
    for (let y = 110; y <= 610; y += 70) {
      graphics.lineBetween(432, y, 376, y + 34);
      graphics.lineBetween(568, y + 18, 624, y - 18);
    }
    graphics.lineStyle(2, visual.accent, 0.16);
    graphics.strokeCircle(500, 230, 126);
    graphics.strokeCircle(500, 455, 122);
    graphics.lineStyle(5, visual.secondary, 0.24);
    for (let y = 118; y <= 602; y += 88) {
      graphics.lineBetween(500, y, 456, y + 42);
      graphics.lineBetween(500, y, 548, y + 34);
      graphics.lineStyle(2, 0xffffff, 0.12);
      graphics.lineBetween(455, y + 42, 548, y + 34);
      graphics.lineStyle(5, visual.secondary, 0.24);
    }
  }

  private drawOverclockCoreField(graphics: Phaser.GameObjects.Graphics, visual: SectorVisual): void {
    graphics.fillStyle(visual.haze, 0.2);
    graphics.fillCircle(500, 350, 188);
    graphics.lineStyle(5, visual.secondary, 0.2);
    graphics.strokeCircle(500, 350, 110);
    graphics.strokeCircle(500, 350, 178);
    graphics.lineStyle(3, visual.accent, 0.22);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      graphics.lineBetween(
        500 + Math.cos(angle) * 74,
        350 + Math.sin(angle) * 74,
        500 + Math.cos(angle) * 304,
        350 + Math.sin(angle) * 304
      );
    }
    graphics.lineStyle(2, visual.secondary, 0.18);
    graphics.strokeCircle(500, 350, 300);
    graphics.fillStyle(visual.secondary, 0.1);
    graphics.fillTriangle(500, 184, 602, 350, 500, 516);
    graphics.fillTriangle(500, 184, 398, 350, 500, 516);
    graphics.lineStyle(4, visual.accent, 0.28);
    graphics.strokeRoundedRect(448, 298, 104, 104, 18);
    graphics.lineStyle(2, 0xffffff, 0.18);
    graphics.strokeCircle(500, 350, 54);
  }

  private createTextures(): void {
    if (!this.textures.exists("spark")) {
      const canvas = this.textures.createCanvas("spark", 18, 18);
      const ctx = canvas!.getContext();
      const gradient = ctx.createRadialGradient(9, 9, 0, 9, 9, 9);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.42, "rgba(105,242,255,0.8)");
      gradient.addColorStop(1, "rgba(105,242,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 18, 18);
      canvas!.refresh();
    }
  }

  private createPlayer(): Phaser.GameObjects.Container {
    const body = this.add.graphics();
    body.fillStyle(0x67f4ff, 0.14);
    body.fillCircle(0, 4, 31);
    body.fillStyle(0xffd76e, 0.28);
    body.fillTriangle(-12, 19, 0, 34, 12, 19);
    body.fillStyle(0xcffaff, 1);
    body.fillTriangle(0, -24, 22, 20, 0, 11);
    body.fillTriangle(0, -24, -22, 20, 0, 11);
    body.fillStyle(0x67f4ff, 0.92);
    body.fillTriangle(0, -18, 11, 12, 0, 6);
    body.fillTriangle(0, -18, -11, 12, 0, 6);
    body.fillStyle(0x07101a, 0.9);
    body.fillRoundedRect(-12, 9, 24, 15, 5);
    body.fillStyle(0xffd76e, 0.78);
    body.fillCircle(-9, 18, 3);
    body.fillCircle(9, 18, 3);
    body.fillStyle(0x0b1f2d, 1);
    body.fillCircle(0, 2, 9);
    body.fillStyle(0xffffff, 0.88);
    body.fillCircle(0, -2, 4);
    body.lineStyle(3, 0x67f4ff, 0.95);
    body.strokeCircle(0, 2, 17);
    body.lineStyle(2, 0xffd76e, 0.75);
    body.lineBetween(-18, 18, 18, 18);
    body.lineStyle(2, 0xffffff, 0.38);
    body.lineBetween(0, -24, 0, 14);
    return this.add.container(this.state.player.position.x, this.state.player.position.y, [body]);
  }

  private createWorldLabel(text: string, color: string, y: number): Phaser.GameObjects.Text {
    const label = this.add.text(0, y, text, {
      align: "center",
      color,
      fontFamily: "Inter, Segoe UI, sans-serif",
      fontSize: this.largeLabels ? "16px" : "12px",
      fontStyle: "bold",
      stroke: "#061018",
      strokeThickness: this.largeLabels ? 5 : 4
    });
    label.setOrigin(0.5);
    label.setAlpha(this.largeLabels ? 0.94 : 0.82);
    return label;
  }

  private createRelay(relay: Relay): Phaser.GameObjects.Container {
    const glow = this.add.graphics();
    glow.fillStyle(0x66f2ff, 0.1);
    glow.fillCircle(0, 0, 62);
    glow.lineStyle(1, 0x67f4ff, 0.18);
    glow.strokeCircle(0, 0, 74);
    const core = this.add.graphics();
    core.fillStyle(0x061018, 0.72);
    core.fillCircle(0, 0, 34);
    core.lineStyle(4, 0x1f5364, 0.42);
    core.lineBetween(-48, 0, 48, 0);
    core.lineBetween(0, -48, 0, 48);
    core.lineStyle(3, 0x67f4ff, 0.68);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      core.lineBetween(Math.cos(angle) * 22, Math.sin(angle) * 22, Math.cos(angle) * 45, Math.sin(angle) * 45);
    }
    core.lineStyle(4, 0x6af5ff, 0.9);
    core.strokeCircle(0, 0, 30);
    core.lineStyle(2, 0xffd86e, 0.75);
    core.strokeCircle(0, 0, 18);
    core.lineStyle(2, 0xffffff, 0.22);
    core.strokeCircle(0, 0, 43);
    core.fillStyle(0xffffff, 0.92);
    core.fillCircle(0, 0, 7);
    const progress = this.add.graphics();
    const label = this.createWorldLabel("信标", "#dffcff", 52);
    return this.add.container(relay.position.x, relay.position.y, [glow, core, progress, label]);
  }

  private createLumen(drop: Lumen): Phaser.GameObjects.Container {
    const gem = this.add.graphics();
    gem.fillStyle(0xffd86e, 0.16);
    gem.fillCircle(0, 0, 26);
    gem.fillStyle(0xffd86e, 0.95);
    gem.fillTriangle(0, -13, 12, 0, 0, 13);
    gem.fillTriangle(0, -13, -12, 0, 0, 13);
    gem.fillStyle(0xffffff, 0.5);
    gem.fillTriangle(0, -11, 6, -1, 0, 5);
    gem.fillStyle(0xffa83d, 0.58);
    gem.fillTriangle(0, 12, -8, 1, 0, 1);
    gem.lineStyle(2, 0xffffff, 0.65);
    gem.strokeCircle(0, 0, 14);
    gem.lineStyle(1, 0xffd86e, 0.38);
    gem.lineBetween(-21, 0, -15, 0);
    gem.lineBetween(15, 0, 21, 0);
    gem.lineBetween(0, -21, 0, -15);
    const label = this.createWorldLabel("流明", "#fff0a8", 27);
    label.setAlpha(0.7);
    return this.add.container(drop.position.x, drop.position.y, [gem, label]);
  }

  private createHazard(hazard: Hazard): Phaser.GameObjects.Container {
    const shard = this.add.graphics();
    shard.fillStyle(0xff5f9b, 0.16);
    shard.fillCircle(0, 0, hazard.radius + 24);
    shard.lineStyle(4, 0xff5f9b, 0.82);
    shard.strokeCircle(0, 0, hazard.radius);
    shard.fillStyle(0x3a0b28, 0.66);
    shard.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const radius = i % 2 === 0 ? hazard.radius * 0.78 : hazard.radius * 0.24;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shard.moveTo(x, y);
      else shard.lineTo(x, y);
    }
    shard.closePath();
    shard.fillPath();
    shard.lineStyle(2, 0xffffff, 0.55);
    shard.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const radius = i % 2 === 0 ? hazard.radius * 0.8 : hazard.radius * 0.35;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shard.moveTo(x, y);
      else shard.lineTo(x, y);
    }
    shard.closePath();
    shard.strokePath();
    shard.lineStyle(2, 0xffd4e5, 0.5);
    shard.lineBetween(-hazard.radius * 0.42, hazard.radius * 0.18, hazard.radius * 0.36, -hazard.radius * 0.24);
    shard.lineStyle(1, 0xff5f9b, 0.28);
    shard.strokeCircle(0, 0, hazard.radius + 12);
    const label = this.createWorldLabel("碎片", "#ffd4e5", hazard.radius + 33);
    return this.add.container(hazard.position.x, hazard.position.y, [shard, label]);
  }

  private createStorm(storm: Storm): Phaser.GameObjects.Container {
    const field = this.add.graphics();
    this.drawStormField(field, storm.radius, storm.radius, 0.5);
    const label = this.createWorldLabel("风暴", "#d9c8ff", 0);
    label.setAlpha(0.68);
    return this.add.container(storm.position.x, storm.position.y, [field, label]);
  }

  private createGate(): Phaser.GameObjects.Container {
    const ring = this.add.graphics();
    this.drawGateGlyph(ring, false, 0);
    const label = this.createWorldLabel("北侧光门", "#fff0a8", 56);
    return this.add.container(this.state.gate.position.x, this.state.gate.position.y, [ring, label]);
  }

  private drawStormField(graphics: Phaser.GameObjects.Graphics, baseRadius: number, activeRadius: number, pulse: number): void {
    graphics.clear();
    graphics.fillStyle(0x7d4cff, 0.055 + pulse * 0.035);
    graphics.fillCircle(0, 0, activeRadius);
    graphics.fillStyle(0xff5f9b, 0.045 + pulse * 0.025);
    graphics.fillCircle(0, 0, Math.max(24, activeRadius * 0.48));
    graphics.lineStyle(4, 0xb388ff, 0.24 + pulse * 0.16);
    graphics.strokeCircle(0, 0, activeRadius);
    graphics.lineStyle(2, 0xff5f9b, 0.22 + pulse * 0.22);
    graphics.strokeCircle(0, 0, baseRadius + 24);
    graphics.lineStyle(3, 0xd9c8ff, 0.18 + pulse * 0.12);
    graphics.arc(0, 0, Math.max(28, activeRadius * 0.62), -0.3, Math.PI * 1.05);
    graphics.arc(0, 0, Math.max(38, activeRadius * 0.82), Math.PI * 0.72, Math.PI * 1.86);
    graphics.lineStyle(2, 0xffffff, 0.16 + pulse * 0.1);
    graphics.lineBetween(-activeRadius * 0.34, -activeRadius * 0.18, activeRadius * 0.22, activeRadius * 0.12);
  }

  private drawGateGlyph(graphics: Phaser.GameObjects.Graphics, open: boolean, pulse: number): void {
    graphics.clear();
    const outer = open ? 0xfff0a8 : 0x344255;
    const inner = open ? 0x67f4ff : 0x1f5364;
    graphics.fillStyle(open ? 0xffd76e : 0x061018, open ? 0.13 + pulse * 0.08 : 0.56);
    graphics.fillCircle(0, 0, 48);
    graphics.lineStyle(open ? 6 : 5, outer, open ? 0.88 : 0.9);
    graphics.strokeCircle(0, 0, 40);
    graphics.lineStyle(2, inner, open ? 0.55 + pulse * 0.2 : 0.35);
    graphics.strokeCircle(0, 0, 56 + pulse * 5);
    graphics.lineStyle(3, open ? 0xffffff : 0x67f4ff, open ? 0.5 : 0.18);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      graphics.lineBetween(Math.cos(angle) * 28, Math.sin(angle) * 28, Math.cos(angle) * 48, Math.sin(angle) * 48);
    }
    if (open) {
      graphics.fillStyle(0xffffff, 0.72);
      graphics.fillCircle(0, 0, 12 + pulse * 4);
      graphics.lineStyle(2, 0xffd76e, 0.58);
      graphics.arc(0, 0, 24, -Math.PI * 0.15, Math.PI * 1.25);
    } else {
      graphics.lineStyle(4, 0x344255, 0.8);
      graphics.lineBetween(-18, -18, 18, 18);
      graphics.lineBetween(18, -18, -18, 18);
    }
  }

  private renderState(): void {
    const camera = this.cameras.main;
    if (!this.reducedMotion && this.state.shake > 0) {
      camera.setScroll(
        Phaser.Math.Between(-4, 4) * this.state.shake,
        Phaser.Math.Between(-4, 4) * this.state.shake
      );
    } else {
      camera.setScroll(0, 0);
    }

    this.renderNavigator();
    this.renderReadability();
    const guideTarget = this.getGuideTarget();
    const activeRepairTarget = getActiveRepairTarget(this.state);
    const activeThreatIds = new Set(
      getHazardThreats(this.state)
        .filter((threat) => threat.level !== "safe")
        .map((threat) => threat.id)
    );
    this.playerView?.setPosition(this.state.player.position.x, this.state.player.position.y);
    const angle = Math.atan2(this.state.player.velocity.y, this.state.player.velocity.x) + Math.PI / 2;
    this.playerView?.setRotation(Number.isFinite(angle) ? angle : 0);
    this.playerView?.setAlpha(this.state.player.invulnerable > 0 ? (this.reducedMotion ? 0.78 : 0.62 + Math.sin(this.time.now * 0.04) * 0.25) : 1);
    this.trail?.setPosition(this.state.player.position.x, this.state.player.position.y);
    this.trail?.setVisible(!this.reducedMotion && this.state.status === "playing");

    this.state.relays.forEach((relay) => {
      const view = this.relayViews.get(relay.id);
      const progress = view?.getAt(2) as Phaser.GameObjects.Graphics | undefined;
      const label = view?.getAt(3) as Phaser.GameObjects.Text | undefined;
      view?.setAlpha(relay.repaired ? 1 : 0.76);
      view?.setScale(relay.repaired ? 1.08 + this.getMotionWave(0.004) * 0.03 : 1);
      this.applyWorldLabel(label, "relay", {
        active: activeRepairTarget?.id === relay.id || this.isGuideNear(guideTarget, relay.position, 34),
        complete: relay.repaired
      });
      progress?.clear();
      progress?.lineStyle(6, relay.repaired ? 0xffe27a : 0x67f4ff, 0.9);
      progress?.arc(0, 0, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * relay.progress);
      if (progress) {
        for (let checkpoint = 1; checkpoint < RELAY_CHECKPOINT_COUNT; checkpoint += 1) {
          const angle = -Math.PI / 2 + (Math.PI * 2 * checkpoint) / RELAY_CHECKPOINT_COUNT;
          const reached = relay.repaired || relay.checkpoint >= checkpoint;
          const inner = 34;
          const outer = 50;
          progress.lineStyle(reached ? 4 : 2, reached ? 0xffe27a : 0x9fefff, reached ? 0.92 : 0.34);
          progress.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
        }
      }
    });

    this.state.lumen.forEach((drop) => {
      const view = this.lumenViews.get(drop.id);
      const gem = view?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
      const label = view?.getAt(1) as Phaser.GameObjects.Text | undefined;
      view?.setVisible(!drop.collected);
      this.applyWorldLabel(label, "lumen", { active: this.isGuideNear(guideTarget, drop.position, 34) });
      gem?.setRotation(this.reducedMotion ? drop.id * 0.18 : this.time.now * 0.002 + drop.id);
      view?.setScale(1 + this.getMotionWave(0.004, drop.id) * 0.08);
    });

    this.state.hazards.forEach((hazard) => {
      const view = this.hazardViews.get(hazard.id);
      const shard = view?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
      const label = view?.getAt(1) as Phaser.GameObjects.Text | undefined;
      view?.setPosition(hazard.position.x, hazard.position.y);
      this.applyWorldLabel(label, "hazard", { urgent: activeThreatIds.has(hazard.id) });
      shard?.setRotation(this.reducedMotion ? 0 : this.time.now * 0.0015 * (hazard.id % 2 === 0 ? 1 : -1));
    });

    this.state.storms.forEach((storm) => {
      const view = this.stormViews.get(storm.id);
      const graphic = view?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
      const label = view?.getAt(1) as Phaser.GameObjects.Text | undefined;
      const activeRadius = getStormActiveRadius(storm);
      view?.setPosition(storm.position.x, storm.position.y);
      this.applyWorldLabel(label, "storm", {
        urgent: Math.hypot(storm.position.x - this.state.player.position.x, storm.position.y - this.state.player.position.y) < activeRadius
      });
      graphic?.setRotation(this.reducedMotion ? 0 : this.time.now * 0.0006);
      if (graphic) this.drawStormField(graphic, storm.radius, activeRadius, this.getMotionPulse(0.006, storm.id));
    });

    this.gateView?.setPosition(this.state.gate.position.x, this.state.gate.position.y);
    this.gateView?.setAlpha(this.state.gate.open ? 1 : 0.35);
    this.gateView?.setScale(this.state.gate.open ? 1 + this.getMotionWave(0.005) * 0.07 : 1);
    const gateGraphic = this.gateView?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
    const gateLabel = this.gateView?.getAt(1) as Phaser.GameObjects.Text | undefined;
    this.applyWorldLabel(gateLabel, "gate", { active: this.state.gate.open || this.isGuideNear(guideTarget, this.state.gate.position, 50) });
    if (gateGraphic) this.drawGateGlyph(gateGraphic, this.state.gate.open, this.getMotionPulse(0.007));
    this.publishCanvasSignature();
  }

  private getGuideTarget(): { x: number; y: number } | undefined {
    const coach = getCoachDirective(this.state);
    const hint = getObjectiveHint(this.state);
    return coach.target ?? hint.target;
  }

  private isGuideNear(
    guideTarget: { x: number; y: number } | undefined,
    position: { x: number; y: number },
    tolerance: number
  ): boolean {
    return Boolean(
      guideTarget &&
        Math.hypot(guideTarget.x - position.x, guideTarget.y - position.y) <= tolerance
    );
  }

  private applyWorldLabel(
    label: Phaser.GameObjects.Text | undefined,
    kind: WorldLabelKind,
    options: { active?: boolean; complete?: boolean; urgent?: boolean } = {}
  ): void {
    if (!label) return;
    const alpha = this.getWorldLabelAlpha(kind, options);
    label.setVisible(alpha > 0.04);
    label.setAlpha(alpha);
    label.setScale(this.largeLabels ? 1.08 : options.urgent ? 1.03 : 1);
  }

  private getWorldLabelAlpha(
    kind: WorldLabelKind,
    options: { active?: boolean; complete?: boolean; urgent?: boolean }
  ): number {
    if (this.largeLabels) return options.urgent ? 0.98 : 0.9;
    if (this.state.status !== "playing") return kind === "hazard" || kind === "storm" ? 0.58 : 0.72;
    if (this.state.briefingActive) return kind === "hazard" || kind === "storm" ? 0.5 : 0.68;
    if (options.urgent) return 0.9;
    if (options.active) return 0.82;
    if (options.complete) return 0.34;
    return 0;
  }

  private publishCanvasSignature(): void {
    const visibleLumen = this.state.lumen.filter((drop) => !drop.collected).length;
    const repairedRelays = this.state.relays.filter((relay) => relay.repaired).length;
    const signatureKey = [
      this.state.status,
      this.state.difficulty,
      this.state.wave,
      this.state.sector,
      this.state.waveModifier,
      this.state.contract.id,
      this.state.routeSeed,
      visibleLumen,
      repairedRelays,
      this.state.hazards.length,
      this.state.storms.length,
      Math.round(this.state.elapsed * 4),
      Math.round(this.state.player.position.x / 8),
      Math.round(this.state.player.position.y / 8)
    ].join(":");

    if (signatureKey === this.lastCanvasSignatureKey && this.time.now - this.lastCanvasSignatureAt < 240) {
      return;
    }

    const canvas = this.game.canvas;
    const pixelSample = this.sampleCanvasPalette(canvas, 12, 8);
    const palette = uniquePalette([...pixelSample.palette, ...this.buildScenePalette()]);
    const source =
      pixelSample.colors >= 2
        ? `${pixelSample.source} + Phaser scene palette`
        : "Phaser scene object signature; pixel read unavailable";

    const signature = {
      briefingActive: this.state.briefingActive,
      colors: Math.max(pixelSample.colors, palette.length),
      contract: this.state.contract.id,
      difficulty: this.state.difficulty,
      elapsed: Number(this.state.elapsed.toFixed(3)),
      height: canvas?.height ?? window.innerHeight,
      palette: palette.slice(0, 24),
      player: {
        position: {
          x: Number(this.state.player.position.x.toFixed(2)),
          y: Number(this.state.player.position.y.toFixed(2))
        },
        velocity: {
          x: Number(this.state.player.velocity.x.toFixed(2)),
          y: Number(this.state.player.velocity.y.toFixed(2))
        }
      },
      routeSeed: this.state.routeSeed,
      samples: Math.max(pixelSample.samples, 96),
      sceneObjects: {
        hazards: this.state.hazards.length,
        lumen: this.state.lumen.length,
        relays: this.state.relays.length,
        repairedRelays,
        storms: this.state.storms.length,
        visibleLumen
      },
      sector: this.state.sector,
      source,
      status: this.state.status,
      updatedAt: Date.now(),
      wave: this.state.wave,
      waveModifier: this.state.waveModifier,
      width: canvas?.width ?? window.innerWidth
    };
    window.__lumenCanvasSignature = signature;
    this.writeCanvasSignatureNode(signature);

    this.lastCanvasSignatureAt = this.time.now;
    this.lastCanvasSignatureKey = signatureKey;
  }

  private writeCanvasSignatureNode(signature: NonNullable<Window["__lumenCanvasSignature"]>): void {
    let node = document.querySelector<HTMLScriptElement>("#lumen-canvas-signature");
    if (!node) {
      node = document.createElement("script");
      node.id = "lumen-canvas-signature";
      node.type = "application/json";
      document.head.append(node);
    }
    node.textContent = JSON.stringify(signature);
  }

  private sampleCanvasPalette(
    canvas: HTMLCanvasElement | undefined,
    columns: number,
    rows: number
  ): { colors: number; palette: string[]; samples: number; source: string } {
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
      return { colors: 0, palette: [], samples: 0, source: "no canvas" };
    }

    const webgl = this.getWebGlContext(canvas);
    if (webgl) {
      const palette = this.sampleWebGlPalette(webgl, canvas.width, canvas.height, columns, rows);
      if (palette.samples > 0) {
        return { ...palette, source: "WebGL readPixels canvas sample" };
      }
    }

    try {
      const context = canvas.getContext("2d");
      if (!context) return { colors: 0, palette: [], samples: 0, source: "2D context unavailable" };
      const palette = new Set<string>();
      let samples = 0;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(((column + 0.5) * canvas.width) / columns)));
          const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(((row + 0.5) * canvas.height) / rows)));
          const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
          if (a > 8) palette.add(toSampleColor(r, g, b));
          samples += 1;
        }
      }
      return { colors: palette.size, palette: [...palette], samples, source: "Canvas2D pixel sample" };
    } catch {
      return { colors: 0, palette: [], samples: 0, source: "pixel sample blocked" };
    }
  }

  private getWebGlContext(canvas: HTMLCanvasElement): WebGLRenderingContext | WebGL2RenderingContext | undefined {
    const renderer = this.renderer as unknown as { gl?: WebGLRenderingContext | WebGL2RenderingContext };
    if (renderer.gl?.readPixels) return renderer.gl;
    try {
      const context =
        canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
      return context?.readPixels ? context : undefined;
    } catch {
      return undefined;
    }
  }

  private sampleWebGlPalette(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    width: number,
    height: number,
    columns: number,
    rows: number
  ): { colors: number; palette: string[]; samples: number } {
    const pixel = new Uint8Array(4);
    const palette = new Set<string>();
    let samples = 0;
    try {
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = Math.min(width - 1, Math.max(0, Math.floor(((column + 0.5) * width) / columns)));
          const y = Math.min(height - 1, Math.max(0, height - 1 - Math.floor(((row + 0.5) * height) / rows)));
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          if (pixel[3] > 8) palette.add(toSampleColor(pixel[0], pixel[1], pixel[2]));
          samples += 1;
        }
      }
    } catch {
      return { colors: 0, palette: [], samples: 0 };
    }
    return { colors: palette.size, palette: [...palette], samples };
  }

  private buildScenePalette(): string[] {
    const visual = SECTOR_VISUALS[this.state.sector];
    const palette = [
      visual.base,
      visual.grid,
      visual.haze,
      visual.accent,
      visual.secondary,
      0xcffaff,
      0x0b1f2d,
      0x67f4ff,
      0x6af5ff,
      0x9fefff,
      0xffd76e,
      0xffe27a,
      0xfff0a8,
      0xff5f9b,
      0xff8fba,
      0xb388ff,
      this.state.gate.open ? 0xffffff : 0x344255
    ];
    if (this.state.player.invulnerable > 0) palette.push(0xffffff);
    if (this.state.contract.status === "completed") palette.push(0x70ffcf);
    if (this.state.contract.status === "failed") palette.push(0xff5f9b);
    if (this.state.lumen.some((drop) => !drop.collected)) palette.push(0xffd86e);
    if (this.state.relays.some((relay) => relay.repaired)) palette.push(0xffe27a);
    if (this.state.storms.length > 0) palette.push(0x7d4cff);
    return palette.map(toCssColor);
  }

  private emitHud(): void {
    const snapshot: HudSnapshot = {
      charge: this.state.player.charge,
      hull: this.state.player.hull,
      relays: `${this.state.relays.filter((relay) => relay.repaired).length}/${this.state.relays.length}`,
      lumen: this.state.player.lumen,
      wave: this.state.wave,
      score: this.state.score,
      combo: this.state.combo,
      comboTimer: this.state.comboTimer,
      comboWindow: COMBO_WINDOW_SECONDS,
      bestCombo: this.state.bestCombo,
      difficulty: this.state.difficulty,
      campaignWaves: this.state.campaignWaves,
      maxHull: this.state.player.maxHull,
      maxCharge: this.state.player.maxCharge,
      boostReady: this.state.player.boostCooldown <= 0,
      pulseReady: this.state.player.pulseCooldown <= 0,
      message: this.state.message,
      objectiveHint: getObjectiveHint(this.state),
      coachDirective: getCoachDirective(this.state),
      resourceAlerts: getResourceAlerts(this.state),
      routePlan: getRoutePlan(this.state.routeSeed),
      status: this.state.status,
      waveModifier: WAVE_MODIFIERS[this.state.waveModifier],
      sector: SECTOR_LAYOUTS[this.state.sector],
      contract: getContractSnapshot(this.state),
      performance: getRunPerformance(this.state),
      briefingActive: this.state.briefingActive,
      radar: this.createRadarSnapshot(),
      upgradeSummaries: getUpgradeSummaries(this.state.upgrades),
      upgradeChoices: this.state.status === "won" ? getUpgradeChoices(this.state) : []
    };
    window.dispatchEvent(new CustomEvent("game:hud", { detail: snapshot }));
  }

  private createRadarSnapshot(): RadarSnapshot {
    return {
      arena: { ...this.state.arena },
      gate: { open: this.state.gate.open, position: { ...this.state.gate.position } },
      guide: buildRadarGuide(this.state),
      hazards: this.state.hazards.map((hazard) => ({
        id: hazard.id,
        position: { ...hazard.position },
        radius: hazard.radius
      })),
      lumen: this.state.lumen.map((drop) => ({
        collected: drop.collected,
        id: drop.id,
        position: { ...drop.position }
      })),
      player: { position: { ...this.state.player.position } },
      relays: this.state.relays.map((relay) => ({
        id: relay.id,
        position: { ...relay.position },
        progress: relay.progress,
        repaired: relay.repaired
      })),
      storms: this.state.storms.map((storm) => ({
        activeRadius: getStormActiveRadius(storm),
        id: storm.id,
        position: { ...storm.position },
        radius: storm.radius
      }))
    };
  }

  private emitFeedback(previous: {
    previousBoostCooldown: number;
    previousCloseCalls: number;
    previousCollectedIds: Set<number>;
    previousContractStatus: GameState["contract"]["status"];
    previousHull: number;
    previousPulseCooldown: number;
    previousRelayCheckpoints: Map<number, number>;
    previousRelayProgress: Map<number, number>;
    previousRepairedIds: Set<number>;
    previousScore: number;
    previousStatus: GameState["status"];
  }): void {
    if (previous.previousStatus !== "playing") return;
    const newlyCollected = this.state.lumen.filter(
      (drop) => drop.collected && !previous.previousCollectedIds.has(drop.id)
    );
    const newlyRepaired = this.state.relays.filter(
      (relay) => relay.repaired && !previous.previousRepairedIds.has(relay.id)
    );
    const newlyCheckpointed = this.state.relays.filter(
      (relay) => !relay.repaired && relay.checkpoint > (previous.previousRelayCheckpoints.get(relay.id) ?? 0)
    );
    const decayingRelay = this.state.relays.find((relay) => {
      const previousProgress = previous.previousRelayProgress.get(relay.id) ?? relay.progress;
      const checkpointFloor = relay.checkpoint / RELAY_CHECKPOINT_COUNT;
      return !relay.repaired && previousProgress > relay.progress && previousProgress > checkpointFloor;
    });
    if (previous.previousBoostCooldown <= 0 && this.state.player.boostCooldown > 0) {
      this.dispatchFeedback({
        detail: "短推进已启动。优先用它穿出风暴和碎片线，别只拿来赶路。",
        kind: "boost",
        text: "推进",
        title: "推进启动",
        position: this.state.player.position,
        color: 0x67f4ff,
        tone: "primary"
      });
    }
    if (previous.previousPulseCooldown <= 0 && this.state.player.pulseCooldown > 0) {
      this.dispatchFeedback({
        detail: "脉冲会推开附近碎片；冷却期间先绕线移动，别原地硬修。",
        kind: "pulse",
        text: "脉冲",
        title: "脉冲释放",
        position: this.state.player.position,
        color: 0xb388ff,
        scale: 1.15,
        tone: "primary"
      });
    }
    newlyCollected.forEach((drop) => {
      this.dispatchFeedback({
        detail: "电量回升并延长连锁。下一步按导航靠近信标或继续补给。",
        kind: "pickup",
        text: "+流明",
        title: "流明回收",
        position: drop.position,
        color: 0xffd76e,
        tone: "success"
      });
    });
    newlyRepaired.forEach((relay) => {
      this.dispatchFeedback({
        detail: "主目标推进，连锁提高。电量偏低时先吃流明，再修下一座。",
        kind: "repair",
        text: "信标修复",
        title: "信标修复",
        position: relay.position,
        color: 0xffffff,
        scale: 1.1,
        tone: "success"
      });
    });
    if (previous.previousContractStatus === "active" && this.state.contract.status === "completed") {
      this.dispatchFeedback({
        detail: "副目标奖励已结算。现在回到主路线：修剩余信标，然后北侧撤离。",
        kind: "contract",
        text: "合约完成",
        title: "战术合约完成",
        position: this.state.player.position,
        color: 0xffd76e,
        scale: 1.16,
        tone: "success"
      });
    }
    const closeCallDelta = this.state.stats.closeCalls - previous.previousCloseCalls;
    const scoreDelta = this.state.score - previous.previousScore;
    if (scoreDelta !== 0 && closeCallDelta <= 0) {
      this.dispatchFeedback({
        detail:
          scoreDelta > 0
            ? `本次获得 ${scoreDelta.toLocaleString()} 分，当前连锁 ${this.state.combo.toFixed(1)}x。`
            : `本次扣除 ${Math.abs(scoreDelta).toLocaleString()} 分。受击会打断连锁，先拉开距离。`,
        kind: "score",
        text: `${scoreDelta > 0 ? "+" : "-"}${Math.abs(scoreDelta).toLocaleString()}分`,
        title: scoreDelta > 0 ? "连锁得分" : "扣分警告",
        position: this.state.player.position,
        color: scoreDelta > 0 ? 0xffd76e : 0xff5f9b,
        scale: scoreDelta > 0 ? 1.08 : 1,
        tone: scoreDelta > 0 ? "success" : "warning"
      });
    }
    if (closeCallDelta > 0) {
      this.dispatchFeedback({
        detail: `擦过碎片边缘但没有撞上，奖励连锁和分数。当前连锁 ${this.state.combo.toFixed(1)}x，继续绕线别贪修。`,
        kind: "closeCall",
        text: scoreDelta > 0 ? `擦险 +${scoreDelta.toLocaleString()}分` : "擦险",
        title: "擦险脱离",
        position: this.state.player.position,
        color: 0x86ffbd,
        scale: 1.08,
        tone: "success"
      });
    }
    newlyCheckpointed.forEach((relay) => {
      this.dispatchFeedback({
        detail: `维修进度已锁定到 ${relay.checkpoint}/${RELAY_CHECKPOINT_COUNT}。危险靠近时可以先撤出，回头从节点继续修。`,
        kind: "repair",
        text: `节点 ${relay.checkpoint}/${RELAY_CHECKPOINT_COUNT}`,
        title: "维修节点锁定",
        position: relay.position,
        color: 0x67f4ff,
        scale: 1.06,
        tone: "success"
      });
    });
    if (decayingRelay && this.time.now - this.lastRepairDecayFeedbackAt > 2200) {
      this.lastRepairDecayFeedbackAt = this.time.now;
      this.dispatchFeedback({
        detail: `离开维修圈后，未锁定的维修进度会慢慢回落；节点 ${decayingRelay.checkpoint}/${RELAY_CHECKPOINT_COUNT} 已保留，可以补流明后回来继续。`,
        kind: "repair",
        text: "维修回落",
        title: "维修中断",
        position: decayingRelay.position,
        color: 0xffd76e,
        tone: "warning"
      });
    }
    if (previous.previousHull - this.state.player.hull >= 5) {
      const damage = Math.ceil(previous.previousHull - this.state.player.hull);
      this.dispatchFeedback({
        detail: `机体 -${damage}，连锁已断。恢复环消失前拉开距离，必要时用 Q / 脉冲键清场。`,
        kind: "hit",
        text: "受击",
        title: "受击：连锁中断",
        position: this.state.player.position,
        color: 0xff5f9b,
        scale: 1.18,
        tone: "danger"
      });
    }
    if (this.state.status === "won" || this.state.status === "completed") {
      this.dispatchFeedback({
        detail:
          this.state.status === "completed"
            ? "五波救援完成。结算里会给出下一局冲分路线。"
            : "本波主目标完成。进升级界面前先看下一波预报。",
        kind: "win",
        text: this.state.status === "completed" ? "全域稳定" : "撤离成功",
        title: this.state.status === "completed" ? "全域稳定" : "撤离成功",
        position: this.state.gate.position,
        color: 0xffd76e,
        scale: 1.22,
        tone: "success"
      });
    }
    if (this.state.status === "lost") {
      this.dispatchFeedback({
        detail: getLossFeedbackDetail(this.state),
        kind: "loss",
        text: "信号中断",
        title: "信号中断",
        position: this.state.player.position,
        color: 0xff5f9b,
        scale: 1.2,
        tone: "danger"
      });
    }
  }

  private dispatchFeedback(cue: FeedbackCue): void {
    window.dispatchEvent(
      new CustomEvent("game:feedback", {
        detail: {
          detail: cue.detail,
          kind: cue.kind,
          title: cue.title,
          tone: cue.tone
        }
      })
    );
    this.spawnFeedbackCue(cue);
  }

  private spawnFeedbackCue(cue: FeedbackCue): void {
    if (!this.worldLayer) return;
    const text = this.add.text(cue.position.x, cue.position.y - 34, cue.text, {
      color: `#${cue.color.toString(16).padStart(6, "0")}`,
      fontFamily: "Inter, Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "900",
      stroke: "#07101a",
      strokeThickness: 5
    });
    text.setOrigin(0.5);
    text.setScale(cue.scale ?? 1);

    const ring = this.add.graphics();
    ring.setPosition(cue.position.x, cue.position.y);
    ring.lineStyle(cue.kind === "hit" || cue.kind === "loss" ? 5 : 3, cue.color, 0.78);
    ring.strokeCircle(0, 0, cue.kind === "pulse" ? 66 : cue.kind === "repair" || cue.kind === "win" ? 54 : 38);

    this.worldLayer.add([ring, text]);
    if (this.reducedMotion) {
      this.time.delayedCall(380, () => {
        text.destroy();
        ring.destroy();
      });
      return;
    }
    this.tweens.add({
      targets: text,
      y: text.y - 44,
      alpha: 0,
      scaleX: text.scaleX * 1.1,
      scaleY: text.scaleY * 1.1,
      duration: 820,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy()
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: cue.kind === "pulse" ? 2.25 : 1.7,
      scaleY: cue.kind === "pulse" ? 2.25 : 1.7,
      duration: cue.kind === "pulse" ? 680 : 560,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  private renderNavigator(): void {
    const graphics = this.navigatorView;
    if (!graphics) return;
    graphics.clear();
    const coach = getCoachDirective(this.state);
    const hint = getObjectiveHint(this.state);
    const target = coach.target ?? hint.target;
    if (this.state.status !== "playing" || !target) {
      this.hideNavigatorLabel();
      return;
    }

    const urgent = coach.urgent || hint.urgent;
    const color = coach.target ? getCoachColor(coach.id) : getHintColor(hint.kind);
    const player = this.state.player.position;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const angle = Math.atan2(dy, dx);
    const markerRadius = urgent ? 56 : 46;
    const pulse = this.getMotionPulse(0.006);
    const alpha = urgent ? 0.5 + pulse * 0.24 : 0.26 + pulse * 0.12;

    graphics.lineStyle(urgent ? 3 : 2, color, alpha);
    graphics.lineBetween(player.x, player.y, target.x, target.y);
    graphics.lineStyle(3, color, 0.72);
    graphics.strokeCircle(target.x, target.y, markerRadius + pulse * 8);
    graphics.lineStyle(1, 0xffffff, 0.34);
    graphics.strokeCircle(target.x, target.y, Math.max(18, markerRadius * 0.5));

    const arrowDistance = Math.min(Math.hypot(dx, dy) * 0.5, 92);
    const arrowX = player.x + Math.cos(angle) * arrowDistance;
    const arrowY = player.y + Math.sin(angle) * arrowDistance;
    graphics.fillStyle(color, urgent ? 0.78 : 0.58);
    graphics.fillTriangle(
      arrowX + Math.cos(angle) * 16,
      arrowY + Math.sin(angle) * 16,
      arrowX + Math.cos(angle + 2.45) * 11,
      arrowY + Math.sin(angle + 2.45) * 11,
      arrowX + Math.cos(angle - 2.45) * 11,
      arrowY + Math.sin(angle - 2.45) * 11
    );
    this.syncNavigatorLabel(getNavigatorLabel(coach, hint), target, markerRadius, color, urgent, pulse);
  }

  private syncNavigatorLabel(
    text: string,
    target: { x: number; y: number },
    markerRadius: number,
    color: number,
    urgent: boolean,
    pulse: number
  ): void {
    if (!this.navigatorLabel) {
      this.navigatorLabel = this.add.text(0, 0, "", {
        align: "center",
        backgroundColor: "rgba(5, 10, 18, 0.68)",
        color: "#f7fbff",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: this.largeLabels ? "16px" : "12px",
        fontStyle: "900",
        padding: { bottom: 4, left: 8, right: 8, top: 4 },
        stroke: "#07111c",
        strokeThickness: this.largeLabels ? 4 : 3
      });
      this.navigatorLabel.setOrigin(0.5);
      this.worldLayer?.add(this.navigatorLabel);
    }

    const x = Phaser.Math.Clamp(target.x, 92, this.state.arena.width - 92);
    const y = Phaser.Math.Clamp(target.y - markerRadius - 26, 24, this.state.arena.height - 24);
    this.navigatorLabel.setVisible(true);
    this.navigatorLabel.setText(`导航：${text}`);
    this.navigatorLabel.setPosition(x, y);
    this.navigatorLabel.setAlpha(urgent ? 0.9 + pulse * 0.1 : 0.76 + pulse * 0.16);
    this.navigatorLabel.setScale(this.largeLabels ? 1.04 : 1);
    this.navigatorLabel.setColor(toCssColor(color));
  }

  private hideNavigatorLabel(): void {
    this.navigatorLabel?.setVisible(false);
  }

  private renderReadability(): void {
    const graphics = this.readabilityView;
    if (!graphics) return;
    graphics.clear();
    if (this.state.status !== "playing") {
      this.hideRepairPromptLabel();
      this.hideRoutePreviewLabels();
      return;
    }

    const player = this.state.player.position;
    const pulse = this.getMotionPulse(0.008);

    this.renderOpeningRoutePreview(graphics, player, pulse);
    this.renderRepairReadability(graphics, player, pulse);
    this.renderRecoveryReadability(graphics, player, pulse);
    this.renderContractFocus(graphics, pulse);
    this.renderHazardReadability(graphics, player, pulse);
    this.renderResourceReadability(graphics, player, pulse);
  }

  private renderOpeningRoutePreview(graphics: Phaser.GameObjects.Graphics, player: { x: number; y: number }, pulse: number): void {
    const waypoints = buildOpeningRoutePreview(this.state);
    if (!this.state.briefingActive || waypoints.length === 0) {
      this.hideRoutePreviewLabels();
      return;
    }

    const path = [player, ...waypoints.map((waypoint) => waypoint.position)];
    path.slice(1).forEach((point, index) => {
      const previous = path[index];
      const color = waypoints[index].color;
      const alpha = 0.24 + pulse * 0.12;
      drawDashedLine(graphics, previous, point, color, alpha, 18, 12);
      graphics.lineStyle(2, 0xffffff, 0.1 + pulse * 0.08);
      graphics.strokeCircle(point.x, point.y, 34 + index * 3 + pulse * 8);
      graphics.fillStyle(color, 0.14 + pulse * 0.08);
      graphics.fillCircle(point.x, point.y, 22);
      graphics.lineStyle(3, color, 0.5 + pulse * 0.22);
      graphics.strokeCircle(point.x, point.y, 25 + pulse * 5);
    });

    this.syncRoutePreviewLabels(waypoints, pulse);
  }

  private syncRoutePreviewLabels(waypoints: RoutePreviewWaypoint[], pulse: number): void {
    while (this.routePreviewLabels.length < waypoints.length) {
      const label = this.add.text(0, 0, "", {
        align: "center",
        color: "#f7fbff",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: this.largeLabels ? "15px" : "12px",
        fontStyle: "900",
        stroke: "#07111c",
        strokeThickness: this.largeLabels ? 5 : 4
      });
      label.setOrigin(0.5);
      this.worldLayer?.add(label);
      this.routePreviewLabels.push(label);
    }

    this.routePreviewLabels.forEach((label, index) => {
      const waypoint = waypoints[index];
      if (!waypoint || (!this.largeLabels && index > 0)) {
        label.setVisible(false);
        return;
      }
      label.setVisible(true);
      label.setText(`${index + 1} ${waypoint.label}`);
      label.setPosition(waypoint.position.x, waypoint.position.y - 42);
      label.setAlpha(0.82 + pulse * 0.14);
      label.setScale(this.largeLabels ? 1.04 : 1);
    });
  }

  private hideRoutePreviewLabels(): void {
    this.routePreviewLabels.forEach((label) => label.setVisible(false));
  }

  private renderContractFocus(graphics: Phaser.GameObjects.Graphics, pulse: number): void {
    const focus = getContractFocus(this.state);
    if (!focus.active || focus.targets.length === 0) return;

    const color = getContractFocusColor(focus.kind);
    const alpha = focus.urgent ? 0.46 + pulse * 0.24 : 0.24 + pulse * 0.18;
    const baseRadius = getContractFocusRadius(focus.kind);
    focus.targets.slice(0, 4).forEach((target, index) => {
      const radius = baseRadius + pulse * (focus.urgent ? 14 : 9) + index * 2;
      graphics.lineStyle(focus.urgent ? 4 : 3, color, Math.max(0.12, alpha - index * 0.05));
      graphics.strokeCircle(target.x, target.y, radius);
      graphics.lineStyle(1, 0xffffff, 0.16 + pulse * 0.12);
      graphics.strokeCircle(target.x, target.y, Math.max(18, radius * 0.52));

      if (focus.kind === "avoidHazard" || focus.kind === "avoidStorm" || focus.kind === "conservePulse") {
        graphics.lineStyle(focus.urgent ? 3 : 2, color, Math.max(0.16, alpha - 0.08));
        graphics.lineBetween(target.x - radius * 0.55, target.y - radius * 0.55, target.x + radius * 0.55, target.y + radius * 0.55);
        graphics.lineBetween(target.x + radius * 0.55, target.y - radius * 0.55, target.x - radius * 0.55, target.y + radius * 0.55);
      }
    });

    const primaryTarget = focus.targets[0];
    if (primaryTarget && (focus.kind === "lumen" || focus.kind === "relay")) {
      const player = this.state.player.position;
      graphics.lineStyle(2, color, 0.16 + pulse * 0.14);
      graphics.lineBetween(player.x, player.y, primaryTarget.x, primaryTarget.y);
    }
  }

  private renderRepairReadability(graphics: Phaser.GameObjects.Graphics, player: { x: number; y: number }, pulse: number): void {
    const repairTarget = getActiveRepairTarget(this.state);
    if (!repairTarget) {
      this.hideRepairPromptLabel();
      return;
    }

    const isCharging = repairTarget.progress > 0;
    const alpha = isCharging ? 0.52 + pulse * 0.24 : 0.28 + pulse * 0.12;
    graphics.lineStyle(isCharging ? 5 : 3, 0xf7fbff, alpha);
    graphics.lineBetween(player.x, player.y, repairTarget.position.x, repairTarget.position.y);
    graphics.lineStyle(2, 0xffd76e, 0.3 + pulse * 0.22);
    graphics.strokeCircle(repairTarget.position.x, repairTarget.position.y, 58 + pulse * 10);
    graphics.lineStyle(2, 0x67f4ff, 0.22 + pulse * 0.18);
    graphics.strokeCircle(player.x, player.y, 34 + pulse * 7);
    this.syncRepairPromptLabel(repairTarget, pulse);
  }

  private syncRepairPromptLabel(repairTarget: Relay, pulse: number): void {
    if (!this.repairPromptLabel) {
      this.repairPromptLabel = this.add.text(0, 0, "", {
        align: "center",
        color: "#f7fbff",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: this.largeLabels ? "16px" : "13px",
        fontStyle: "900",
        stroke: "#07111c",
        strokeThickness: this.largeLabels ? 5 : 4
      });
      this.repairPromptLabel.setOrigin(0.5);
      this.worldLayer?.add(this.repairPromptLabel);
    }

    const progress = Math.round(repairTarget.progress * 100);
    this.repairPromptLabel.setVisible(true);
    this.repairPromptLabel.setText(
      progress > 0 ? `维修 ${progress}% · 节点 ${repairTarget.checkpoint}/${RELAY_CHECKPOINT_COUNT}` : "按住 E / 修复键"
    );
    this.repairPromptLabel.setPosition(repairTarget.position.x, repairTarget.position.y - 72);
    this.repairPromptLabel.setAlpha(0.86 + pulse * 0.14);
    this.repairPromptLabel.setScale(this.largeLabels ? 1.06 : 1);
  }

  private hideRepairPromptLabel(): void {
    this.repairPromptLabel?.setVisible(false);
  }

  private renderRecoveryReadability(graphics: Phaser.GameObjects.Graphics, player: { x: number; y: number }, pulse: number): void {
    const remaining = this.state.player.invulnerable;
    if (remaining <= 0) {
      this.hideRecoveryLabel();
      return;
    }

    const ratio = Math.max(0, Math.min(1, remaining / HIT_RECOVERY_SECONDS));
    graphics.lineStyle(4, 0x67f4ff, 0.28 + pulse * 0.18);
    graphics.strokeCircle(player.x, player.y, 62 + pulse * 8);
    graphics.lineStyle(6, 0xffd76e, 0.56 + ratio * 0.22);
    graphics.arc(player.x, player.y, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    graphics.lineStyle(2, 0xffffff, 0.2 + pulse * 0.16);
    graphics.strokeCircle(player.x, player.y, 78 + pulse * 10);
    this.syncRecoveryLabel(player, remaining, pulse);
  }

  private syncRecoveryLabel(player: { x: number; y: number }, remaining: number, pulse: number): void {
    if (!this.recoveryLabel) {
      this.recoveryLabel = this.add.text(0, 0, "", {
        align: "center",
        backgroundColor: "rgba(5, 10, 18, 0.7)",
        color: "#fff3ad",
        fontFamily: "Inter, Segoe UI, sans-serif",
        fontSize: this.largeLabels ? "15px" : "12px",
        fontStyle: "900",
        padding: { bottom: 4, left: 8, right: 8, top: 4 },
        stroke: "#07111c",
        strokeThickness: this.largeLabels ? 4 : 3
      });
      this.recoveryLabel.setOrigin(0.5);
      this.worldLayer?.add(this.recoveryLabel);
    }

    this.recoveryLabel.setVisible(true);
    this.recoveryLabel.setText(`恢复窗口 ${remaining.toFixed(1)}秒`);
    this.recoveryLabel.setPosition(player.x, player.y - 82);
    this.recoveryLabel.setAlpha(0.78 + pulse * 0.22);
    this.recoveryLabel.setScale(this.largeLabels ? 1.06 : 1);
  }

  private hideRecoveryLabel(): void {
    this.recoveryLabel?.setVisible(false);
  }

  private renderHazardReadability(graphics: Phaser.GameObjects.Graphics, player: { x: number; y: number }, pulse: number): void {
    const threats = getHazardThreats(this.state);
    this.renderHazardTrajectories(graphics, threats, pulse);
    threats
      .filter((threat) => threat.level !== "safe")
      .forEach((threat) => {
        const danger = threat.level === "danger";
        const proximity = 1 - Math.min(1, Math.max(0, (threat.distance - threat.collisionRadius) / (threat.warningRadius - threat.collisionRadius)));
        const alpha = danger ? 0.54 + pulse * 0.24 : 0.16 + proximity * 0.28;
        const color = danger ? 0xff5f9b : 0xb388ff;
        graphics.lineStyle(danger ? 4 : 2, color, alpha);
        graphics.strokeCircle(threat.position.x, threat.position.y, threat.collisionRadius + 16 + pulse * (danger ? 14 : 8));
        if (danger) {
          graphics.lineStyle(2, color, 0.32 + pulse * 0.22);
          graphics.lineBetween(player.x, player.y, threat.position.x, threat.position.y);
        }
      });
  }

  private renderHazardTrajectories(graphics: Phaser.GameObjects.Graphics, threats: ReturnType<typeof getHazardThreats>, pulse: number): void {
    const modifier = WAVE_MODIFIERS[this.state.waveModifier];
    const threatById = new Map(threats.map((threat) => [threat.id, threat]));

    this.state.hazards.forEach((hazard) => {
      const threat = threatById.get(hazard.id);
      const projected = projectHazardPosition(hazard, 0.9, this.state.arena, 1 + modifier.hazardSpeedBonus);
      const dx = projected.x - hazard.position.x;
      const dy = projected.y - hazard.position.y;
      const length = Math.hypot(dx, dy);
      if (length < 8) return;

      const danger = threat?.level === "danger";
      const near = threat?.level === "near";
      const color = danger ? 0xff5f9b : near ? 0xff8fba : 0xb388ff;
      const alpha = danger ? 0.42 + pulse * 0.22 : near ? 0.24 + pulse * 0.15 : 0.1 + pulse * 0.04;
      const arrowX = dx / length;
      const arrowY = dy / length;
      const perpX = -arrowY;
      const perpY = arrowX;
      const head = danger ? 14 : near ? 11 : 8;

      graphics.lineStyle(danger ? 4 : near ? 3 : 2, color, alpha);
      graphics.lineBetween(hazard.position.x, hazard.position.y, projected.x, projected.y);
      graphics.fillStyle(color, Math.min(0.36, alpha + 0.08));
      graphics.fillTriangle(
        projected.x + arrowX * head,
        projected.y + arrowY * head,
        projected.x - arrowX * head * 0.75 + perpX * head * 0.62,
        projected.y - arrowY * head * 0.75 + perpY * head * 0.62,
        projected.x - arrowX * head * 0.75 - perpX * head * 0.62,
        projected.y - arrowY * head * 0.75 - perpY * head * 0.62
      );
      graphics.lineStyle(danger ? 3 : 2, color, alpha * 0.72);
      graphics.strokeCircle(projected.x, projected.y, Math.max(16, hazard.radius * 0.72));
    });
  }

  private renderResourceReadability(graphics: Phaser.GameObjects.Graphics, player: { x: number; y: number }, pulse: number): void {
    const alerts = getResourceAlerts(this.state);
    if (alerts.charge === "stable" && alerts.hull === "stable") return;

    if (alerts.charge !== "stable") {
      const critical = alerts.charge === "critical";
      graphics.lineStyle(critical ? 5 : 3, 0xffd76e, critical ? 0.44 + pulse * 0.26 : 0.24 + pulse * 0.18);
      graphics.strokeCircle(player.x, player.y, critical ? 48 + pulse * 13 : 42 + pulse * 8);
    }
    if (alerts.hull !== "stable") {
      const critical = alerts.hull === "critical";
      graphics.lineStyle(critical ? 5 : 3, 0xff5f9b, critical ? 0.5 + pulse * 0.3 : 0.28 + pulse * 0.18);
      graphics.strokeCircle(player.x, player.y, critical ? 59 + pulse * 16 : 52 + pulse * 10);
    }
  }

  private onResize(): void {
    const scale = Math.min(window.innerWidth / this.state.arena.width, window.innerHeight / this.state.arena.height);
    const offsetX = (window.innerWidth - this.state.arena.width * scale) / 2;
    const offsetY = (window.innerHeight - this.state.arena.height * scale) / 2;
    this.worldLayer?.setScale(scale);
    this.worldLayer?.setPosition(offsetX, offsetY);
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  private applySettings(settings?: { largeLabels?: boolean; reducedMotion?: boolean }): void {
    this.largeLabels = Boolean(settings?.largeLabels);
    this.reducedMotion = Boolean(settings?.reducedMotion);
  }

  private getMotionPulse(rate: number, phase = 0): number {
    return this.reducedMotion ? 0.35 : Math.sin(this.time.now * rate + phase) * 0.5 + 0.5;
  }

  private getMotionWave(rate: number, phase = 0): number {
    return this.reducedMotion ? 0 : Math.sin(this.time.now * rate + phase);
  }
}

function isLocalReleaseQaMode(): boolean {
  const host = window.location.hostname;
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  return localHost && new URLSearchParams(window.location.search).get("qa") === "release";
}

function normalizeQaMove(move?: { x?: number; y?: number }): { x: number; y: number } | undefined {
  const x = Number(move?.x ?? 0);
  const y = Number(move?.y ?? 0);
  const magnitude = Math.hypot(x, y);
  if (!Number.isFinite(magnitude) || magnitude <= 0.05) return undefined;
  if (magnitude <= 1) return { x, y };
  return { x: x / magnitude, y: y / magnitude };
}

function getLossFeedbackDetail(state: GameState): string {
  switch (state.lossContext.source) {
    case "repairDrain":
      return "维修耗尽电量。下一局修到节点后先撤出补流明。";
    case "stormDrain":
      return "风暴吸空电量。下一局进紫区立刻推进脱离。";
    case "stormDamage":
      return "风暴击穿机体。下一局不要在风暴边缘贪修。";
    case "hazardImpact":
      return "碎片造成中断。下一局先保脉冲，绕开碎片密集线。";
    case "boostDrain":
    case "pulseDrain":
    case "baseDrain":
      return "电量归零。下一局先补流明，再修信标。";
    default:
      return state.endReason === "chargeDepleted"
        ? "电量归零。下一局先补流明，再修信标。"
        : "机体损毁。下一局先保脉冲，绕开碎片密集线。";
  }
}

function getHintColor(kind: ObjectiveHint["kind"]): number {
  if (kind === "danger") return 0xff5f9b;
  if (kind === "lumen" || kind === "gate") return 0xffd76e;
  if (kind === "repair") return 0xffffff;
  return 0x67f4ff;
}

function getCoachColor(id: CoachDirective["id"]): number {
  if (id === "escapeStorm" || id === "pulseDanger") return 0xff5f9b;
  if (id === "collectLumen" || id === "recoverCharge" || id === "exitGate") return 0xffd76e;
  if (id === "repairRelay") return 0xffffff;
  return 0x67f4ff;
}

function getNavigatorLabel(coach: CoachDirective, hint: ObjectiveHint): string {
  if (coach.target) {
    if (coach.id === "collectLumen") return "流明";
    if (coach.id === "recoverCharge") return "补电";
    if (coach.id === "reachRelay") return "信标";
    if (coach.id === "repairRelay") return "维修";
    if (coach.id === "exitGate") return "光门";
  }
  if (hint.kind === "lumen") return "流明";
  if (hint.kind === "relay") return "信标";
  if (hint.kind === "repair") return "维修";
  if (hint.kind === "gate") return "光门";
  if (hint.kind === "danger") return "脱险";
  return "目标";
}

function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function toSampleColor(red: number, green: number, blue: number): string {
  const quantizedRed = red & 0xf8;
  const quantizedGreen = green & 0xf8;
  const quantizedBlue = blue & 0xf8;
  return `#${[quantizedRed, quantizedGreen, quantizedBlue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function uniquePalette(colors: string[]): string[] {
  const seen = new Set<string>();
  const palette: string[] = [];
  colors.forEach((color) => {
    const normalized = color.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    palette.push(normalized);
  });
  return palette;
}

function getContractFocusColor(kind: ContractFocus["kind"]): number {
  if (kind === "lumen") return 0xffd76e;
  if (kind === "relay") return 0xffffff;
  if (kind === "avoidStorm") return 0xb388ff;
  return 0xff5f9b;
}

function getContractFocusRadius(kind: ContractFocus["kind"]): number {
  if (kind === "lumen") return 36;
  if (kind === "relay") return 72;
  if (kind === "avoidStorm") return 96;
  return 56;
}

function buildOpeningRoutePreview(state: GameState): RoutePreviewWaypoint[] {
  if (state.status !== "playing" || !state.briefingActive) return [];

  const route: RoutePreviewWaypoint[] = [];
  let cursor = state.player.position;
  if (state.contract.id === "relayRush") {
    const rushRelay = selectRoutePreviewWaypoints(
      state,
      state.relays.filter((target) => !target.repaired).map((target) => target.position),
      cursor,
      1
    )[0];
    if (rushRelay) {
      route.push({ color: 0x67f4ff, label: "速修信标", position: rushRelay });
      cursor = rushRelay;
    }
  }

  const lumenTargets = selectRoutePreviewWaypoints(
    state,
    state.lumen.filter((drop) => !drop.collected).map((drop) => drop.position),
    cursor,
    getOpeningLumenWaypointCount(state)
  );

  lumenTargets.forEach((position) => {
    route.push({ color: 0xffd76e, label: "补流明", position });
    cursor = position;
  });

  if (state.contract.id !== "relayRush") {
    const relay = selectRoutePreviewWaypoints(
      state,
      state.relays.filter((target) => !target.repaired).map((target) => target.position),
      cursor,
      1
    )[0];
    if (relay) {
      route.push({ color: 0x67f4ff, label: "修信标", position: relay });
    }
  }

  if (state.gate.open) {
    route.push({ color: 0xfff0a8, label: "撤离", position: state.gate.position });
  }

  return compactOpeningRoutePreview(route);
}

function compactOpeningRoutePreview(route: RoutePreviewWaypoint[]): RoutePreviewWaypoint[] {
  if (route.length <= 4) return route;
  const terminalWaypoint = [...route].reverse().find((waypoint) => waypoint.label !== "补流明");
  if (!terminalWaypoint) return route.slice(0, 4);
  return [...route.filter((waypoint) => waypoint !== terminalWaypoint).slice(0, 3), terminalWaypoint];
}

function getOpeningLumenWaypointCount(state: GameState): number {
  if (state.contract.id === "relayRush") return 0;
  if (state.wave === 1 && state.contract.id === "lumenRoute" && state.contract.status === "active") {
    const collected = getCurrentWaveStats(state).lumenCollected;
    return Math.max(1, Math.min(4, 4 - Math.min(collected, 4)));
  }
  return Math.max(1, Math.min(2, 2 - Math.min(state.stats.lumenCollected, 2)));
}

function selectRoutePreviewWaypoints(
  state: GameState,
  points: Array<{ x: number; y: number }>,
  start: { x: number; y: number },
  count: number
): Array<{ x: number; y: number }> {
  const remaining = points.map((point) => ({ ...point }));
  const selected: Array<{ x: number; y: number }> = [];
  let cursor = start;

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    remaining.forEach((point, index) => {
      const travelDistance = Math.hypot(point.x - cursor.x, point.y - cursor.y);
      const candidateCost = travelDistance + getRoutePreviewRiskPenalty(state, cursor, point);
      if (candidateCost < bestCost) {
        bestCost = candidateCost;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    if (!next) break;
    selected.push(next);
    cursor = next;
  }

  return selected;
}

function getRoutePreviewRiskPenalty(
  state: GameState,
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const modifier = WAVE_MODIFIERS[state.waveModifier];
  const hazardSpeed = 1 + modifier.hazardSpeedBonus;
  const stormPenalty = state.storms.reduce((total, storm) => {
    const clearance = distancePointToSegment(storm.position, from, to) - (getStormActiveRadius(storm) + 36);
    if (clearance < 0) return total + 520;
    if (clearance < 80) return total + 160;
    return total;
  }, 0);
  const hazardPenalty = state.hazards.reduce((total, hazard) => {
    const projected = {
      x: hazard.position.x + hazard.velocity.x * hazardSpeed * 0.9,
      y: hazard.position.y + hazard.velocity.y * hazardSpeed * 0.9
    };
    const clearance = distancePointToSegment(projected, from, to) - (hazard.radius + 74);
    if (clearance < 0) return total + 420;
    if (clearance < 72) return total + 120;
    return total;
  }, 0);
  return stormPenalty + hazardPenalty;
}

function distancePointToSegment(
  point: { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 0.0001) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq));
  const projected = { x: from.x + dx * t, y: from.y + dy * t };
  return Math.hypot(point.x - projected.x, point.y - projected.y);
}

function buildRadarGuide(state: GameState): RadarGuide | undefined {
  const player = state.player.position;
  const repairTarget = getActiveRepairTarget(state);
  if (repairTarget) {
    return {
      kind: "repair",
      position: { ...repairTarget.position },
      title: "维修",
      urgent: true
    };
  }

  const nearestLumen = nearestRadarPoint(
    state.lumen.filter((drop) => !drop.collected).map((drop) => drop.position),
    player
  );
  if (state.player.charge < state.player.maxCharge * 0.34 && nearestLumen) {
    return {
      kind: "lumen",
      position: nearestLumen,
      title: "补电",
      urgent: true
    };
  }
  if (state.gate.open) {
    return {
      kind: "gate",
      position: { ...state.gate.position },
      title: "撤离",
      urgent: false
    };
  }
  if (state.wave === 1 && state.stats.lumenCollected < 2 && nearestLumen) {
    return {
      kind: "lumen",
      position: nearestLumen,
      title: "流明",
      urgent: false
    };
  }

  const nearestRelay = nearestRadarPoint(
    state.relays.filter((relay) => !relay.repaired).map((relay) => relay.position),
    player
  );
  if (nearestRelay) {
    return {
      kind: "relay",
      position: nearestRelay,
      title: "信标",
      urgent: false
    };
  }
  if (nearestLumen) {
    return {
      kind: "lumen",
      position: nearestLumen,
      title: "流明",
      urgent: false
    };
  }

  return undefined;
}

function nearestRadarPoint(
  points: Array<{ x: number; y: number }>,
  origin: { x: number; y: number }
): { x: number; y: number } | undefined {
  let nearestPoint: { x: number; y: number } | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point) => {
    const pointDistance = Math.hypot(point.x - origin.x, point.y - origin.y);
    if (pointDistance < nearestDistance) {
      nearestDistance = pointDistance;
      nearestPoint = { ...point };
    }
  });
  return nearestPoint;
}

function drawDashedLine(
  graphics: Phaser.GameObjects.Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: number,
  alpha: number,
  dash: number,
  gap: number
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return;

  const unitX = dx / length;
  const unitY = dy / length;
  graphics.lineStyle(3, color, alpha);
  for (let distanceAlong = 0; distanceAlong < length; distanceAlong += dash + gap) {
    const segmentEnd = Math.min(distanceAlong + dash, length);
    graphics.lineBetween(
      from.x + unitX * distanceAlong,
      from.y + unitY * distanceAlong,
      from.x + unitX * segmentEnd,
      from.y + unitY * segmentEnd
    );
  }
}
