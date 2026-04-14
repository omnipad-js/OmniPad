import { Registry } from '../singletons/Registry';
import { ActionMapping, ACTION_TYPES } from '../types';
import { KeyMapping, KEYS } from '../types/keys';
import { delayFrames } from './performance';

const MAX_STR_LEN = 32; // 键名通常不会超过这个长度
const MAX_KEY_CODE = 255; // 标准键盘码范围

/**
 * Action Emitter Utility.
 *
 * Responsible for translating abstract action definitions into concrete signals.
 * Now supports configuration hot-reloading and automatic mapping hydration.
 */
export class ActionEmitter {
  private isPressed = false;
  private mapping?: KeyMapping;
  private targetId?: string;

  constructor(targetId?: string, action?: ActionMapping) {
    this.update(targetId, action);
  }

  /**
   * Reloads the emitter with new configuration.
   * Ensures active signals are cut off before switching configurations.
   *
   * @param targetId - New target stage ID.
   * @param mapping - New action mapping definition.
   */
  public update(targetId?: string, mapping?: ActionMapping): void {
    // 1. 如果当前正处于按下状态，在重载前必须先安全释放旧动作
    // If currently pressed, release the old action safely before reloading
    if (this.isPressed) {
      this.reset();
    }

    this.targetId = targetId;
    this.mapping =
      typeof mapping === 'string'
        ? (KEYS[mapping as keyof typeof KEYS] ?? undefined)
        : this.hydrate(mapping);
  }

  /**
   * Hydrates partial mapping data into a full KeyMapping.
   * Handles mouse defaults and keyboard auto-completion via STANDARD_KEYS.
   */
  private hydrate(action?: KeyMapping): KeyMapping | undefined {
    if (!action || typeof action !== 'object') return undefined;

    // 1. 提取核心字段，丢弃所有杂质 (Whitelist only)
    const { type, key, code, keyCode, button, fixedPoint } = action;

    // --- A. 鼠标映射校验 (Mouse Sanitization) ---
    if (type === 'mouse') {
      return {
        type: 'mouse',
        // 强制约束按钮索引在 0, 1, 2 之间
        button: typeof button === 'number' && button >= 0 && button <= 2 ? button : 0,
        // 坐标校验（如果有）
        fixedPoint:
          fixedPoint && typeof fixedPoint.x === 'number'
            ? { x: Number(fixedPoint.x), y: Number(fixedPoint.y) }
            : undefined,
      };
    }

    // --- B. 键盘映射校验与补全 (Keyboard Sanitization) ---
    // 先进行基本的“脱毒”处理
    const safeKey = typeof key === 'string' ? key.substring(0, MAX_STR_LEN) : undefined;
    const safeCode = typeof code === 'string' ? code.substring(0, MAX_STR_LEN) : undefined;
    const safeKeyCode =
      typeof keyCode === 'number' && Number.isFinite(keyCode)
        ? Math.floor(Math.min(keyCode, MAX_KEY_CODE))
        : undefined;

    // 如果具备键盘特征，则尝试补全
    if (safeKey || safeCode || safeKeyCode) {
      // 寻找匹配项
      const standard = Object.values(KEYS).find((s) => {
        if (s.type !== 'keyboard') return false;
        return s.code === safeCode || s.key === safeKey || s.keyCode === safeKeyCode;
      }) as KeyMapping | undefined;

      if (standard) {
        return {
          type: 'keyboard',
          key: safeKey ?? standard.key,
          code: safeCode ?? standard.code,
          keyCode: safeKeyCode ?? standard.keyCode,
        };
      }

      // 如果没找到标准定义，但输入了有效字段，依然返回脱毒后的版本（允许自定义非标按键）
      return {
        type: 'keyboard',
        key: safeKey || 'unknown',
        code: safeCode || 'Unknown',
        keyCode: safeKeyCode || 0,
      };
    }

    return undefined;
  }

  /**
   * Triggers the 'down' phase of the action.
   */
  public press(): void {
    if (!this.mapping || this.isPressed) return;
    this.isPressed = true;

    const type = this.mapping.type === 'keyboard' ? ACTION_TYPES.KEYDOWN : ACTION_TYPES.MOUSEDOWN;
    this.emitSignal(type);
  }

  /**
   * Triggers the 'up' phase of the action.
   * @param isNormalRelease - If false, 'click' signals for mouse actions are suppressed.
   */
  public release(isNormalRelease: boolean = true): void {
    if (!this.mapping || !this.isPressed) return;
    this.isPressed = false;

    const type = this.mapping.type === 'keyboard' ? ACTION_TYPES.KEYUP : ACTION_TYPES.MOUSEUP;
    this.emitSignal(type);

    if (this.mapping.type === 'mouse' && isNormalRelease) {
      this.emitSignal(ACTION_TYPES.CLICK);
    }
  }

  /**
   * Triggers a continuous movement signal (primarily for mouse).
   */
  public move(payload: {
    delta?: { x: number; y: number };
    point?: { x: number; y: number };
  }): void {
    if (this.mapping?.type === 'mouse') {
      this.emitSignal(ACTION_TYPES.MOUSEMOVE, payload);
    }
  }

  /**
   * Forcefully resets the emitter state and cuts off active signals.
   */
  public reset(): void {
    if (this.isPressed) {
      this.release(false);
    }
  }

  /**
   * Trigger a complete click with physical delay
   */
  public async tap(isNormalRelease: boolean = true) {
    if (this.isPressed) return;

    this.press();

    await delayFrames(2);

    if (this.isPressed) {
      this.release(isNormalRelease);
    }
  }

  /**
   * Internal signal dispatcher.
   */
  private emitSignal(signalType: string, extraPayload: any = {}): void {
    if (!this.mapping) return;

    // 让注册表发送信号至目标
    Registry.getInstance().broadcastSignal({
      targetStageId: this.targetId || '',
      type: signalType,
      payload: {
        // 键盘字段
        key: this.mapping.key,
        code: this.mapping.code,
        keyCode: this.mapping.keyCode,
        // 鼠标字段
        button: this.mapping.button,
        point: this.mapping.fixedPoint,
        // 额外透传 (如 delta)
        ...extraPayload,
      },
    });
  }
}
