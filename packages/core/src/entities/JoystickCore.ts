import { BaseEntity } from './BaseEntity';
import { IPointerHandler, IProgrammatic } from '../types/traits';
import { JoystickConfig } from '../types/configs';
import { JoystickState } from '../types/state';
import { AbstractPointerEvent, CMP_TYPES, EntityType } from '../types';
import { ActionEmitter } from '../runtime/action';
import { GestureRecognizer } from '../runtime/gesture';
import { createTicker } from '../runtime/performance';
import { clamp, applyRadialDeadzone, isVec2Equal, lerp } from '../utils/math';

const INITIAL_STATE: JoystickState = {
  isActive: false,
  isPressed: false, // 代表杆头按压状态 / Represents stick head press state
  pointerId: null,
  value: 0,
  vector: { x: 0, y: 0 },
};

const DEFAULT_THRESHOLD = 0.15;
const VECTOR_DIRTY_THRESHOLD = 0.002; // 向量脏检查阈值
const GAMEPAD_SMOOTHING = 0.3; // 柄头位移脏检查阈值

/**
 * Joystick Core Implementation.
 *
 * Supports dual-mode output:
 * 1. Digital: Maps angles to 4/8-way key signals.
 * 2. Analog/Cursor: Maps vector to continuous cursor movement via Tick mechanism.
 */
export class JoystickCore
  extends BaseEntity<JoystickConfig, JoystickState>
  implements IPointerHandler, IProgrammatic
{
  private emitters: {
    up: ActionEmitter;
    down: ActionEmitter;
    left: ActionEmitter;
    right: ActionEmitter;
  };

  private stickEmitter: ActionEmitter;
  private cursorEmitter: ActionEmitter;

  private gesture: GestureRecognizer;
  private ticker: ReturnType<typeof createTicker>;

  constructor(uid: string, config: JoystickConfig, customTypeName?: EntityType) {
    super(uid, customTypeName || CMP_TYPES.JOYSTICK, config, INITIAL_STATE);

    const target = config.targetStageId;
    const m = config.mapping || {};

    // 1. 初始化动作发射器 / Initialize action emitters
    this.emitters = {
      up: new ActionEmitter(target, m.up),
      down: new ActionEmitter(target, m.down),
      left: new ActionEmitter(target, m.left),
      right: new ActionEmitter(target, m.right),
    };
    this.stickEmitter = new ActionEmitter(target, m.stick);
    this.cursorEmitter = new ActionEmitter(target, 'Mouse');

    // 2. 初始化手势识别器（用于杆头点击 L3）/ Gesture recognizer for stick-head tap
    this.gesture = new GestureRecognizer({
      onTap: async () => {
        this.setState({ isPressed: true });
        await this.stickEmitter.tap();
        this.setState({ isPressed: false });
      },
      onDoubleTapHoldStart: () => {
        this.setState({ isPressed: true });
        this.stickEmitter.press();
      },
      onDoubleTapHoldEnd: () => {
        this.setState({ isPressed: false });
        this.stickEmitter.release(false);
      },
    });

    // 3. 初始化 Ticker：用于持续性光标位移 / Ticker for continuous cursor movement
    this.ticker = createTicker(() => {
      this.handleCursorTick();
    });
  }

  // --- IPointerHandler Implementation ---

  public get activePointerId(): number | null {
    return this.state.pointerId;
  }

  public onPointerDown(e: AbstractPointerEvent): void {
    this.setState({ isActive: true, pointerId: e.pointerId, vector: { x: 0, y: 0 } });
    this.gesture.onPointerDown(e.clientX, e.clientY);
    this.processInput(e, true);
  }

  public onPointerMove(e: AbstractPointerEvent): void {
    if (!this.state.isActive || e.pointerId !== this.state.pointerId) return;
    this.gesture.onPointerMove(e.clientX, e.clientY);

    // 如果开启了光标模拟，启动 Ticker / Start cursor ticker if enabled
    if (this.config.cursorMode) {
      this.ticker.start();
    }
    this.processInput(e);
  }

  public onPointerUp(e: AbstractPointerEvent): void {
    if (!this.state.isActive || e.pointerId !== this.state.pointerId) return;
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
    this.setState({ isActive: false, pointerId: null, vector: { x: 0, y: 0 } });

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
        this.markRectDirty();
        return;
      }
    }

    // 基础向量计算 / Basic vector calculation
    const rawVector = { x: normX, y: normY };

    // 应用径向死区 / Apply radial deadzone
    const vector = applyRadialDeadzone(rawVector, 1.0, this.config.threshold ?? DEFAULT_THRESHOLD);

    // 更新内部 vector 状态供适配层渲染浮标 / Update vector for floating stick rendering
    if (!isVec2Equal(vector, this.state.vector, VECTOR_DIRTY_THRESHOLD)) {
      this.setState({ vector });
      this.handleDigitalKeys(vector);
    }
  }

  /**
   * Ticker 回调：处理每帧的光标位移输出
   */
  private handleCursorTick() {
    const { vector, isActive } = this.state;
    if (
      !isActive ||
      !this.config.cursorMode ||
      isVec2Equal(vector, { x: 0, y: 0 }, VECTOR_DIRTY_THRESHOLD)
    ) {
      this.ticker.stop();
      return;
    }

    // 根据向量和灵敏度计算每帧的偏移增量
    // Calculate per-frame delta based on vector and sensitivity
    const sensitivity = this.config.cursorSensitivity ?? 1.0;
    const delta = {
      x: vector.x * Math.abs(vector.x) * sensitivity,
      y: vector.y * Math.abs(vector.y) * sensitivity,
    };

    if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
      // mouse 发射器发送 move 信号
      this.cursorEmitter.move({ delta });
    }
  }

  /**
   * 将摇杆位置转换为 4/8 方向按键信号
   */
  private handleDigitalKeys(v: { x: number; y: number }) {
    const threshold = this.config.threshold ?? DEFAULT_THRESHOLD;

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
    this.setState(INITIAL_STATE);
    this.gesture.reset();

    this.handleRelease();
    this.stickEmitter.reset();
    this.cursorEmitter.reset();
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
    this.stickEmitter.update(target, m.stick);
    this.cursorEmitter.update(target);
  }

  // --- IProgrammatic Implementation ---

  public triggerDown(): void {
    if (this.state.isPressed) return;
    this.setState({ isActive: true, isPressed: true });
    this.stickEmitter.press();
  }

  public triggerUp(): void {
    if (!this.state.isPressed) return;
    this.setState({ isActive: false, isPressed: false });
    this.stickEmitter.release(true);
  }

  public triggerVector(x: number, y: number): void {
    const deadzone = this.config.threshold ?? DEFAULT_THRESHOLD;
    const magnitude = Math.hypot(x, y);

    // 如果手柄回弹到中心，立即切断，不需要平滑
    // If the joystick snaps back to the center, cut the signal immediately; no smoothing is required.
    if (magnitude < deadzone) {
      if (this.state.isActive) this.handleRelease();
      return;
    }

    if (!this.state.isActive) {
      this.setState({ isActive: true });
    }

    const smoothedX = lerp(this.state.vector.x, x, GAMEPAD_SMOOTHING);
    const smoothedY = lerp(this.state.vector.y, y, GAMEPAD_SMOOTHING);
    const vector = { x: smoothedX, y: smoothedY };

    if (!isVec2Equal(vector, this.state.vector, VECTOR_DIRTY_THRESHOLD)) {
      this.setState({ vector });
      this.handleDigitalKeys(vector);
    }

    if (this.config.cursorMode) this.ticker.start();
  }
}
