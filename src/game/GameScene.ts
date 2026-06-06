import Phaser from "phaser";
import { InputMapper } from "./input";
import {
  createInitialState,
  getStormActiveRadius,
  getUpgradeChoices,
  pauseRun,
  resumeRun,
  restartRun,
  updateSimulation,
  type GameState,
  type Hazard,
  type Lumen,
  type Relay,
  type Storm,
  type Upgrade,
  type UpgradeId
} from "./simulation";

type HudSnapshot = {
  charge: number;
  hull: number;
  relays: string;
  lumen: number;
  wave: number;
  score: number;
  combo: number;
  bestCombo: number;
  maxHull: number;
  maxCharge: number;
  boostReady: boolean;
  pulseReady: boolean;
  message: string;
  status: GameState["status"];
  upgradeChoices: Upgrade[];
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
  private starLayer?: Phaser.GameObjects.Graphics;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;

  create(): void {
    this.renderer.resize(window.innerWidth, window.innerHeight);
    this.createTextures();
    this.createWorld();
    this.createHudBridge();
    this.scale.on("resize", this.onResize, this);
  }

  update(_: number, deltaMs: number): void {
    if (!this.inputMapper) return;
    const previousStatus = this.state.status;
    this.state = updateSimulation(this.state, this.inputMapper.read(), Math.min(deltaMs / 1000, 0.033));
    this.renderState();
    this.emitHud();
    if (previousStatus === "playing" && this.state.status !== "playing") {
      window.dispatchEvent(
        new CustomEvent("game:ended", {
          detail: { status: this.state.status, message: this.state.message }
        })
      );
    }
  }

  startRun(): void {
    this.startRunWithUpgrade();
  }

  startRunWithUpgrade(upgradeId?: UpgradeId): void {
    this.state = restartRun(this.state, upgradeId);
    this.createWorld();
    this.renderState();
    this.emitHud();
  }

  private createHudBridge(): void {
    window.addEventListener("game:start", (event) => {
      const detail = (event as CustomEvent<{ upgradeId?: UpgradeId }>).detail;
      this.startRunWithUpgrade(detail?.upgradeId);
    });
    window.addEventListener("game:pause", () => {
      this.state = pauseRun(this.state);
      this.emitHud();
    });
    window.addEventListener("game:resume", () => {
      this.state = resumeRun(this.state);
      this.emitHud();
    });
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
    graphics.clear();
    graphics.fillStyle(0x070910, 1);
    graphics.fillRect(0, 0, this.state.arena.width, this.state.arena.height);

    for (let i = 0; i < 120; i += 1) {
      const x = (i * 137.31) % this.state.arena.width;
      const y = (i * 91.77) % this.state.arena.height;
      const size = 1 + ((i * 17) % 4) * 0.35;
      const alpha = 0.25 + ((i * 29) % 60) / 100;
      graphics.fillStyle(i % 5 === 0 ? 0xffd76e : 0x8fecff, alpha);
      graphics.fillCircle(x, y, size);
    }

    graphics.lineStyle(1, 0x153a4a, 0.45);
    for (let x = 70; x < this.state.arena.width; x += 70) {
      graphics.lineBetween(x, 0, x - 90, this.state.arena.height);
    }
    graphics.lineStyle(1, 0x2c1e46, 0.5);
    for (let y = 80; y < this.state.arena.height; y += 80) {
      graphics.lineBetween(0, y, this.state.arena.width, y + 90);
    }

    graphics.lineStyle(3, 0x65efff, 0.28);
    this.state.relays.forEach((relay, index) => {
      const nextRelay = this.state.relays[(index + 1) % this.state.relays.length];
      graphics.lineBetween(relay.position.x, relay.position.y, nextRelay.position.x, nextRelay.position.y);
    });

    graphics.lineStyle(2, 0xffd76e, 0.18);
    graphics.strokeCircle(500, 350, 250);
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
    return this.add.container(relay.position.x, relay.position.y, [glow, core, progress]);
  }

  private createLumen(drop: Lumen): Phaser.GameObjects.Container {
    const gem = this.add.graphics();
    gem.fillStyle(0xffd86e, 0.95);
    gem.fillTriangle(0, -13, 12, 0, 0, 13);
    gem.fillTriangle(0, -13, -12, 0, 0, 13);
    gem.lineStyle(2, 0xffffff, 0.65);
    gem.strokeCircle(0, 0, 14);
    return this.add.container(drop.position.x, drop.position.y, [gem]);
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
    return this.add.container(hazard.position.x, hazard.position.y, [shard]);
  }

  private createStorm(storm: Storm): Phaser.GameObjects.Container {
    const field = this.add.graphics();
    field.fillStyle(0x7d4cff, 0.08);
    field.fillCircle(0, 0, storm.radius);
    field.lineStyle(3, 0xb388ff, 0.35);
    field.strokeCircle(0, 0, storm.radius);
    field.lineStyle(1, 0xff5f9b, 0.28);
    field.strokeCircle(0, 0, storm.radius + 22);
    return this.add.container(storm.position.x, storm.position.y, [field]);
  }

  private createGate(): Phaser.GameObjects.Container {
    const ring = this.add.graphics();
    ring.lineStyle(5, 0x344255, 0.9);
    ring.strokeCircle(0, 0, 40);
    ring.lineStyle(2, 0x67f4ff, 0.35);
    ring.strokeCircle(0, 0, 56);
    return this.add.container(this.state.gate.position.x, this.state.gate.position.y, [ring]);
  }

  private renderState(): void {
    const camera = this.cameras.main;
    if (this.state.shake > 0) {
      camera.setScroll(
        Phaser.Math.Between(-4, 4) * this.state.shake,
        Phaser.Math.Between(-4, 4) * this.state.shake
      );
    } else {
      camera.setScroll(0, 0);
    }

    this.playerView?.setPosition(this.state.player.position.x, this.state.player.position.y);
    const angle = Math.atan2(this.state.player.velocity.y, this.state.player.velocity.x) + Math.PI / 2;
    this.playerView?.setRotation(Number.isFinite(angle) ? angle : 0);
    this.playerView?.setAlpha(this.state.player.invulnerable > 0 ? 0.62 + Math.sin(this.time.now * 0.04) * 0.25 : 1);
    this.trail?.setPosition(this.state.player.position.x, this.state.player.position.y);

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
      view?.setVisible(!drop.collected);
      view?.setRotation(this.time.now * 0.002 + drop.id);
      view?.setScale(1 + Math.sin(this.time.now * 0.004 + drop.id) * 0.08);
    });

    this.state.hazards.forEach((hazard) => {
      const view = this.hazardViews.get(hazard.id);
      view?.setPosition(hazard.position.x, hazard.position.y);
      view?.setRotation(this.time.now * 0.0015 * (hazard.id % 2 === 0 ? 1 : -1));
    });

    this.state.storms.forEach((storm) => {
      const view = this.stormViews.get(storm.id);
      const graphic = view?.getAt(0) as Phaser.GameObjects.Graphics | undefined;
      const activeRadius = getStormActiveRadius(storm);
      view?.setPosition(storm.position.x, storm.position.y);
      view?.setRotation(this.time.now * 0.0006);
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
      bestCombo: this.state.bestCombo,
      maxHull: this.state.player.maxHull,
      maxCharge: this.state.player.maxCharge,
      boostReady: this.state.player.boostCooldown <= 0,
      pulseReady: this.state.player.pulseCooldown <= 0,
      message: this.state.message,
      status: this.state.status,
      upgradeChoices: this.state.status === "won" ? getUpgradeChoices(this.state) : []
    };
    window.dispatchEvent(new CustomEvent("game:hud", { detail: snapshot }));
  }

  private onResize(): void {
    const scale = Math.min(window.innerWidth / this.state.arena.width, window.innerHeight / this.state.arena.height);
    const offsetX = (window.innerWidth - this.state.arena.width * scale) / 2;
    const offsetY = (window.innerHeight - this.state.arena.height * scale) / 2;
    this.worldLayer?.setScale(scale);
    this.worldLayer?.setPosition(offsetX, offsetY);
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }
}
