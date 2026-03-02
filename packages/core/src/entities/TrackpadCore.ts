import { BaseEntity } from './BaseEntity';
import { ICoreEntity, IPointerHandler, ISignalReceiver } from '../types/traits';
import { TrackpadConfig } from '../types/configs';
import { TrackpadState } from '../types/state';
import { ACTION_TYPES, CMP_TYPES } from '../types';
import { Registry } from '../registry';
import { createRafThrottler } from '../utils/performance';
import { GestureRecognizer } from '../utils/gesture';
import { isVec2Equal } from '../utils';

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

  private throttledPointerMove: (e: PointerEvent) => void;
  private gesture: GestureRecognizer;

  /**
   * Creates an instance of TrackpadCore.
   *
   * @param uid - Unique entity ID.
   * @param config - Configuration for the trackpad.
   */
  constructor(uid: string, config: TrackpadConfig) {
    super(uid, CMP_TYPES.TRACKPAD, config, INITIAL_STATE);

    // Initialize throttler to align signal emission with screen refresh rate
    // 初始化节流器，使信号发送频率与屏幕刷新率对齐
    this.throttledPointerMove = createRafThrottler<PointerEvent>((e) => {
      this.processPointerMove(e);
    });

    // Configure the gesture state machine / 配置手势状态机
    this.gesture = new GestureRecognizer({
      // Requirement: Single tap -> Click / 需求：轻点 -> 点击
      onTap: () => this.sendSignal(ACTION_TYPES.CLICK),

      // Requirement: Double tap -> Click (Optional enhancement) / 需求：双击 -> 点击
      onDoubleTap: () => this.sendSignal(ACTION_TYPES.CLICK),

      // Requirement: Double-tap & Hold -> Drag / 需求：双击并按住 -> 拖拽开始
      onDoubleTapHoldStart: () => {
        this.setState({ isPressed: true });
        this.sendSignal(ACTION_TYPES.MOUSEDOWN);
      },

      onDoubleTapHoldEnd: () => {
        this.setState({ isPressed: false });
        this.sendSignal(ACTION_TYPES.MOUSEUP);
      },
    });
  }

  // --- IPointerHandler Implementation ---

  public onPointerDown(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    // Set pointer capture to maintain control even if the finger leaves the area
    // 设置指针捕获，即使手指离开区域也能保持控制
    (e.target as Element).setPointerCapture(e.pointerId);

    // Important: lastPointerPos must be updated immediately to prevent jump on first move
    // 关键：必须立即更新最后记录坐标，防止第一次移动时产生巨大的瞬间跳变
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    this.gesture.onPointerDown(e.clientX, e.clientY);

    this.setState({ isActive: true, pointerId: e.pointerId });
  }

  public onPointerMove(e: PointerEvent): void {
    if (this.state.pointerId !== e.pointerId) return;

    // Gesture detection needs raw frequency for precision / 手势检测需要原始频率以保证精度
    this.gesture.onPointerMove(e.clientX, e.clientY);

    // Movement signals are throttled to save CPU / 位移信号经过节流以节省计算资源
    this.throttledPointerMove(e);
  }

  /**
   * Internal logic for processing pointer movement.
   * Calculates displacement and emits relative move signals.
   *
   * @param e - The pointer event.
   */
  private processPointerMove(e: PointerEvent) {
    // Calculate displacement since the last processed frame
    // 计算自上一帧处理以来的位移量
    const dx = e.clientX - this.lastPointerPos.x;
    const dy = e.clientY - this.lastPointerPos.y;

    const rect = this.getRect();
    if (!rect) return;

    // Convert pixel delta to percentage delta relative to target stage size
    // 将像素增量转换为相对于目标舞台尺寸的百分比增量
    const deltaX = (dx / rect.width) * 100 * this.config.sensitivity;
    const deltaY = (dy / rect.height) * 100 * this.config.sensitivity;

    const delta = { x: deltaX, y: deltaY };

    // Emit signal only if there is a measurable change
    // 仅在存在有效位移时发送信号
    if (!isVec2Equal(delta, { x: 0, y: 0 })) {
      this.sendSignal(ACTION_TYPES.MOUSEMOVE, { delta });
    }

    // Update coordinates for the next frame / 更新下一次计算的基准点
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  public onPointerUp(e: PointerEvent): void {
    if (this.state.pointerId !== e.pointerId) return;

    // Resolve gesture results (Tap, DoubleTap, etc.) / 结算手势判定结果
    this.gesture.onPointerUp(e.clientX, e.clientY);

    this.handleRelease(e);
  }

  public onPointerCancel(e: PointerEvent): void {
    this.handleRelease(e);
  }

  // --- IResettable Implementation ---

  public reset(): void {
    // Reset gesture state to prevent stuck "drag" modes
    // 重置手势状态，防止因重置导致的“拖拽模式”粘连
    this.gesture.reset();
    this.setState(INITIAL_STATE);
  }

  // --- Internal Helpers ---

  /**
   * Clean up pointer capture and reset interaction state.
   */
  private handleRelease(e: PointerEvent) {
    if ((e.target as Element).hasPointerCapture(e.pointerId)) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {
        /* Ignore common pointer release errors */
      }
    }
    this.setState(INITIAL_STATE);
  }

  /**
   * Dispatches the signal to the target receiver.
   *
   * @param type - Action type from ACTION_TYPES.
   * @param extraPayload - Data payload like 'delta' for movement or 'button' for clicks.
   */
  private sendSignal(type: string, extraPayload: any = {}) {
    const targetId = this.config.targetStageId;
    if (!targetId) return;

    const target = Registry.getInstance().getEntity<ICoreEntity & ISignalReceiver>(targetId);

    if (target && typeof target.handleSignal === 'function') {
      target.handleSignal({
        targetStageId: targetId,
        type,
        payload: {
          button: 0,
          ...extraPayload,
        },
      });
    }
  }
}
