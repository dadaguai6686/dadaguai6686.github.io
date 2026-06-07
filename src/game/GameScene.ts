import Phaser from "phaser";
import { InputMapper } from "./input";
import {
  COMBO_WINDOW_SECONDS,
  createInitialState,
  getActiveRepairTarget,
  getCoachDirective,
  getContractFocus,
  getContractSnapshot,
  getHazardThreats,
  getObjectiveHint,
  getResourceAlerts,
  getRunPerformance,
  getRoutePlan,
  getRunRating,
  getStormActiveRadius,
  getUpgradeChoices,
  getUpgradeSummaries,
  pauseRun,
  resumeRun,
  restartRun,
  SECTOR_LAYOUTS,
  updateSimulation,
  WAVE_MODIFIERS,
  type CoachDirective,
  type ContractFocus,
  type ContractSnapshot,
  type DifficultyId,
  type GameState,
  type Hazard,
  type Lumen,
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
  radar: RadarSnapshot;
  upgradeSummaries: UpgradeSummary[];
  upgradeChoices: Upgrade[];
};

type RadarSnapshot = {
  arena: { width: number; height: number };
  gate: { open: boolean; position: { x: number; y: number } };
  hazards: Array<{ id: number; position: { x: number; y: number }; radius: number }>;
  lumen: Array<{ collected: boolean; id: number; position: { x: number; y: number } }>;
  player: { position: { x: number; y: number } };
  relays: Array<{ id: number; position: { x: number; y: number }; progress: number; repaired: boolean }>;
  storms: Array<{ activeRadius: number; id: number; position: { x: number; y: number }; radius: number }>;
};

type FeedbackKind = "boost" | "contract" | "hit" | "loss" | "pickup" | "pulse" | "repair" | "win";

type FeedbackCue = {
  kind: FeedbackKind;
  text: string;
  position: { x: number; y: number };
  color: number;
  scale?: number;
};

type SectorVisual = {
  accent: number;
  base: number;
  grid: number;
  haze: number;
  secondary: number;
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
  private readabilityView?: Phaser.GameObjects.Graphics;
  private starLayer?: Phaser.GameObjects.Graphics;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  private largeLabels = false;
  private reducedMotion = false;

  create(): void {
    this.applySettings(window.__lumenSettings);
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.createTextures();
    this.createWorld();
    this.createHudBridge();
    this.scale.on("resize", this.onResize, this);
  }

  update(_: number, deltaMs: number): void {
    if (!this.inputMapper) return;
    const previousStatus = this.state.status;
    const previousCollectedIds = new Set(this.state.lumen.filter((drop) => drop.collected).map((drop) => drop.id));
    const previousRepairedIds = new Set(this.state.relays.filter((relay) => relay.repaired).map((relay) => relay.id));
    const previousHull = this.state.player.hull;
    const previousBoostCooldown = this.state.player.boostCooldown;
    const previousContractStatus = this.state.contract.status;
    const previousPulseCooldown = this.state.player.pulseCooldown;
    const input = this.inputMapper.read();
    this.state = updateSimulation(this.state, input, Math.min(deltaMs / 1000, 0.033));
    this.renderState();
    this.emitHud();
    this.emitFeedback({
      previousBoostCooldown,
      previousCollectedIds,
      previousContractStatus,
      previousHull,
      previousPulseCooldown,
      previousRepairedIds,
      previousStatus
    });
    if (previousStatus === "playing" && this.state.status !== "playing") {
      window.dispatchEvent(
        new CustomEvent("game:ended", {
          detail: {
            bestCombo: this.state.bestCombo,
            charge: this.state.player.charge,
            contract: getContractSnapshot(this.state),
            difficulty: this.state.difficulty,
            elapsed: this.state.elapsed,
            endReason: this.state.endReason as RunEndReason,
            hull: this.state.player.hull,
            message: this.state.message,
            rating: getRunRating(this.state) as RunRating,
            routePlan: getRoutePlan(this.state.routeSeed) as RoutePlan,
            score: this.state.score,
            sector: SECTOR_LAYOUTS[this.state.sector] as SectorLayout,
            stats: this.state.stats as RunStats,
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
      this.emitHud();
    });
    window.addEventListener("game:resume", () => {
      this.resetInput();
      this.state = resumeRun(this.state);
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
  }

  private resetInput(): void {
    this.inputMapper?.reset();
  }

  private createWorld(): void {
    this.worldLayer?.destroy();
    this.relayViews.clear();
    this.lumenViews.clear();
    this.hazardViews.clear();
    this.stormViews.clear();

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
    body.fillStyle(0xcffaff, 1);
    body.fillTriangle(0, -24, 22, 20, 0, 11);
    body.fillTriangle(0, -24, -22, 20, 0, 11);
    body.fillStyle(0x0b1f2d, 1);
    body.fillCircle(0, 2, 9);
    body.lineStyle(3, 0x67f4ff, 0.95);
    body.strokeCircle(0, 2, 17);
    body.lineStyle(2, 0xffd76e, 0.75);
    body.lineBetween(-18, 18, 18, 18);
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
    const core = this.add.graphics();
    core.lineStyle(4, 0x6af5ff, 0.9);
    core.strokeCircle(0, 0, 30);
    core.lineStyle(2, 0xffd86e, 0.75);
    core.strokeCircle(0, 0, 18);
    core.fillStyle(0xffffff, 0.92);
    core.fillCircle(0, 0, 7);
    const progress = this.add.graphics();
    const label = this.createWorldLabel("信标", "#dffcff", 52);
    return this.add.container(relay.position.x, relay.position.y, [glow, core, progress, label]);
  }

  private createLumen(drop: Lumen): Phaser.GameObjects.Container {
    const gem = this.add.graphics();
    gem.fillStyle(0xffd86e, 0.95);
    gem.fillTriangle(0, -13, 12, 0, 0, 13);
    gem.fillTriangle(0, -13, -12, 0, 0, 13);
    gem.lineStyle(2, 0xffffff, 0.65);
    gem.strokeCircle(0, 0, 14);
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
    const label = this.createWorldLabel("碎片", "#ffd4e5", hazard.radius + 33);
    return this.add.container(hazard.position.x, hazard.position.y, [shard, label]);
  }

  private createStorm(storm: Storm): Phaser.GameObjects.Container {
    const field = this.add.graphics();
    field.fillStyle(0x7d4cff, 0.08);
    field.fillCircle(0, 0, storm.radius);
    field.lineStyle(3, 0xb388ff, 0.35);
    field.strokeCircle(0, 0, storm.radius);
    field.lineStyle(1, 0xff5f9b, 0.28);
    field.strokeCircle(0, 0, storm.radius + 22);
    const label = this.createWorldLabel("风暴", "#d9c8ff", 0);
    label.setAlpha(0.68);
    return this.add.container(storm.position.x, storm.position.y, [field, label]);
  }

  private createGate(): Phaser.GameObjects.Container {
    const ring = this.add.graphics();
    ring.lineStyle(5, 0x344255, 0.9);
    ring.strokeCircle(0, 0, 40);
    ring.lineStyle(2, 0x67f4ff, 0.35);
    ring.strokeCircle(0, 0, 56);
    const label = this.createWorldLabel("北侧光门", "#fff0a8", 56);
    return this.add.container(this.state.gate.position.x, this.state.gate.position.y, [ring, label]);
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
    this.playerView?.setPosition(this.state.player.position.x, this.state.player.position.y);
    const angle = Math.atan2(this.state.player.velocity.y, this.state.player.velocity.x) + Math.PI / 2;
    this.playerView?.setRotation(Number.isFinite(angle) ? angle : 0);
    this.playerView?.setAlpha(this.state.player.invulnerable > 0 ? 0.62 + Math.sin(this.time.now * 0.04) * 0.25 : 1);
    this.trail?.setPosition(this.state.player.position.x, this.state.player.position.y);
    this.trail?.setVisible(!this.reducedMotion && this.state.status === "playing");

    this.state.relays.forEach((relay) => {
      const view = this.relayViews.get(relay.id);
      const progress = view?.getAt(2) as Phaser.GameObjects.Graphics | undefined;
      view?.setAlpha(relay.repaired ? 1 : 0.76);
      view?.setScale(relay.repaired ? 1.08 + Math.sin(this.time.now * 0.004) * 0.03 : 1);
      progress?.clear();
      progress?.lineStyle(6, relay.repaired ? 0xffe27a : 0x67f4ff, 0.9);
      progress?.arc(0, 0, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * relay.progress);
    });

    this.state.lumen.forEach((drop) => {
      const view = this.lumenViews.get(drop.id);
      const gem = view?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
      view?.setVisible(!drop.collected);
      gem?.setRotation(this.time.now * 0.002 + drop.id);
      view?.setScale(1 + Math.sin(this.time.now * 0.004 + drop.id) * 0.08);
    });

    this.state.hazards.forEach((hazard) => {
      const view = this.hazardViews.get(hazard.id);
      const shard = view?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
      view?.setPosition(hazard.position.x, hazard.position.y);
      shard?.setRotation(this.time.now * 0.0015 * (hazard.id % 2 === 0 ? 1 : -1));
    });

    this.state.storms.forEach((storm) => {
      const view = this.stormViews.get(storm.id);
      const graphic = view?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
      const activeRadius = getStormActiveRadius(storm);
      view?.setPosition(storm.position.x, storm.position.y);
      graphic?.setRotation(this.time.now * 0.0006);
      graphic?.clear();
      graphic?.fillStyle(0x7d4cff, 0.06 + Math.sin(storm.phase * 1.7) * 0.025);
      graphic?.fillCircle(0, 0, activeRadius);
      graphic?.lineStyle(3, 0xb388ff, 0.28);
      graphic?.strokeCircle(0, 0, activeRadius);
      graphic?.lineStyle(2, 0xff5f9b, 0.24 + Math.max(0, Math.sin(storm.phase * 1.7)) * 0.22);
      graphic?.strokeCircle(0, 0, storm.radius + 24);
    });

    this.gateView?.setPosition(this.state.gate.position.x, this.state.gate.position.y);
    this.gateView?.setAlpha(this.state.gate.open ? 1 : 0.35);
    this.gateView?.setScale(this.state.gate.open ? 1 + Math.sin(this.time.now * 0.005) * 0.07 : 1);
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
    previousCollectedIds: Set<number>;
    previousContractStatus: GameState["contract"]["status"];
    previousHull: number;
    previousPulseCooldown: number;
    previousRepairedIds: Set<number>;
    previousStatus: GameState["status"];
  }): void {
    if (previous.previousStatus !== "playing") return;
    const newlyCollected = this.state.lumen.filter(
      (drop) => drop.collected && !previous.previousCollectedIds.has(drop.id)
    );
    const newlyRepaired = this.state.relays.filter(
      (relay) => relay.repaired && !previous.previousRepairedIds.has(relay.id)
    );
    if (previous.previousBoostCooldown <= 0 && this.state.player.boostCooldown > 0) {
      this.dispatchFeedback({
        kind: "boost",
        text: "推进",
        position: this.state.player.position,
        color: 0x67f4ff
      });
    }
    if (previous.previousPulseCooldown <= 0 && this.state.player.pulseCooldown > 0) {
      this.dispatchFeedback({
        kind: "pulse",
        text: "脉冲",
        position: this.state.player.position,
        color: 0xb388ff,
        scale: 1.15
      });
    }
    newlyCollected.forEach((drop) => {
      this.dispatchFeedback({
        kind: "pickup",
        text: "+流明",
        position: drop.position,
        color: 0xffd76e
      });
    });
    newlyRepaired.forEach((relay) => {
      this.dispatchFeedback({
        kind: "repair",
        text: "信标修复",
        position: relay.position,
        color: 0xffffff,
        scale: 1.1
      });
    });
    if (previous.previousContractStatus === "active" && this.state.contract.status === "completed") {
      this.dispatchFeedback({
        kind: "contract",
        text: "合约完成",
        position: this.state.player.position,
        color: 0xffd76e,
        scale: 1.16
      });
    }
    if (previous.previousHull - this.state.player.hull >= 5) {
      this.dispatchFeedback({
        kind: "hit",
        text: "受击",
        position: this.state.player.position,
        color: 0xff5f9b,
        scale: 1.18
      });
    }
    if (this.state.status === "won" || this.state.status === "completed") {
      this.dispatchFeedback({
        kind: "win",
        text: this.state.status === "completed" ? "全域稳定" : "撤离成功",
        position: this.state.gate.position,
        color: 0xffd76e,
        scale: 1.22
      });
    }
    if (this.state.status === "lost") {
      this.dispatchFeedback({
        kind: "loss",
        text: "信号中断",
        position: this.state.player.position,
        color: 0xff5f9b,
        scale: 1.2
      });
    }
  }

  private dispatchFeedback(cue: FeedbackCue): void {
    window.dispatchEvent(new CustomEvent("game:feedback", { detail: { kind: cue.kind } }));
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
    if (this.state.status !== "playing" || !target) return;

    const urgent = coach.urgent || hint.urgent;
    const color = coach.target ? getCoachColor(coach.id) : getHintColor(hint.kind);
    const player = this.state.player.position;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const angle = Math.atan2(dy, dx);
    const markerRadius = urgent ? 56 : 46;
    const pulse = Math.sin(this.time.now * 0.006) * 0.5 + 0.5;
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
  }

  private renderReadability(): void {
    const graphics = this.readabilityView;
    if (!graphics) return;
    graphics.clear();
    if (this.state.status !== "playing") return;

    const player = this.state.player.position;
    const pulse = Math.sin(this.time.now * 0.008) * 0.5 + 0.5;

    this.renderRepairReadability(graphics, player, pulse);
    this.renderContractFocus(graphics, pulse);
    this.renderHazardReadability(graphics, player, pulse);
    this.renderResourceReadability(graphics, player, pulse);
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
    if (!repairTarget) return;

    const isCharging = repairTarget.progress > 0;
    const alpha = isCharging ? 0.52 + pulse * 0.24 : 0.28 + pulse * 0.12;
    graphics.lineStyle(isCharging ? 5 : 3, 0xf7fbff, alpha);
    graphics.lineBetween(player.x, player.y, repairTarget.position.x, repairTarget.position.y);
    graphics.lineStyle(2, 0xffd76e, 0.3 + pulse * 0.22);
    graphics.strokeCircle(repairTarget.position.x, repairTarget.position.y, 58 + pulse * 10);
    graphics.lineStyle(2, 0x67f4ff, 0.22 + pulse * 0.18);
    graphics.strokeCircle(player.x, player.y, 34 + pulse * 7);
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

function projectHazardPosition(
  hazard: Hazard,
  seconds: number,
  arena: { width: number; height: number },
  speedScale: number
): { x: number; y: number } {
  return {
    x: reflectWithin(hazard.position.x + hazard.velocity.x * seconds * speedScale, 70, arena.width - 70),
    y: reflectWithin(hazard.position.y + hazard.velocity.y * seconds * speedScale, 84, arena.height - 70)
  };
}

function reflectWithin(value: number, min: number, max: number): number {
  if (max <= min) return min;
  let next = value;
  for (let guard = 0; guard < 4 && (next < min || next > max); guard += 1) {
    if (next < min) {
      next = min + (min - next);
    } else if (next > max) {
      next = max - (next - max);
    }
  }
  return Math.max(min, Math.min(max, next));
}
