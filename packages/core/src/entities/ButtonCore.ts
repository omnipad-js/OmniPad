import { ButtonConfig } from '../types/configs';
import { ButtonState } from '../types/state';
import { IPointerHandler } from '../types/traits';
import { BaseEntity } from './BaseEntity';
import { ActionEmitter } from '../utils/action';
import { CMP_TYPES } from '../types';
import * as DOM from '../utils/dom';

const INITIAL_STATE: ButtonState = {
  isActive: false,
  isPressed: false,
  pointerId: null,
  value: 0,
};

/**
 * Core logic implementation for a button widget.
 * Handles pointer interactions and translates them into keyboard signals for a target stage.
 */
export class ButtonCore extends BaseEntity<ButtonConfig, ButtonState> implements IPointerHandler {
  // 组合一个动作发射器来模拟按钮行为 / compose an ActionEmitter for button simulation
  private emitter: ActionEmitter;

  /**
   * Creates an instance of KeyboardButtonCore.
   *
   * @param uid - The unique entity ID.
   * @param config - The flat configuration object for the button.
   */
  constructor(uid: string, config: ButtonConfig) {
    super(uid, CMP_TYPES.BUTTON, config, INITIAL_STATE);
    // 初始化发射器 / initialize the emitter
    this.emitter = new ActionEmitter(config.targetStageId, config.action);
  }

  // --- IPointerHandler Implementation ---

  public onPointerDown(e: PointerEvent): void {
    // 阻止默认行为以防止焦点丢失和浏览器手势干扰 / Prevent default behavior to avoid focus loss and browser gestures
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    DOM.safeSetCapture(e.target, e.pointerId);

    // 更新内部交互状态 / Update internal interaction state
    this.setState({ isActive: true, isPressed: true, pointerId: e.pointerId });

    // 调用发射器来发送按键按下信号 / Send keydown signal by emitter
    this.emitter.press();
  }

  public onPointerUp(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    this.handleRelease(e, true);
  }

  public onPointerCancel(e: PointerEvent): void {
    // 处理系统级打断（如来电或浏览器手势拦截） / Handle system interruptions like calls or browser gestures
    this.handleRelease(e, false);
  }

  public onPointerMove(e: PointerEvent): void {
    // 按钮通常不处理位移，仅阻止默认滚动 / Buttons usually don't process movement, just prevent default scrolling
    if (e.cancelable) e.preventDefault();
  }

  // --- Internal Logic ---

  // Common logic for releasing the button state.
  private handleRelease(e: PointerEvent, isNormalRelease: boolean) {
    // 验证 pointerId 匹配，防止多指操作冲突 / Validate pointerId to prevent multi-touch conflicts
    if (this.state.pointerId !== e.pointerId) return;

    DOM.safeReleaseCapture(e.target, e.pointerId);

    // 重置为初始状态 / Reset to initial state
    this.setState(INITIAL_STATE);

    // 调用发射器发送按键抬起信号 / Send keyup signal by emitter
    this.emitter.release(isNormalRelease);
  }

  public reset(): void {
    // 重置所有内部交互状态 / Reset all internal interaction states
    this.setState(INITIAL_STATE);

    // 重置发射器内部状态 / Reset internal state of emitter
    this.emitter.reset();
  }
}
