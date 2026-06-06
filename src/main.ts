import Phaser from "phaser";
import { GameScene } from "./game/GameScene";
import { UPGRADE_CATALOG, type Upgrade, type UpgradeId } from "./game/simulation";
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
const startButton = document.querySelector<HTMLButtonElement>("#start-button")!;
const chargeFill = document.querySelector<HTMLElement>("#charge-fill")!;
const hullFill = document.querySelector<HTMLElement>("#hull-fill")!;
const chargeValue = document.querySelector<HTMLElement>("#charge-value")!;
const hullValue = document.querySelector<HTMLElement>("#hull-value")!;
const relayValue = document.querySelector<HTMLElement>("#relay-value")!;
const lumenValue = document.querySelector<HTMLElement>("#lumen-value")!;
const waveValue = document.querySelector<HTMLElement>("#wave-value")!;
const scoreValue = document.querySelector<HTMLElement>("#score-value")!;
const comboValue = document.querySelector<HTMLElement>("#combo-value")!;
const bestComboValue = document.querySelector<HTMLElement>("#best-combo-value")!;
const boostPill = document.querySelector<HTMLElement>("#boost-pill")!;
const pulsePill = document.querySelector<HTMLElement>("#pulse-pill")!;
const missionText = document.querySelector<HTMLElement>("#mission-text")!;
const upgradeChoices = document.querySelector<HTMLDivElement>("#upgrade-choices")!;
const touchStick = document.querySelector<HTMLDivElement>("#touch-stick")!;
const touchStickKnob = document.querySelector<HTMLSpanElement>("#touch-stick span")!;
const touchButtons = document.querySelectorAll<HTMLButtonElement>("[data-touch-action]");
let latestUpgradeChoices: Upgrade[] = [];

window.__lumenVirtualInput = {
  move: { x: 0, y: 0 },
  boost: false,
  repair: false,
  pulse: false
};

startButton.addEventListener("click", () => {
  launchRun();
});

function launchRun(upgradeId?: UpgradeId): void {
  overlay.classList.remove("show");
  upgradeChoices.hidden = true;
  window.dispatchEvent(new CustomEvent("game:start", { detail: { upgradeId } }));
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
    upgradeChoices: Upgrade[];
  };

  chargeFill.style.width = `${ratio(detail.charge, detail.maxCharge)}%`;
  hullFill.style.width = `${ratio(detail.hull, detail.maxHull)}%`;
  chargeValue.textContent = String(Math.ceil(detail.charge));
  hullValue.textContent = String(Math.ceil(detail.hull));
  relayValue.textContent = detail.relays;
  lumenValue.textContent = String(detail.lumen);
  waveValue.textContent = String(detail.wave);
  scoreValue.textContent = detail.score.toLocaleString();
  comboValue.textContent = `${detail.combo.toFixed(1)}x`;
  bestComboValue.textContent = `${detail.bestCombo.toFixed(1)}x`;
  boostPill.textContent = detail.boostReady ? "Boost ready" : "Boost charging";
  pulsePill.textContent = detail.pulseReady ? "Pulse ready" : "Pulse cooling";
  boostPill.classList.toggle("cooling", !detail.boostReady);
  pulsePill.classList.toggle("cooling", !detail.pulseReady);
  missionText.textContent = detail.message;
  latestUpgradeChoices = detail.upgradeChoices;
});

window.addEventListener("game:ended", (event) => {
  const detail = (event as CustomEvent).detail as { status: "won" | "lost"; message: string };
  overlay.classList.add("show");
  overlay.querySelector(".eyebrow")!.textContent = detail.status === "won" ? "network restored" : "run failed";
  overlay.querySelector("h1")!.textContent = detail.status === "won" ? "Drift Complete" : "Signal Lost";
  overlay.querySelector("p")!.textContent = detail.message;
  startButton.textContent = detail.status === "won" ? "Skip Upgrade" : "Retry Run";
  upgradeChoices.hidden = detail.status !== "won";
  if (detail.status === "won") {
    renderUpgradeChoices();
  }
});

function renderUpgradeChoices(): void {
  const choices = latestUpgradeChoices.length > 0 ? latestUpgradeChoices : Object.values(UPGRADE_CATALOG).slice(0, 3);
  upgradeChoices.replaceChildren(
    ...choices.map((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-option";
      button.innerHTML = `<strong>${choice.name}</strong><span>${choice.description}</span>`;
      button.addEventListener("click", () => launchRun(choice.id));
      return button;
    })
  );
}

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
