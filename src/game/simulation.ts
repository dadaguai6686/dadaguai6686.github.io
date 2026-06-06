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

export type GameStatus = "menu" | "playing" | "won" | "lost";

export type UpgradeId = "engine" | "repair" | "capacitor" | "pulse" | "shield";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  description: string;
};

export type UpgradeState = Record<UpgradeId, number>;

export const UPGRADE_CATALOG: Record<UpgradeId, Upgrade> = {
  engine: {
    id: "engine",
    name: "Vector Engine",
    description: "Higher thrust, faster boost recovery."
  },
  repair: {
    id: "repair",
    name: "Relay Weaver",
    description: "Repair relays faster and earn bigger relay bonuses."
  },
  capacitor: {
    id: "capacitor",
    name: "Deep Capacitor",
    description: "Start waves with more charge and collect more from lumen."
  },
  pulse: {
    id: "pulse",
    name: "Prism Pulse",
    description: "Push hazards farther with a wider pulse field."
  },
  shield: {
    id: "shield",
    name: "Aegis Hull",
    description: "Gain more hull and reduce collision damage."
  }
};

export type GameState = {
  status: GameStatus;
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
  score: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  message: string;
  elapsed: number;
  shake: number;
};

export type InputState = {
  move: Vec2;
  boost: boolean;
  repair: boolean;
  pulse: boolean;
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
    score: 0,
    combo: 1,
    comboTimer: 0,
    bestCombo: 1,
    message: "Repair every relay, harvest lumen, then slip through the gate.",
    elapsed: 0,
    shake: 0
  };
}

export function restartRun(state: GameState, upgradeId?: UpgradeId): GameState {
  const next = createInitialState();
  const wonPreviousWave = state.status === "won";
  next.status = "playing";
  next.wave = wonPreviousWave ? state.wave + 1 : Math.max(1, state.wave);
  next.upgrades = { ...state.upgrades };
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
  next.hazards = next.hazards.concat(
    Array.from({ length: Math.min(3, next.wave - 1) }, (_, i) => ({
      id: 10 + i,
      position: { x: 220 + i * 245, y: 260 + ((i * 133) % 280) },
      velocity: { x: 54 + i * 18, y: i % 2 === 0 ? 72 : -66 },
      radius: 22 + i * 3
    }))
  );
  next.storms = createStorms(next.wave);
  next.message = wonPreviousWave
    ? `Upgrade installed. Wave ${next.wave}: the network fights harder.`
    : `Wave ${next.wave}: chain lumen and relays for a higher score.`;
  return next;
}

export function updateSimulation(state: GameState, input: InputState, dt: number): GameState {
  if (state.status !== "playing") {
    return state;
  }

  const next = structuredClone(state);
  const player = next.player;
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

  const repairTarget = next.relays.find(
    (relay) => !relay.repaired && distance(relay.position, player.position) < 76
  );
  if (repairTarget && input.repair) {
    const repairSpeed = 0.26 + next.upgrades.repair * 0.07 + player.lumen * 0.005;
    repairTarget.progress = Math.min(1, repairTarget.progress + dt * repairSpeed);
    player.charge = Math.max(0, player.charge - dt * 3.2);
    next.message = "Hold steady. The relay is drinking light.";
    if (repairTarget.progress >= 1) {
      repairTarget.repaired = true;
      player.lumen += 2;
      awardScore(next, 260 + next.upgrades.repair * 75, 0.48);
      next.shake = 0.1;
      next.message = `Relay restored. ${formatCombo(next.combo)} chain alive.`;
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
    next.hazards.forEach((hazard) => {
      const toHazard = subtract(hazard.position, player.position);
      const len = Math.hypot(toHazard.x, toHazard.y) || 1;
      const pulseRadius = 210 + pulseLevel * 48;
      if (len < pulseRadius) {
        hazard.velocity.x += (toHazard.x / len) * (215 + pulseLevel * 60);
        hazard.velocity.y += (toHazard.y / len) * (215 + pulseLevel * 60);
      }
    });
    next.message = "Pulse fired. Nearby void shards scatter.";
  }

  next.lumen.forEach((drop) => {
    if (!drop.collected && distance(drop.position, player.position) < 34) {
      drop.collected = true;
      player.lumen += 1;
      player.charge = Math.min(player.maxCharge, player.charge + 9 + next.upgrades.capacitor * 3);
      awardScore(next, 70, 0.25);
      next.message = `Lumen recovered. ${formatCombo(next.combo)} chain.`;
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
      player.hull = Math.max(0, player.hull - 16 * damageScale);
      player.charge = Math.max(0, player.charge - 7);
      player.invulnerable = 0.85;
      next.combo = 1;
      next.comboTimer = 0;
      next.score = Math.max(0, next.score - 75);
      next.shake = 0.32;
      const away = subtract(player.position, hazard.position);
      const len = Math.hypot(away.x, away.y) || 1;
      player.velocity.x += (away.x / len) * 250;
      player.velocity.y += (away.y / len) * 250;
      next.message = "Void impact. Hull integrity falling.";
    }
  });

  next.storms.forEach((storm) => {
    storm.phase += dt * (0.8 + next.wave * 0.04);
    const activeRadius = getStormActiveRadius(storm);
    if (distance(storm.position, player.position) < activeRadius) {
      player.charge = Math.max(0, player.charge - dt * (9 + next.wave * 0.7));
      if (player.invulnerable <= 0 && storm.phase % (Math.PI * 2) > Math.PI * 1.35) {
        player.hull = Math.max(0, player.hull - dt * (5.5 - next.upgrades.shield));
      }
      next.shake = Math.max(next.shake, 0.08);
      next.message = "Storm field siphoning charge. Break line or pulse away.";
    }
  });

  player.charge = Math.max(0, player.charge - dt * (2.05 + next.wave * 0.22));
  next.gate.open = next.relays.every((relay) => relay.repaired);

  if (next.gate.open) {
    next.message = "Gate open. Fly through the north aperture.";
    if (distance(next.gate.position, player.position) < 58) {
      awardScore(next, 900 + player.lumen * 45 + Math.ceil(player.charge) * 8, 0.35);
      next.status = "won";
      next.message = `Network restored. Score ${next.score.toLocaleString()}. Choose an upgrade.`;
    }
  }

  if (player.hull <= 0 || player.charge <= 0) {
    next.status = "lost";
    next.message = player.hull <= 0 ? "Drone shattered. Reboot the run." : "Charge collapsed. The void took the grid.";
  }

  return next;
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

function createStorms(wave: number): Storm[] {
  const baseStorms: Storm[] = [
    { id: 0, position: { x: 495, y: 235 }, radius: 82, phase: 0.8 },
    { id: 1, position: { x: 655, y: 520 }, radius: 74, phase: 2.2 },
    { id: 2, position: { x: 230, y: 395 }, radius: 66, phase: 4.1 }
  ];
  return baseStorms.slice(0, Math.min(baseStorms.length, Math.max(1, Math.ceil(wave / 2))));
}

function awardScore(state: GameState, base: number, comboGain: number): void {
  state.combo = Math.min(5, state.combo + comboGain);
  state.comboTimer = 3.4;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.score += Math.round(base * state.combo);
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
