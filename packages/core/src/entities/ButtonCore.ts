import { ButtonConfig } from '../types/configs';
import { ButtonState } from '../types/state';
import { IPointerHandler } from '../types/traits';
import { BaseEntity } from './BaseEntity';
import { ActionEmitter } from '../utils/action';
import { AbstractPointerEvent, CMP_TYPES } from '../types';

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
    this.emitter = new ActionEmitter(config.targetStageId, config.mapping);
  }

  // --- IPointerHandler Implementation ---

  public get activePointerId(): number | null {
    return this.state.pointerId;
  }

  public onPointerDown(e: AbstractPointerEvent): void {
    // 更新内部交互状态 / Update internal interaction state
    this.setState({ isActive: true, isPressed: true, pointerId: e.pointerId });

    // 调用发射器来发送按键按下信号 / Send keydown signal by emitter
    this.emitter.press();
  }

  public onPointerUp(): void {
    this.handleRelease(true);
  }

  public onPointerCancel(): void {
    // 处理系统级打断（如来电或浏览器手势拦截） / Handle system interruptions like calls or browser gestures
    this.handleRelease(false);
  }

  public onPointerMove(): void {}

  // --- IResettable Implementation ---

  public reset(): void {
    // 重置所有内部交互状态 / Reset all internal interaction states
    this.setState(INITIAL_STATE);

    // 重置发射器内部状态 / Reset internal state of emitter
    this.emitter.reset();
  }

  // --- IConfigurable Implementation ---

  public override updateConfig(newConfig: Partial<ButtonConfig>): void {
    super.updateConfig(newConfig);

    // 同步更新发射器配置 / sync update configuration of emitter
    this.emitter.update(this.config.targetStageId, this.config.mapping);
  }

  // --- Internal Logic ---

  /**
   * Clean up pointer capture and reset interaction state.
   */
  private handleRelease(isNormalRelease: boolean) {
    // 重置为初始状态 / Reset to initial state
    this.setState(INITIAL_STATE);

    // 调用发射器发送按键抬起信号 / Send keyup signal by emitter
    this.emitter.release(isNormalRelease);
  }
}
