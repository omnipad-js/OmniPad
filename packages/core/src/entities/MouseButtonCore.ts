import { Registry } from '../registry';
import { ACTION_TYPES, InputActionSignal, CMP_TYPES } from '../types';
import { MouseButtonConfig } from '../types/configs';
import { MouseButtonState } from '../types/state';
import { ICoreEntity, IPointerHandler, ISignalReceiver } from '../types/traits';
import { BaseEntity } from './BaseEntity';

const INITIAL_STATE: MouseButtonState = {
  isActive: false,
  isPressed: false,
  pointerId: null,
  value: 0,
};

/**
 * Core logic implementation for a mouse button widget.
 * Handles pointer interactions and translates them into mouse signals (down, up, click) for a target stage.
 */
export class MouseButtonCore
  extends BaseEntity<MouseButtonConfig, MouseButtonState>
  implements IPointerHandler
{
  constructor(uid: string, config: MouseButtonConfig) {
    super(uid, CMP_TYPES.MOUSE_BUTTON, config, INITIAL_STATE);
  }

  // --- IPointerHandler Implementation ---

  public onPointerDown(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();

    e.stopPropagation();

    // 锁定指针捕获 / Set pointer capture
    (e.target as Element).setPointerCapture(e.pointerId);

    this.setState({
      isActive: true,
      isPressed: true,
      pointerId: e.pointerId,
    });

    // 发送鼠标按下信号 / Send mousedown signal
    this.sendInputSignal(ACTION_TYPES.MOUSEDOWN);
  }

  public onPointerUp(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    this.handleRelease(e, true); // true 表示这是一次正常的抬起，应当触发 click
  }

  public onPointerCancel(e: PointerEvent): void {
    // 被系统打断时不触发 click / Do not trigger click on system cancel
    this.handleRelease(e, false);
  }

  public onPointerMove(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
  }

  // --- Internal Logic ---

  /**
   * Handles the release of the button.
   *
   * @param e - The pointer event.
   * @param isNormalRelease - If true, a 'click' event will also be dispatched.
   */
  private handleRelease(e: PointerEvent, isNormalRelease: boolean) {
    const isCancelEvent = e.type === 'pointercancel' || e.type === 'lostpointercapture';

    if (!isCancelEvent && this.state.pointerId !== e.pointerId) return;

    if ((e.target as Element).hasPointerCapture(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }

    this.setState(INITIAL_STATE);

    // 发送鼠标抬起信号 / Send mouseup signal
    this.sendInputSignal(ACTION_TYPES.MOUSEUP);

    // 如果是正常松手，补发一个 click 信号 / If normal release, emit a click signal
    if (isNormalRelease) {
      this.sendInputSignal(ACTION_TYPES.CLICK);
    }
  }

  /**
   * Dispatches input signals to the registered target stage.
   *
   * @param type - The action type (mousedown, mouseup, or click).
   */
  private sendInputSignal(type: string) {
    const targetId = this.config.targetStageId;
    if (!targetId) return;

    const target = Registry.getInstance().getEntity<ICoreEntity & ISignalReceiver>(targetId);

    if (target && typeof target.handleSignal === 'function') {
      const signal: InputActionSignal = {
        targetStageId: targetId,
        type: type,
        payload: {
          // 传递配置中的鼠标按键索引 (0:左键, 1:中键, 2:右键)
          button: this.config.button ?? 0,
          // 如果配置了固定坐标，一并传递给 TargetZone
          point: this.config.fixedPoint,
        },
      };

      target.handleSignal(signal);
    } else {
      if (import.meta.env?.DEV) {
        console.warn(`[OmniPad-Core] MouseButton ${this.uid} target not found: ${targetId}`);
      }
    }
  }

  // --- IResettable Implementation ---

  public reset(): void {
    if (this.state.isPressed) {
      this.sendInputSignal(ACTION_TYPES.MOUSEUP);
    }
    this.setState(INITIAL_STATE);
  }
}
