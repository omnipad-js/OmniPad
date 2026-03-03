import { ButtonConfig } from '../types/configs';
import { ButtonState } from '../types/state';
import { IPointerHandler } from '../types/traits';
import { BaseEntity } from './BaseEntity';
import { ActionEmitter } from '../utils/action';
import { CMP_TYPES } from '../types';

const INITIAL_STATE: ButtonState = {
  isActive: false,
  isPressed: false,
  pointerId: null,
  value: 0,
};

export class ButtonCore extends BaseEntity<ButtonConfig, ButtonState> implements IPointerHandler {
  // 组合一个动作发射器
  private emitter: ActionEmitter;

  constructor(uid: string, config: ButtonConfig) {
    super(uid, CMP_TYPES.BUTTON, config, INITIAL_STATE);
    // 初始化发射器
    this.emitter = new ActionEmitter(config.targetStageId, config.action);
  }

  public onPointerDown(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    (e.target as Element).setPointerCapture(e.pointerId);

    this.setState({ isActive: true, isPressed: true, pointerId: e.pointerId });

    // 调用发射器
    this.emitter.press();
  }

  public onPointerUp(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    this.handleRelease(e, true);
  }

  public onPointerCancel(e: PointerEvent): void {
    this.handleRelease(e, false);
  }

  public onPointerMove(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
  }

  private handleRelease(e: PointerEvent, isNormalRelease: boolean) {
    if (this.state.pointerId !== e.pointerId) return;

    if ((e.target as Element).hasPointerCapture(e.pointerId)) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {
        //
      }
    }

    this.setState(INITIAL_STATE);

    // 调用发射器释放
    this.emitter.release(isNormalRelease);
  }

  public reset(): void {
    this.setState(INITIAL_STATE);
    // 一键善后
    this.emitter.reset();
  }
}
