import type { InputState } from "./simulation";

type VirtualInputState = {
  move: { x: number; y: number };
  boost: boolean;
  repair: boolean;
  pulse: boolean;
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
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
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
  }

  read(): InputState {
    const virtualInput = window.__lumenVirtualInput ?? {
      move: { x: 0, y: 0 },
      boost: false,
      repair: false,
      pulse: false
    };
    const x =
      Number(this.keys.right.isDown || this.keys.arrowRight.isDown) -
      Number(this.keys.left.isDown || this.keys.arrowLeft.isDown) +
      virtualInput.move.x;
    const y =
      Number(this.keys.down.isDown || this.keys.arrowDown.isDown) -
      Number(this.keys.up.isDown || this.keys.arrowUp.isDown) +
      virtualInput.move.y;

    return {
      move: { x, y },
      boost: this.keys.boost.isDown || virtualInput.boost,
      repair: this.keys.repair.isDown || virtualInput.repair,
      pulse: this.keys.pulse.isDown || virtualInput.pulse
    };
  }
}
