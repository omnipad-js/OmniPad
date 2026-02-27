import { Registry } from '../registry';
import { ACTION_TYPES, InputActionSignal, CMP_TYPES } from '../types';
import { KeyboardButtonConfig } from '../types/configs';
import { KeyboardButtonState } from '../types/state';
import { ICoreEntity, IPointerHandler, ISignalReceiver } from '../types/traits';
import { BaseEntity } from './BaseEntity';

/**
 * Initial state for the keyboard button.
 */
const INITIAL_STATE: KeyboardButtonState = {
  isActive: false,
  isPressed: false,
  pointerId: null,
  value: 0,
};

/**
 * Core logic implementation for a keyboard button widget.
 * Handles pointer interactions and translates them into keyboard signals for a target stage.
 */
export class KeyboardButtonCore
  extends BaseEntity<KeyboardButtonConfig, KeyboardButtonState>
  implements IPointerHandler
{
  /**
   * Creates an instance of KeyboardButtonCore.
   *
   * @param uid - The unique entity ID.
   * @param config - The flat configuration object for the button.
   */
  constructor(uid: string, config: KeyboardButtonConfig) {
    super(uid, CMP_TYPES.KEYBOARD_BUTTON, config, INITIAL_STATE);
  }

  // --- IPointerHandler Implementation ---

  public onPointerDown(e: PointerEvent): void {
    // 阻止默认行为以防止焦点丢失和浏览器手势干扰 / Prevent default behavior to avoid focus loss and browser gestures
    if (e.cancelable) e.preventDefault();

    e.stopPropagation();

    // 锁定指针捕获，确保手指移出按钮范围时事件依然能被触发 / Set pointer capture to ensure events trigger even if the finger moves outside
    (e.target as Element).setPointerCapture(e.pointerId);

    // 更新内部交互状态 / Update internal interaction state
    this.setState({
      isActive: true,
      isPressed: true,
      pointerId: e.pointerId,
    });

    // 发送按键按下信号 / Send keydown signal
    this.sendInputSignal(ACTION_TYPES.KEYDOWN);
  }

  public onPointerUp(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    this.handleRelease(e);
  }

  public onPointerCancel(e: PointerEvent): void {
    // 处理系统级打断（如来电或浏览器手势拦截） / Handle system interruptions like calls or browser gestures
    this.handleRelease(e);
  }

  public onPointerMove(e: PointerEvent): void {
    // 按钮通常不处理位移，仅阻止默认滚动 / Buttons usually don't process movement, just prevent default scrolling
    if (e.cancelable) e.preventDefault();
  }

  // --- Internal Logic ---

  /**
   * Common logic for releasing the button state.
   *
   * @param e - The pointer event that triggered the release.
   */
  private handleRelease(e: PointerEvent) {
    // 验证 pointerId 匹配，防止多指操作冲突 / Validate pointerId to prevent multi-touch conflicts
    if (this.state.pointerId !== e.pointerId) return;

    // 显式释放指针捕获 / Explicitly release pointer capture
    if ((e.target as Element).hasPointerCapture(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }

    // 重置为初始状态 / Reset to initial state
    this.setState(INITIAL_STATE);

    // 发送按键抬起信号 / Send keyup signal
    this.sendInputSignal(ACTION_TYPES.KEYUP);
  }

  /**
   * Dispatches input signals to the registered target stage.
   *
   * @param type - The action type (keydown or keyup).
   */
  private sendInputSignal(type: string) {
    const targetId = this.config.targetStageId;
    if (!targetId) return;

    // 从全局注册表查找目标舞台实例 / Look up the target stage instance from the global registry
    const target = Registry.getInstance().getEntity<ICoreEntity & ISignalReceiver>(targetId);

    if (target && typeof target.handleSignal === 'function') {
      // 构造并发送信号载荷 / Construct and emit the signal payload
      const signal: InputActionSignal = {
        targetStageId: targetId,
        type: type,
        payload: {
          key: this.config.mapping.key,
          code: this.config.mapping.code,
          keyCode: this.config.mapping.keyCode,
        },
      };

      target.handleSignal(signal);
    } else {
      // 在开发环境下对缺失的目标抛出警告 / Log warning in dev environment if target is missing
      if (import.meta.env?.DEV) {
        console.warn(`[OmniPad-Core] KeyboardButton ${this.uid} target not found: ${targetId}`);
      }
    }
  }

  // --- IResettable Implementation ---

  public reset(): void {
    // 如果当前处于按下状态，必须补发抬起信号防止按键粘连 / If pressed, emit keyup to prevent "stuck" keys
    if (this.state.isPressed) {
      this.sendInputSignal(ACTION_TYPES.KEYUP);
    }

    // 重置所有内部交互状态 / Reset all internal interaction states
    this.setState(INITIAL_STATE);
  }
}
