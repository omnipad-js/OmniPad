import { Registry } from '../registry';
import { ActionMapping, ACTION_TYPES } from '../types';
import { ICoreEntity, ISignalReceiver } from '../types/traits';
import { KEYS } from '../types/keys';

/**
 * Action Emitter Utility.
 *
 * Responsible for translating abstract action definitions into concrete signals.
 * Now supports configuration hot-reloading and automatic mapping hydration.
 */
export class ActionEmitter {
  private isPressed = false;
  private mapping?: ActionMapping;
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
    this.mapping = this.hydrate(mapping);
  }

  /**
   * Hydrates partial mapping data into a full ActionMapping.
   * Handles mouse defaults and keyboard auto-completion via STANDARD_KEYS.
   */
  private hydrate(action?: ActionMapping): ActionMapping | undefined {
    if (!action) return undefined;

    // 浅拷贝一份，避免修改原始配置对象 / Shallow copy to avoid mutating source config
    const hydrated = { ...action };

    // --- 鼠标映射补全 (Mouse Hydration) ---
    if (hydrated.type === 'mouse') {
      hydrated.button = hydrated.button ?? 0;
      return hydrated;
    }

    // --- 键盘映射补全 (Keyboard Hydration) ---
    // 逻辑：如果未显式声明为鼠标，且具备键盘特征，则尝试通过码表补全
    const { key, code, keyCode } = hydrated;
    if (key || code || keyCode) {
      hydrated.type = 'keyboard';

      // 在标准库中寻找匹配项 / Find matching entry in KEYS
      const standard = Object.values(KEYS).find(
        (s) => s.code === code || s.key === key || s.keyCode === keyCode,
      );

      if (standard) {
        hydrated.key = key ?? standard.key;
        hydrated.code = code ?? standard.code;
        hydrated.keyCode = keyCode ?? standard.keyCode;
      }
    }

    return hydrated;
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
   * Internal signal dispatcher.
   */
  private emitSignal(signalType: string, extraPayload: any = {}): void {
    if (!this.targetId || !this.mapping) return;

    const target = Registry.getInstance().getEntity<ICoreEntity & ISignalReceiver>(this.targetId);
    if (!target) return;

    target.handleSignal({
      targetStageId: this.targetId,
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
