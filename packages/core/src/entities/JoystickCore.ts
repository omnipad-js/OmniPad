import { BaseEntity } from './BaseEntity';
import { IPointerHandler } from '../types/traits';
import { JoystickConfig } from '../types/configs';
import { JoystickState } from '../types/state';
import { AbstractPointerEvent, CMP_TYPES } from '../types';
import { ActionEmitter } from '../utils/action';
import { GestureRecognizer } from '../utils/gesture';
import { createRafThrottler, createTicker } from '../utils/performance';
import { clamp, applyRadialDeadzone } from '../utils/math';

const INITIAL_STATE: JoystickState = {
  isActive: false,
  isPressed: false, // 代表杆头按压状态 / Represents stick head press state
  pointerId: null,
  value: 0,
  vector: { x: 0, y: 0 },
};

/**
 * Joystick Core Implementation.
 *
 * Supports dual-mode output:
 * 1. Digital: Maps angles to 4/8-way key signals.
 * 2. Analog/Cursor: Maps vector to continuous cursor movement via Tick mechanism.
 */
export class JoystickCore
  extends BaseEntity<JoystickConfig, JoystickState>
  implements IPointerHandler
{
  private emitters: {
    up: ActionEmitter;
    down: ActionEmitter;
    left: ActionEmitter;
    right: ActionEmitter;
    stick: ActionEmitter;
    mouse: ActionEmitter;
  };

  private gesture: GestureRecognizer;
  private ticker: ReturnType<typeof createTicker>;
  private throttledUpdate: (e: AbstractPointerEvent) => void;

  constructor(uid: string, config: JoystickConfig) {
    super(uid, CMP_TYPES.JOYSTICK, config, INITIAL_STATE);

    const target = config.targetStageId;
    const m = config.mapping || {};

    // 1. 初始化动作发射器 / Initialize action emitters
    this.emitters = {
      up: new ActionEmitter(target, m.up),
      down: new ActionEmitter(target, m.down),
      left: new ActionEmitter(target, m.left),
      right: new ActionEmitter(target, m.right),
      stick: new ActionEmitter(target, m.stick),
      mouse: new ActionEmitter(target, { type: 'mouse' }),
    };

    // 2. 初始化手势识别器（用于杆头点击 L3）/ Gesture recognizer for stick-head tap
    this.gesture = new GestureRecognizer({
      onTap: () => {
        this.setState({ isPressed: true });
        this.emitters.stick.tap();
      },
      onDoubleTapHoldStart: () => {
        this.setState({ isPressed: true });
        this.emitters.stick.press();
      },
      onDoubleTapHoldEnd: () => {
        this.setState({ isPressed: false });
        this.emitters.stick.release(false);
      },
    });

    // 3. 初始化 Ticker：用于持续性光标位移 / Ticker for continuous cursor movement
    this.ticker = createTicker(() => {
      this.handleCursorTick();
    });

    // 4. 初始化节流器：高性能 UI 更新 / Throttler for UI updates
    this.throttledUpdate = createRafThrottler((e: AbstractPointerEvent) => {
      this.processInput(e);
    });
  }

  // --- IPointerHandler Implementation ---

  public get activePointerId(): number | null {
    return this.state.pointerId;
  }

  public onPointerDown(e: AbstractPointerEvent): void {
    this.setState({ isActive: true, pointerId: e.pointerId, vector: { x: 0, y: 0 } });
    this.gesture.onPointerDown(e.clientX, e.clientY);

    // 如果开启了光标模拟，启动 Ticker / Start cursor ticker if enabled
    if (this.config.cursorMode) {
      this.ticker.start();
    }
  }

  public onPointerMove(e: AbstractPointerEvent): void {
    this.gesture.onPointerMove(e.clientX, e.clientY);
    this.throttledUpdate(e);
  }

  public onPointerUp(): void {
    this.gesture.onPointerUp();
    this.handleRelease();
  }

  public onPointerCancel(): void {
    this.handleRelease();
  }

  // --- Internal Logic ---

  /**
   * Clean up pointer capture and reset interaction state.
   */
  private handleRelease() {
    this.setState(INITIAL_STATE);

    this.ticker.stop();

    // 重置所有发射器
    Object.values(this.emitters).forEach((m) => m?.reset());
  }

  /**
   * 计算位移向量并驱动按键逻辑 / Calculate vector and drive key logic
   */
  private processInput(e: AbstractPointerEvent, validate: boolean = false) {
    if (!this.state.isActive) return;

    const rect = this.rect;
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radiusX = rect.width / 2;
    const radiusY = rect.height / 2;

    const normX = (e.clientX - centerX) / radiusX;
    const normY = (e.clientY - centerY) / radiusY;

    if (validate) {
      if (normX != clamp(normX, -1, 1) || normY != clamp(normY, -1, 1)) {
        this.setState({ vector: { x: 0, y: 0 } });
        return;
      }
    }

    // 1. 基础向量计算 / Basic vector calculation
    const rawVector = { x: normX, y: normY };

    // 2. 应用径向死区 / Apply radial deadzone
    // 使用之前 math.ts 里的工具，输入半径为 1.0 的单位向量
    const vector = applyRadialDeadzone(rawVector, 1.0, this.config.threshold || 0.15);

    this.setState({ vector });

    // 3. 驱动按键发射器 / Handle digital key mapping
    this.handleDigitalKeys(vector);
  }

  /**
   * Ticker 回调：处理每帧的光标位移输出
   */
  private handleCursorTick() {
    const { vector, isActive } = this.state;
    if (!isActive || !this.config.cursorMode || !this.gesture.hasMoved) return;

    // 根据向量和灵敏度计算每帧的偏移增量
    // Calculate per-frame delta based on vector and sensitivity
    const sensitivity = this.config.cursorSensitivity ?? 1.0;
    const delta = {
      x: vector.x * sensitivity,
      y: vector.y * sensitivity,
    };

    if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
      // mouse 发射器发送 move 信号
      this.emitters.mouse.move({ delta });
    }
  }

  /**
   * 将摇杆位置转换为 4/8 方向按键信号
   */
  private handleDigitalKeys(v: { x: number; y: number }) {
    const threshold = this.config.threshold ?? 0.3;

    // Y-axis
    if (v.y < -threshold) {
      this.emitters.up.press();
      this.emitters.down.release();
    } else if (v.y > threshold) {
      this.emitters.down.press();
      this.emitters.up.release();
    } else {
      this.emitters.up.release();
      this.emitters.down.release();
    }

    // X-axis
    if (v.x < -threshold) {
      this.emitters.left.press();
      this.emitters.right.release();
    } else if (v.x > threshold) {
      this.emitters.right.press();
      this.emitters.left.release();
    } else {
      this.emitters.left.release();
      this.emitters.right.release();
    }
  }

  // --- IResettable Implementation ---

  public reset(): void {
    this.gesture.reset();

    this.handleRelease();
  }

  public override updateConfig(newConfig: Partial<JoystickConfig>): void {
    super.updateConfig(newConfig);
    // 同步更新所有发射器
    const target = this.config.targetStageId;
    const m = this.config.mapping || {};
    this.emitters.up.update(target, m.up);
    this.emitters.down.update(target, m.down);
    this.emitters.left.update(target, m.left);
    this.emitters.right.update(target, m.right);
    this.emitters.stick.update(target, m.stick);
    this.emitters.stick.update(target);
  }
}
