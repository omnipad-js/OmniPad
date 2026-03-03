import { Registry } from '../registry';
import { ActionMapping } from '../types/keys';
import { ACTION_TYPES, InputActionSignal, Vec2 } from '../types';
import { ICoreEntity, ISignalReceiver } from '../types/traits';

/**
 * 动作发射器
 * 负责将抽象的 ActionMapping 转化为具体的信号，并发送给目标 Stage。
 * 内部维护按下状态，确保安全重置 (Reset)。
 */
export class ActionEmitter {
  private isPressed = false;

  constructor(
    private targetId: string | undefined,
    private action: ActionMapping,
  ) {}

  /**
   * 触发按下 (Mousedown / Keydown)
   */
  public press() {
    if (this.isPressed) return;
    this.isPressed = true;

    if (this.action.type === 'keyboard') {
      this.send(ACTION_TYPES.KEYDOWN, {
        key: this.action.key,
        code: this.action.code,
        keyCode: this.action.keyCode,
      });
    } else if (this.action.type === 'mouse') {
      this.send(ACTION_TYPES.MOUSEDOWN, {
        button: this.action.button,
        point: this.action.fixedPoint,
      });
    }
  }

  /**
   * 触发抬起 (Mouseup+Click / Keyup)
   */
  public release(isNormalRelease: boolean = true) {
    if (!this.isPressed) return;
    this.isPressed = false;

    if (this.action.type === 'keyboard') {
      this.send(ACTION_TYPES.KEYUP, {
        key: this.action.key,
        code: this.action.code,
        keyCode: this.action.keyCode,
      });
    } else if (this.action.type === 'mouse') {
      this.send(ACTION_TYPES.MOUSEUP, {
        button: this.action.button,
        point: this.action.fixedPoint,
      });
      // 正常的鼠标抬起还会伴随一次 click
      if (isNormalRelease) {
        this.send(ACTION_TYPES.CLICK, {
          button: this.action.button,
          point: this.action.fixedPoint,
        });
      }
    }
  }

  /**
   * 触发连续位移 (MouseMove) - 专供摇杆/触摸板调用
   */
  public move(deltaOrPoint: { delta?: Vec2; point?: Vec2 }) {
    if (this.action.type === 'mouse') {
      this.send(ACTION_TYPES.MOUSEMOVE, { ...deltaOrPoint, button: this.action.button });
    }
  }

  /**
   * 重置：用于组件销毁或切屏时的强制状态清理
   */
  public reset() {
    // 强制传 false，不触发 Click
    this.release(false);
  }

  /**
   * [私有] 发送信号到注册表中的目标
   */
  private send(type: string, payload: any) {
    if (!this.targetId) return;
    const target = Registry.getInstance().getEntity<ICoreEntity & ISignalReceiver>(this.targetId);

    if (target && typeof target.handleSignal === 'function') {
      const signal: InputActionSignal = {
        targetStageId: this.targetId,
        type,
        payload,
      };
      target.handleSignal(signal);
    }
  }
}
