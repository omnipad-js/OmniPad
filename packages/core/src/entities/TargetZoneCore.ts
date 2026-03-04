import { ACTION_TYPES, InputActionSignal, Vec2, CMP_TYPES } from '../types';
import { TargetZoneConfig } from '../types/configs';
import { CursorState } from '../types/state';
import { IPointerHandler, ISignalReceiver } from '../types/traits';
import * as DOM from '../utils/dom';
import { clamp, isVec2Equal, percentToPx, pxToPercent } from '../utils/math';
import { createRafThrottler } from '../utils/performance';
import { BaseEntity } from './BaseEntity';

/**
 * Initial state for the virtual cursor and focus feedback.
 */
const INITIAL_STATE: CursorState = {
  position: { x: 50, y: 50 },
  isVisible: false,
  isPointerDown: false,
  isFocusReturning: false,
};

/**
 * Core logic for the Target Focus Zone.
 *
 * It acts as a receiver that translates abstract input signals into native browser events,
 * while maintaining virtual cursor positioning and ensuring the game maintains focus.
 */
export class TargetZoneCore
  extends BaseEntity<TargetZoneConfig, CursorState>
  implements IPointerHandler, ISignalReceiver
{
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private focusFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private throttledPointerMove: (e: PointerEvent) => void;

  constructor(uid: string, config: TargetZoneConfig) {
    super(uid, CMP_TYPES.TARGET_ZONE, config, INITIAL_STATE);

    this.throttledPointerMove = createRafThrottler<PointerEvent>((e) => {
      this.processPhysicalEvent(e, ACTION_TYPES.MOUSEMOVE);
    });
  }

  // --- IPointerHandler Implementation ---

  public onPointerDown(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    this.processPhysicalEvent(e, ACTION_TYPES.MOUSEDOWN);
  }

  public onPointerMove(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    // Asynchronously execute throttle logic
    this.throttledPointerMove(e);
  }

  public onPointerUp(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();

    this.processPhysicalEvent(e, ACTION_TYPES.MOUSEUP);
    // Physical clicks also require reissuing "click"
    this.processPhysicalEvent(e, ACTION_TYPES.CLICK);
  }

  public onPointerCancel(e: PointerEvent): void {
    this.processPhysicalEvent(e, ACTION_TYPES.MOUSEUP);
  }

  /**
   * Convert physical DOM events into internal signals
   */
  private processPhysicalEvent(e: PointerEvent, type: string) {
    const rect = this.rect;
    if (!rect) return;

    // Physical coord -> percent coord
    const point = {
      x: pxToPercent(e.clientX - rect.left, rect.width),
      y: pxToPercent(e.clientY - rect.top, rect.height),
    };

    // Physical inputs are converted into virtual signals for processing by the system.
    this.handleSignal({
      targetStageId: this.uid,
      type: type,
      payload: { point, button: e.button as any },
    });
  }

  // --- ISignalReceiver Implementation ---

  public handleSignal(signal: InputActionSignal): void {
    const { type, payload } = signal;

    // 每一条信号触发前，先确保焦点回归游戏区域 / Ensure focus is reclaimed before processing any signal
    this.ensureFocus();

    // 调度执行不同的输入动作 / Dispatch and execute different input actions
    switch (type) {
      case ACTION_TYPES.KEYDOWN:
      case ACTION_TYPES.KEYUP:
        DOM.dispatchKeyboardEvent(type, payload as any);
        break;

      case ACTION_TYPES.MOUSEMOVE:
        if (payload.point) {
          this.updateCursorPosition(payload.point);
        } else if (payload.delta) {
          this.updateCursorPositionByDelta(payload.delta);
        }
        if (this.config.cursorEnabled) this.showCursor();
        this.executeMouseAction(ACTION_TYPES.POINTERMOVE, payload);
        break;

      case ACTION_TYPES.MOUSEDOWN:
      case ACTION_TYPES.MOUSEUP:
      case ACTION_TYPES.CLICK:
        if (payload.point) {
          this.updateCursorPosition(payload.point);
        }
        if (this.config.cursorEnabled) this.showCursor();
        this.executeMouseAction(
          type.startsWith(ACTION_TYPES.MOUSE)
            ? type.replace(ACTION_TYPES.MOUSE, ACTION_TYPES.POINTER)
            : type,
          payload,
        );
        break;
    }
  }

  // --- Mouse & Pointer Simulation ---

  /**
   * Calculates pixel coordinates and dispatches simulated pointer events to the deepest element.
   *
   * @param pointerType - The specific pointer event type (e.g., pointermove, pointerdown).
   * @param payload - Data containing point coordinates or button info.
   */
  private executeMouseAction(pointerType: string, payload: any) {
    // 若适配层尚未汇报 DOM 尺寸，则无法进行坐标换算 / Skip if DOM rect is not reported yet
    const rect = this.rect;
    if (!rect) return;

    // 更新本地按下状态记录 / Update local pointer down state for visual feedback
    if (pointerType === ACTION_TYPES.POINTERDOWN) this.setState({ isPointerDown: true });
    if (pointerType === ACTION_TYPES.POINTERUP) this.setState({ isPointerDown: false });

    // 计算目标百分比坐标，优先使用信号携带的坐标 / Use signal point or fallback to current state position
    const target = payload.point || this.state.position;

    // 换算为屏幕绝对像素坐标 / Convert percentage to absolute pixel coordinates
    const px = rect.left + percentToPx(target.x, rect.width);
    const py = rect.top + percentToPx(target.y, rect.height);

    // 调用驱动层派发合成事件 / Call DOM driver to dispatch synthetic events
    DOM.dispatchPointerEventAtPos(pointerType, px, py, {
      button: payload.button ?? 0,
      buttons: this.state.isPointerDown ? 1 : 0,
    });
  }

  // --- Focus Management ---

  /**
   * Checks if the target element under the virtual cursor has focus, and reclaims it if lost.
   */
  private ensureFocus() {
    const rect = this.rect;
    if (!rect) return;

    // 换算当前光标所在的绝对像素点 / Calculate absolute pixel point of current cursor
    const px = rect.left + percentToPx(this.state.position.x, rect.width);
    const py = rect.top + percentToPx(this.state.position.y, rect.height);

    // 穿透 Shadow DOM 查找该位置最深层的元素 / Find deepest element including Shadow DOM
    const target = DOM.getDeepElement(px, py) as HTMLElement;
    if (!target) return;

    // 若当前焦点不在该目标上，则强制夺回焦点 / If focus is lost, force focus back to target
    if (DOM.getDeepActiveElement() !== target) {
      DOM.focusElement(target);
      this.triggerFocusFeedback();
    }
  }

  /**
   * Activates a temporary visual feedback state to indicate a focus-reclaim event.
   */
  private triggerFocusFeedback() {
    this.setState({ isFocusReturning: true });
    if (this.focusFeedbackTimer) clearTimeout(this.focusFeedbackTimer);
    this.focusFeedbackTimer = setTimeout(() => this.setState({ isFocusReturning: false }), 500);
  }

  // --- Cursor State Helpers ---

  /**
   * Updates the internal virtual cursor coordinates.
   */
  private updateCursorPosition(point: Vec2) {
    if (isVec2Equal(point, this.state.position)) return;
    this.setState({ position: { ...point } });
  }

  /**
   * Updates the internal virtual cursor coordinates by delta.
   */
  private updateCursorPositionByDelta(delta: Vec2) {
    if (isVec2Equal(delta, { x: 0, y: 0 })) return;

    const rect = this.rect;
    if (!rect) return;

    const dxPercent = pxToPercent(delta.x, rect.width);
    const dyPercent = pxToPercent(delta.y, rect.height);

    this.updateCursorPosition({
      x: clamp(this.state.position.x + dxPercent, 0, 100),
      y: clamp(this.state.position.y + dyPercent, 0, 100),
    });
  }

  /**
   * Makes the virtual cursor visible and sets a timeout for auto-hiding.
   */
  private showCursor() {
    this.setState({ isVisible: true });
    if (this.hideTimer) clearTimeout(this.hideTimer);

    // 处理自动隐藏逻辑 / Handle auto-hide logic based on config delay
    if (this.config.cursorAutoDelay && this.config.cursorAutoDelay > 0) {
      this.hideTimer = setTimeout(
        () => this.setState({ isVisible: false }),
        this.config.cursorAutoDelay,
      );
    }
  }

  // --- IResettable Implementation ---

  public reset(): void {
    // 补发松开信号，防止在重载配置时按键或拖拽卡死 / Dispatch Up signal to prevent stuck inputs during reload
    if (this.state.isPointerDown) {
      this.executeMouseAction(ACTION_TYPES.POINTERUP, {});
    }

    // 清理所有活跃的计时器 / Clear all active timers
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.focusFeedbackTimer) clearTimeout(this.focusFeedbackTimer);

    // 重置所有 UI 相关状态 / Reset all UI-related states
    this.setState({
      isVisible: false,
      isPointerDown: false,
      isFocusReturning: false,
    });
  }
}
