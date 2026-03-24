import { BaseEntity } from './BaseEntity';
import { IPointerHandler, IProgrammatic } from '../types/traits';
import { DPadConfig } from '../types/configs';
import { DPadState } from '../types/state';
import { AbstractPointerEvent, CMP_TYPES } from '../types';
import { ActionEmitter } from '../utils/action';
import { clamp, isVec2Equal, lerp } from '../utils/math';

const INITIAL_STATE: DPadState = {
  isActive: false,
  pointerId: null,
  vector: { x: 0, y: 0 },
};

const VECTOR_DIRTY_THRESHOLD = 0.002; // 向量脏检查阈值
const GAMEPAD_SMOOTHING = 0.3; // 柄头位移脏检查阈值

/**
 * Core logic for a virtual D-Pad widget.
 *
 * Acts as a spatial distributor that maps a single touch point to 4 independent ActionEmitters.
 * Supports 8-way input by allowing simultaneous activation of orthogonal directions.
 */
export class DPadCore
  extends BaseEntity<DPadConfig, DPadState>
  implements IPointerHandler, IProgrammatic
{
  // 维护四个独立的动作发射器 / Maintain four independent action emitters
  private emitters: {
    up: ActionEmitter;
    down: ActionEmitter;
    left: ActionEmitter;
    right: ActionEmitter;
  };

  constructor(uid: string, config: DPadConfig) {
    super(uid, CMP_TYPES.D_PAD, config, INITIAL_STATE);

    // 为每个方向初始化发射器 / Initialize emitters for each direction
    const target = config.targetStageId;
    this.emitters = {
      up: new ActionEmitter(target, config.mapping?.up),
      down: new ActionEmitter(target, config.mapping?.down),
      left: new ActionEmitter(target, config.mapping?.left),
      right: new ActionEmitter(target, config.mapping?.right),
    };
  }

  // --- IPointerHandler Implementation ---

  public get activePointerId(): number | null {
    return this.state.pointerId;
  }

  public onPointerDown(e: AbstractPointerEvent): void {
    this.setState({ isActive: true, pointerId: e.pointerId, vector: { x: 0, y: 0 } });
    this.processInput(e, true);
  }

  public onPointerMove(e: AbstractPointerEvent): void {
    if (!this.state.isActive || e.pointerId !== this.state.pointerId) return;
    this.processInput(e);
  }

  public onPointerUp(e: AbstractPointerEvent): void {
    if (!this.state.isActive || e.pointerId !== this.state.pointerId) return;
    this.reset();
  }

  public onPointerCancel(): void {
    this.reset();
  }

  // --- Internal Logic ---

  /**
   * Evaluates the touch position and updates the 4 emitters accordingly.
   * 使用轴向分割逻辑处理 8 方向输入
   */
  private processInput(e: AbstractPointerEvent, validate: boolean = false) {
    // 状态锁保护，防止节流产生的异常信号 / State lock protection prevents abnormal signals caused by throttling.
    if (!this.state.isActive) return;

    const rect = this.rect;
    if (!rect) return;

    // 1. 计算归一化向量 / Calculate normalized vector
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radiusX = rect.width / 2;
    const radiusY = rect.height / 2;

    const normX = (e.clientX - centerX) / radiusX;
    const normY = (e.clientY - centerY) / radiusY;

    // 验证触发点位置；若超出边界，则重置触发点位置 / Verify the trigger point location; if it is out of bounds, reset it.
    if (validate) {
      if (normX != clamp(normX, -1, 1) || normY != clamp(normY, -1, 1)) {
        this.setState({ vector: { x: 0, y: 0 } });
        this.markRectDirty();
        return;
      }
    }

    const vector = { x: clamp(normX, -1, 1), y: clamp(normY, -1, 1) };

    // 更新内部 vector 状态供适配层渲染浮标 / Update vector for floating stick rendering
    if (!isVec2Equal(vector, this.state.vector, VECTOR_DIRTY_THRESHOLD)) {
      this.setState({ vector });
      this.handleDigitalKeys(vector);
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
    // 强制按顺序切断所有信号 / Forcefully cut off all signals in sequence
    this.emitters.up.reset();
    this.emitters.down.reset();
    this.emitters.left.reset();
    this.emitters.right.reset();

    this.setState(INITIAL_STATE);
  }

  // --- IConfigurable Implementation ---

  public override updateConfig(newConfig: Partial<DPadConfig>): void {
    super.updateConfig(newConfig);

    // 同步更新发射器配置 / sync update configuration of emitter
    this.emitters.up.update(this.config.targetStageId, this.config.mapping?.up);
    this.emitters.down.update(this.config.targetStageId, this.config.mapping?.down);
    this.emitters.left.update(this.config.targetStageId, this.config.mapping?.left);
    this.emitters.right.update(this.config.targetStageId, this.config.mapping?.right);
  }

  // --- IProgrammatic Implementation ---

  public triggerVector(x: number, y: number): void {
    const threshold = this.config.threshold ?? 0.3;

    // D-Pad 通常关注最大偏移量，如果任一轴都没过阈值，视为回正
    // For a D-pad, the focus is typically on the maximum offset; if none of the axes exceed the threshold, it is considered to have returned to center.
    if (Math.abs(x) < threshold && Math.abs(y) < threshold) {
      if (this.state.isActive) {
        this.reset();
      }
      return;
    }

    if (!this.state.isActive) {
      this.setState({ isActive: true });
    }

    // 如果开了 showStick，平滑处理能让那个小浮标动起来极其丝滑
    // If showStick is enabled, anti-aliasing makes the little cursor move incredibly smoothly.
    const smoothedX = lerp(this.state.vector.x, x, GAMEPAD_SMOOTHING);
    const smoothedY = lerp(this.state.vector.y, y, GAMEPAD_SMOOTHING);
    const vector = { x: smoothedX, y: smoothedY };

    // 只有当平滑后的位移超过阈值时才更新状态
    // The state is updated only when the smoothed displacement exceeds the threshold.
    if (!isVec2Equal(vector, this.state.vector, VECTOR_DIRTY_THRESHOLD)) {
      this.setState({ vector });
      this.handleDigitalKeys(vector);
    }
  }
}
