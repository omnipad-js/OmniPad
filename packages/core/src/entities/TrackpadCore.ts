import { BaseEntity } from './BaseEntity';
import { IPointerHandler } from '../types/traits';
import { TrackpadConfig } from '../types/configs';
import { TrackpadState } from '../types/state';
import { AbstractPointerEvent, CMP_TYPES, EntityType } from '../types';
import { GestureRecognizer } from '../runtime/gesture';
import { isVec2Equal } from '../utils/math';
import { ActionEmitter } from '../runtime/action';

/**
 * Initial state for the trackpad.
 */
const INITIAL_STATE: TrackpadState = {
  isActive: false,
  isPressed: false,
  pointerId: null,
  value: 0,
};

/**
 * Core logic implementation for a trackpad widget.
 *
 * Translates pointer gestures into relative mouse movements and click actions.
 * Supports:
 * - Single Tap: Dispatches a 'click' signal.
 * - Swipe: Dispatches incremental 'mousemove' signals.
 * - Double-tap and Hold: Enters drag mode (mousedown + mousemove).
 */
export class TrackpadCore
  extends BaseEntity<TrackpadConfig, TrackpadState>
  implements IPointerHandler
{
  /** Stores the last processed client coordinates to calculate delta / 存储上次处理的客户端坐标以计算增量 */
  private lastPointerPos = { x: 0, y: 0 };

  private gesture: GestureRecognizer;
  private emitter: ActionEmitter;

  /**
   * Creates an instance of TrackpadCore.
   *
   * @param uid - Unique entity ID.
   * @param config - Configuration for the trackpad.
   */
  constructor(uid: string, config: TrackpadConfig, customTypeName?: EntityType) {
    super(uid, customTypeName || CMP_TYPES.TRACKPAD, config, INITIAL_STATE);

    // 初始化动作发射器：默认模拟鼠标左键 / Initialize emitter, default to Left Mouse Button
    const mouseAction = config.mapping || { type: 'mouse' };
    this.emitter = new ActionEmitter(config.targetStageId, mouseAction);

    // Configure the gesture state machine / 配置手势状态机
    this.gesture = new GestureRecognizer({
      // Requirement: Single tap -> Click / 需求：轻点 -> 点击
      onTap: () => {
        this.setState({ isPressed: true });
        this.emitter.tap();
      },

      // Requirement: Double-tap & Hold -> Drag / 需求：双击并按住 -> 拖拽开始
      onDoubleTapHoldStart: () => {
        this.setState({ isPressed: true });
        this.emitter.press();
      },

      onDoubleTapHoldEnd: () => {
        this.setState({ isPressed: false });
        this.emitter.release(false);
      },
    });
  }

  // --- IPointerHandler Implementation ---

  public get activePointerId(): number | null {
    return this.state.pointerId;
  }

  public onPointerDown(e: AbstractPointerEvent): void {
    // Important: lastPointerPos must be updated immediately to prevent jump on first move
    // 关键：必须立即更新最后记录坐标，防止第一次移动时产生巨大的瞬间跳变
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    this.gesture.onPointerDown(e.clientX, e.clientY);

    this.setState({ isActive: true, pointerId: e.pointerId });
  }

  public onPointerMove(e: AbstractPointerEvent): void {
    if (!this.state.isActive || e.pointerId !== this.state.pointerId) return;

    // Gesture detection needs raw frequency for precision / 手势检测需要原始频率以保证精度
    this.gesture.onPointerMove(e.clientX, e.clientY);
    this.processInput(e);
  }

  /**
   * Internal logic for processing pointer movement.
   * Calculates displacement and emits relative move signals.
   *
   * @param e - The pointer event.
   */
  private processInput(e: AbstractPointerEvent) {
    // 状态锁保护，防止节流产生的异常信号 / State lock protection prevents abnormal signals caused by throttling.
    if (!this.state.isActive) return;

    // Calculate displacement since the last processed frame
    // 计算自上一帧处理以来的位移量
    const dx = e.clientX - this.lastPointerPos.x;
    const dy = e.clientY - this.lastPointerPos.y;

    const rect = this.rect;
    if (!rect) return;

    // Convert pixel delta to percentage delta relative to target stage size
    // 将像素增量转换为相对于目标舞台尺寸的百分比增量
    const deltaX = (dx / rect.width) * 100 * (this.config.sensitivity ?? 1.0);
    const deltaY = (dy / rect.height) * 100 * (this.config.sensitivity ?? 1.0);

    const delta = { x: deltaX, y: deltaY };

    // Emit signal only if there is a measurable change
    // 仅在存在有效位移时发送信号
    if (!isVec2Equal(delta, { x: 0, y: 0 })) {
      this.emitter.move({ delta });
    }

    // Update coordinates for the next frame / 更新下一次计算的基准点
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  public onPointerUp(e: AbstractPointerEvent): void {
    if (!this.state.isActive || e.pointerId !== this.state.pointerId) return;

    // Resolve gesture results (Tap, DoubleTap, etc.) / 结算手势判定结果
    this.gesture.onPointerUp();

    this.handleRelease();
  }

  public onPointerCancel(): void {
    this.handleRelease();
  }

  // --- IResettable Implementation ---

  public reset(): void {
    // Reset gesture state to prevent stuck "drag" modes
    // 重置手势状态，防止因重置导致的“拖拽模式”粘连
    this.gesture.reset();
    this.emitter.reset();

    this.handleRelease();
  }

  // --- IConfigurable Implementation ---

  public override updateConfig(newConfig: Partial<TrackpadConfig>): void {
    super.updateConfig(newConfig);

    // 同步更新发射器配置 / sync update configuration of emitter
    this.emitter.update(this.config.targetStageId, this.config.mapping);
  }

  // --- Internal Logic ---

  /**
   * Clean up pointer capture and reset interaction state.
   */
  private handleRelease() {
    this.setState(INITIAL_STATE);
  }
}
