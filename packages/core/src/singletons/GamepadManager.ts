import { Registry } from './Registry';
import { ICoreEntity, IPointerHandler, IProgrammatic } from '../types/traits';
import { GamepadMappingConfig, StandardButton } from '../types/gamepad';

/**
 * Unique symbol key for the global GameManager instance to ensure
 * singleton persistence across different modules.
 */
const GAMEPAD_MANAGER_KEY = Symbol.for('omnipad.gamepad_manager.instance');

/**
 * Standard Gamepad Button Index Mapping (Standard Mapping).
 * Maps human-readable button names to browser Gamepad API indices.
 */
const BUTTON_MAP: Record<StandardButton, number> = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  Select: 8,
  Start: 9,
  L3: 10,
  R3: 11,
  Up: 12,
  Down: 13,
  Left: 14,
  Right: 15,
};

/**
 * GamepadManager
 *
 * A singleton service that polls the browser Gamepad API via requestAnimationFrame.
 * It translates physical hardware inputs into programmatic signals sent to
 * virtual entities registered in the system.
 *
 * Handles:
 * 1. Button edge detection (Down/Up).
 * 2. D-Pad to vector conversion.
 * 3. Analog stick deadzone processing.
 */
export class GamepadManager {
  private isRunning = false;
  private config: GamepadMappingConfig[] | null = null;

  // Stores the state of buttons from the previous frame to detect changes
  // 记录上一帧的状态，用于判定按下/抬起边缘
  private lastButtonStates: boolean[][] = [];

  private constructor() {}

  /**
   * Retrieves the global singleton instance of the GamepadManager.
   */
  public static getInstance(): GamepadManager {
    const globalObj = globalThis as any;

    if (!globalObj[GAMEPAD_MANAGER_KEY]) {
      globalObj[GAMEPAD_MANAGER_KEY] = new GamepadManager();
    }

    return globalObj[GAMEPAD_MANAGER_KEY];
  }

  /**
   * Updates the current gamepad mapping configuration.
   *
   * @param config - The mapping of physical inputs to virtual component IDs (UID).
   */
  public setConfig(config: GamepadMappingConfig[]) {
    this.config = config;
  }

  /** Return the current gamepad mapping configuration. */
  public getConfig(): Readonly<GamepadMappingConfig[] | null> {
    return this.config;
  }

  /**
   * Starts the polling loop and listens for gamepad connection events.
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Listen for hardware connection updates / 监听硬件连接更新
    // window.addEventListener('gamepadconnected', (e) => {
    //   if (import.meta.env?.DEV) {
    //     console.log('[OmniPad-DOM] Gamepad Connected:', e.gamepad.id);
    //   }
    // });

    // window.addEventListener('gamepaddisconnected', () => {
    //   if (import.meta.env?.DEV) {
    //     console.log('[OmniPad-DOM] Gamepad disconnected.');
    //   }
    // });

    this.loop();
  }

  /**
   * Stops the polling loop.
   */
  public stop() {
    this.isRunning = false;
  }

  /**
   * The core polling loop executing at the browser's refresh rate.
   */
  private loop = () => {
    if (!this.isRunning) return;

    const gamepads = navigator.getGamepads();

    this.config?.forEach((mapping, index) => {
      const pad = gamepads[index]; // Gamepad API 保证 index 是固定的物理插槽

      if (pad && pad.connected && mapping) {
        // 确保状态数组初始化
        if (!this.lastButtonStates[index]) this.lastButtonStates[index] = [];

        this.processButtons(pad, mapping, index);
        this.processDPad(pad, mapping);
        this.processAxes(pad, mapping);
      }
    });

    requestAnimationFrame(this.loop);
  };

  /**
   * Process binary button inputs with edge detection.
   */
  private processButtons(pad: Gamepad, mapping: GamepadMappingConfig, padIndex: number) {
    if (!mapping.buttons) return;

    Object.entries(mapping.buttons).forEach(([btnName, targetCid]) => {
      const btnIndex = BUTTON_MAP[btnName as StandardButton];
      if (btnIndex === undefined || !pad.buttons[btnIndex]) return;

      const isPressed = pad.buttons[btnIndex].pressed;
      const wasPressed = this.lastButtonStates[padIndex][btnIndex] || false;

      // Only trigger if state changed to prevent signal spam / 仅在状态改变时触发，防止信号洪流
      if (isPressed && !wasPressed) {
        this.triggerVirtualEntity(targetCid, 'down');
      } else if (!isPressed && wasPressed) {
        this.triggerVirtualEntity(targetCid, 'up');
      }

      this.lastButtonStates[padIndex][btnIndex] = isPressed;
    });
  }

  /**
   * Translates physical D-Pad buttons into a normalized vector.
   */
  private processDPad(pad: Gamepad, mapping: GamepadMappingConfig) {
    const targetUid = mapping?.dpad;
    if (!targetUid) return;

    // Map binary DPAD buttons to axis values (-1, 0, 1) / 将二进制十字键映射为轴向值
    const up = pad.buttons[12]?.pressed ? -1 : 0;
    const down = pad.buttons[13]?.pressed ? 1 : 0;
    const left = pad.buttons[14]?.pressed ? -1 : 0;
    const right = pad.buttons[15]?.pressed ? 1 : 0;

    const vx = left + right;
    const vy = up + down;

    this.triggerVirtualEntity(targetUid, 'vector', { x: vx, y: vy });
  }

  /**
   * Process analog stick movements with deadzone logic.
   */
  private processAxes(pad: Gamepad, mapping: GamepadMappingConfig) {
    const deadzone = mapping?.deadzone ?? 0.1;

    // Left Stick (Axis 0, 1)
    if (mapping?.leftStick) {
      const x = Math.abs(pad.axes[0]) > deadzone ? pad.axes[0] : 0;
      const y = Math.abs(pad.axes[1]) > deadzone ? pad.axes[1] : 0;
      this.triggerVirtualEntity(mapping.leftStick, 'vector', { x, y });
    }

    // Right Stick (Axis 2, 3)
    if (mapping?.rightStick) {
      const x = Math.abs(pad.axes[2]) > deadzone ? pad.axes[2] : 0;
      const y = Math.abs(pad.axes[3]) > deadzone ? pad.axes[3] : 0;
      this.triggerVirtualEntity(mapping.rightStick, 'vector', { x, y });
    }
  }

  /**
   * Locates a virtual entity and triggers its programmatic interface.
   *
   * @param uid - The Entity ID (UID) of the target.
   * @param action - The type of trigger ('down', 'up', or 'vector').
   * @param payload - Optional data for vector movements.
   */
  private triggerVirtualEntity(
    uid: string,
    action: 'down' | 'up' | 'vector',
    payload?: { x: number; y: number },
  ) {
    const target = Registry.getInstance().getEntity<ICoreEntity & IProgrammatic & IPointerHandler>(
      uid,
    );

    // Safety: Ignore hardware input if the component is currently being touched by a finger
    // 安全机制：如果组件当前正被手指触摸，则忽略硬件手柄的指令，防止输入冲突
    if (!target || target.activePointerId != null) return;

    if (action === 'down' && typeof target.triggerDown === 'function') target.triggerDown();
    if (action === 'up' && typeof target.triggerUp === 'function') target.triggerUp();
    if (action === 'vector' && typeof target.triggerVector === 'function' && payload) {
      target.triggerVector(payload.x, payload.y);
    }
  }
}
