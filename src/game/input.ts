import type { InputState } from "./simulation";

type VirtualInputState = {
  move: { x: number; y: number };
  boost: boolean;
  repair: boolean;
  pulse: boolean;
  tap?: {
    boost: number;
    repair: number;
    pulse: number;
  };
};

type LumenSettingsState = {
  largeLabels: boolean;
  reducedMotion: boolean;
};

declare global {
  interface Window {
    __lumenSettings?: LumenSettingsState;
    __lumenVirtualInput?: VirtualInputState;
  }
}

export class InputMapper {
  private static readonly TAP_BUFFER_FRAMES = 4;

  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly handleKeyDown = (event: KeyboardEvent) => this.bufferKeyDown(event);
  private bufferedMove = { x: 0, y: 0 };
  private moveFrames = 0;
  private boostFrames = 0;
  private repairFrames = 0;
  private pulseFrames = 0;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.keyboard = keyboard;
    this.keys = keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D",
      arrowUp: "UP",
      arrowDown: "DOWN",
      arrowLeft: "LEFT",
      arrowRight: "RIGHT",
      boost: "SPACE",
      repair: "E",
      pulse: "Q"
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    window.addEventListener("keydown", this.handleKeyDown);
  }

  read(): InputState {
    const virtualInput = window.__lumenVirtualInput ?? {
      move: { x: 0, y: 0 },
      boost: false,
      repair: false,
      pulse: false,
      tap: { boost: 0, repair: 0, pulse: 0 }
    };
    const bufferedMove = this.moveFrames > 0 ? this.bufferedMove : { x: 0, y: 0 };
    const virtualTap = virtualInput.tap ?? { boost: 0, repair: 0, pulse: 0 };
    const x =
      Number(this.keys.right.isDown || this.keys.arrowRight.isDown) -
      Number(this.keys.left.isDown || this.keys.arrowLeft.isDown) +
      virtualInput.move.x +
      bufferedMove.x;
    const y =
      Number(this.keys.down.isDown || this.keys.arrowDown.isDown) -
      Number(this.keys.up.isDown || this.keys.arrowUp.isDown) +
      virtualInput.move.y +
      bufferedMove.y;

    const input = {
      move: { x, y },
      boost: this.keys.boost.isDown || virtualInput.boost || this.boostFrames > 0 || virtualTap.boost > 0,
      repair: this.keys.repair.isDown || virtualInput.repair || this.repairFrames > 0 || virtualTap.repair > 0,
      pulse: this.keys.pulse.isDown || virtualInput.pulse || this.pulseFrames > 0 || virtualTap.pulse > 0
    };
    this.consumeBufferedInput(virtualInput);
    return input;
  }

  reset(): void {
    this.keyboard.resetKeys();
    this.clearBufferedInput();
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    this.reset();
  }

  private bufferKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const direction = getBufferedDirection(event.code, event.key);
    if (direction) {
      this.bufferedMove = direction;
      this.moveFrames = InputMapper.TAP_BUFFER_FRAMES;
      return;
    }
    const action = getBufferedAction(event.code, event.key);
    if (action === "boost") this.boostFrames = InputMapper.TAP_BUFFER_FRAMES;
    if (action === "repair") this.repairFrames = InputMapper.TAP_BUFFER_FRAMES;
    if (action === "pulse") this.pulseFrames = InputMapper.TAP_BUFFER_FRAMES;
  }

  private consumeBufferedInput(virtualInput: VirtualInputState): void {
    this.moveFrames = Math.max(0, this.moveFrames - 1);
    this.boostFrames = Math.max(0, this.boostFrames - 1);
    this.repairFrames = Math.max(0, this.repairFrames - 1);
    this.pulseFrames = Math.max(0, this.pulseFrames - 1);
    if (virtualInput.tap) {
      virtualInput.tap.boost = Math.max(0, virtualInput.tap.boost - 1);
      virtualInput.tap.repair = Math.max(0, virtualInput.tap.repair - 1);
      virtualInput.tap.pulse = Math.max(0, virtualInput.tap.pulse - 1);
    }
    if (this.moveFrames <= 0) {
      this.bufferedMove = { x: 0, y: 0 };
    }
  }

  private clearBufferedInput(): void {
    this.bufferedMove = { x: 0, y: 0 };
    this.moveFrames = 0;
    this.boostFrames = 0;
    this.repairFrames = 0;
    this.pulseFrames = 0;
    const virtualInput = window.__lumenVirtualInput;
    if (virtualInput?.tap) {
      virtualInput.tap.boost = 0;
      virtualInput.tap.repair = 0;
      virtualInput.tap.pulse = 0;
    }
  }
}

function getBufferedDirection(code: string, key: string): { x: number; y: number } | undefined {
  const normalizedKey = key.toLowerCase();
  if (code === "ArrowRight" || code === "KeyD" || normalizedKey === "arrowright" || normalizedKey === "d") {
    return { x: 1, y: 0 };
  }
  if (code === "ArrowLeft" || code === "KeyA" || normalizedKey === "arrowleft" || normalizedKey === "a") {
    return { x: -1, y: 0 };
  }
  if (code === "ArrowDown" || code === "KeyS" || normalizedKey === "arrowdown" || normalizedKey === "s") {
    return { x: 0, y: 1 };
  }
  if (code === "ArrowUp" || code === "KeyW" || normalizedKey === "arrowup" || normalizedKey === "w") {
    return { x: 0, y: -1 };
  }
  return undefined;
}

function getBufferedAction(code: string, key: string): "boost" | "pulse" | "repair" | undefined {
  const normalizedKey = key.toLowerCase();
  if (code === "Space" || key === " ") return "boost";
  if (code === "KeyE" || normalizedKey === "e") return "repair";
  if (code === "KeyQ" || normalizedKey === "q") return "pulse";
  return undefined;
}
