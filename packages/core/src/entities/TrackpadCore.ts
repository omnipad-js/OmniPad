import { BaseEntity } from './BaseEntity';
import { ICoreEntity, IPointerHandler, ISignalReceiver } from '../types/traits';
import { TrackpadConfig } from '../types/configs';
import { TrackpadState } from '../types/state';
import { ACTION_TYPES, CMP_TYPES } from '../types';
import { Registry } from '../registry';
import { createRafThrottler } from '../utils/performance';

/** Internal gesture constants */
const GESTURE = {
  TAP_TIME: 200, // 200ms 以内抬起视为轻点 / Release within 200ms counts as a tap
  TAP_DISTANCE: 10, // 位移小于 10px 视为点击判定 / Movement within 10px counts as a tap
  DOUBLE_TAP_GAP: 300, // 两次点击间隔小于 300ms 视为双击触发 / Interval within 300ms counts as double-tap
};

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
 * Translates pointer gestures into relative mouse movements and click actions.
 * Supports tap-to-click and double-tap-to-drag scenarios.
 */
export class TrackpadCore
  extends BaseEntity<TrackpadConfig, TrackpadState>
  implements IPointerHandler
{
  private lastPointerPos = { x: 0, y: 0 };
  private startTime = 0;
  private startPos = { x: 0, y: 0 };

  // 连击状态追踪 / State tracking for consecutive taps
  private lastClickTime = 0;
  private isDragMode = false;

  private throttledPointerMove: (e: PointerEvent) => void;

  /**
   * Creates an instance of TrackpadCore.
   *
   * @param uid - Unique entity ID.
   * @param config - Configuration for the trackpad.
   */
  constructor(uid: string, config: TrackpadConfig) {
    super(uid, CMP_TYPES.TRACKPAD, config, INITIAL_STATE);

    // 初始化节流器以优化移动事件处理 / Initialize throttler to optimize movement processing
    this.throttledPointerMove = createRafThrottler<PointerEvent>((e) => {
      this.processPointerMove(e);
    });
  }

  // --- IPointerHandler Implementation ---

  public onPointerDown(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    // 锁定指针捕获，处理跨越边界的滑动 / Set pointer capture for cross-boundary movement
    (e.target as Element).setPointerCapture(e.pointerId);

    const now = Date.now();
    this.startTime = now;
    this.startPos = { x: e.clientX, y: e.clientY };
    this.lastPointerPos = { x: e.clientX, y: e.clientY };

    // 检测双击拖拽模式：判断当前按下与上次点击的时间差 / Detect double-tap-to-drag mode
    if (now - this.lastClickTime < GESTURE.DOUBLE_TAP_GAP) {
      this.isDragMode = true;
      this.sendSignal(ACTION_TYPES.MOUSEDOWN);
      this.setState({ isPressed: true }); // 显示“按下”视觉反馈 / Show "Pressed" visual feedback
    }

    this.setState({ isActive: true, pointerId: e.pointerId });
  }

  public onPointerMove(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    // 验证 pointerId 匹配 / Validate pointerId matching
    if (this.state.pointerId !== e.pointerId) return;

    this.throttledPointerMove(e);
  }

  /**
   * Internal logic for processing pointer movement.
   * Calculates displacement and emits relative move signals.
   *
   * @param e - The pointer event.
   */
  private processPointerMove(e: PointerEvent) {
    // 计算物理像素位移量 / Calculate displacement in physical pixels
    const dx = e.clientX - this.lastPointerPos.x;
    const dy = e.clientY - this.lastPointerPos.y;

    // 获取实时边界以换算百分比增量 / Get real-time boundary for percentage delta conversion
    const rect = this.getRect();
    if (!rect) return;

    // 算法：(位移像素 / 容器像素) * 100 * 灵敏度 / Formula: (Pixel Delta / Rect Size) * 100 * Sensitivity
    const deltaX = (dx / rect.width) * 100 * this.config.sensitivity;
    const deltaY = (dy / rect.height) * 100 * this.config.sensitivity;

    // 仅在产生实际位移时发送信号 / Send signal only when actual movement occurs
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
      this.sendSignal(ACTION_TYPES.MOUSEMOVE, { delta: { x: deltaX, y: deltaY } });
    }

    // 更新最后记录位置 / Update the last recorded position
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  public onPointerUp(e: PointerEvent): void {
    if (this.state.pointerId !== e.pointerId) return;
    if (e.cancelable) e.preventDefault();

    const duration = Date.now() - this.startTime;
    const dist = Math.hypot(e.clientX - this.startPos.x, e.clientY - this.startPos.y);

    if (this.isDragMode) {
      // 结束拖拽模式 / Terminate drag mode
      this.sendSignal(ACTION_TYPES.MOUSEUP);
      this.isDragMode = false;
    } else if (duration < GESTURE.TAP_TIME && dist < GESTURE.TAP_DISTANCE) {
      // 满足点击判定，发送完整点击序列 / Condition met, emit click sequence
      this.sendSignal(ACTION_TYPES.CLICK);

      // 记录点击结束时间供下次 Down 时判定双击 / Record end time for future double-tap detection
      this.lastClickTime = Date.now();
    }

    this.handleRelease(e);
  }

  public onPointerCancel(e: PointerEvent): void {
    this.handleRelease(e);
  }

  // --- IResettable Implementation ---

  public reset(): void {
    // 重置前强制补发 MouseUp 信号 / Force emit MouseUp signal before reset
    if (this.isDragMode) this.sendSignal(ACTION_TYPES.MOUSEUP);

    this.isDragMode = false;
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
        /* Ignore release errors */
      }
    }
    this.setState(INITIAL_STATE);
  }

  /**
   * Helper to send signals to the target stage via Registry.
   *
   * @param type - Signal action type.
   * @param extraPayload - Additional data like delta or point.
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
          button: 0, // 触摸板操作默认模拟左键 / Trackpad defaults to left button
          ...extraPayload,
        },
      });
    }
  }
}
