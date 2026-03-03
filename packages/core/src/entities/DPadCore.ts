import { BaseEntity } from './BaseEntity';
import { ICoreEntity, IPointerHandler, ISignalReceiver } from '../types/traits';
import { DPadConfig } from '../types/configs';
import { DPadState } from '../types/state';
import { ACTION_TYPES, CMP_TYPES } from '../types';
import { Registry } from '../registry';
import { createRafThrottler } from '../utils/performance';
import { clamp } from '../utils';

type Direction = 'up' | 'down' | 'left' | 'right';

const INITIAL_STATE: DPadState = {
  isActive: false,
  pointerId: null,
  vector: { x: 0, y: 0 },
};

export class DPadCore extends BaseEntity<DPadConfig, DPadState> implements IPointerHandler {
  // 记录当前处于激活状态的方向，用于 Diff 对比 / Tracks active directions for diffing
  private activeDirs = new Set<Direction>();

  // 节流优化的指针移动处理 / Throttled pointer move handler
  private throttledMove: (e: PointerEvent) => void;

  constructor(uid: string, config: DPadConfig) {
    super(uid, CMP_TYPES.D_PAD, config, INITIAL_STATE);

    this.throttledMove = createRafThrottler<PointerEvent>((e) => {
      this.processPointerMove(e.clientX, e.clientY);
    });
  }

  // --- IPointerHandler Implementation ---

  public onPointerDown(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    (e.target as Element).setPointerCapture(e.pointerId);

    this.setState({ isActive: true, pointerId: e.pointerId });
    this.processPointerMove(e.clientX, e.clientY);
  }

  public onPointerMove(e: PointerEvent): void {
    if (this.state.pointerId !== e.pointerId) return;
    if (e.cancelable) e.preventDefault();

    this.throttledMove(e);
  }

  public onPointerUp(e: PointerEvent): void {
    this.handleRelease(e);
  }

  public onPointerCancel(e: PointerEvent): void {
    this.handleRelease(e);
  }

  // --- Core Logic ---

  /**
   * 处理物理坐标输入，转化为轴向逻辑状态
   * Process physical coordinates into axial logic states
   */
  private processPointerMove(clientX: number, clientY: number) {
    const rect = this.getRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radiusX = rect.width / 2;
    const radiusY = rect.height / 2;

    // 1. 计算归一化坐标 (-1.0 to 1.0) / Calculate normalized coordinates
    let normX = clamp((clientX - centerX) / radiusX, -1, 1);
    let normY = clamp((clientY - centerY) / radiusY, -1, 1);

    // UI 显示限制：确保摇杆头不会飞出圆形底座边界 (这部分三角函数仅服务于 UI，不影响按键逻辑)
    const dist = Math.hypot(normX, normY);
    if (dist > 1) {
      normX /= dist;
      normY /= dist;
    }

    // 2. 轴向死区判断 (纯布尔逻辑，性能极高) / Axial deadzone checks
    const threshold = this.config.threshold ?? 0.2;

    const isUp = normY < -threshold;
    const isDown = normY > threshold;
    const isLeft = normX < -threshold;
    const isRight = normX > threshold;

    // 3. 更新按键状态并触发信号 / Update keys and trigger signals
    this.updateDirection('up', isUp);
    this.updateDirection('down', isDown);
    this.updateDirection('left', isLeft);
    this.updateDirection('right', isRight);

    // 4. 同步 UI 状态 / Sync UI state
    this.setState({ vector: { x: normX, y: normY } });
  }

  /**
   * 状态 Diff 发射器
   * 只有当某方向的布尔值发生翻转时，才发送 Keydown/Keyup
   */
  private updateDirection(dir: Direction, isPressed: boolean) {
    const wasPressed = this.activeDirs.has(dir);

    if (isPressed && !wasPressed) {
      this.activeDirs.add(dir);
      this.sendSignal(ACTION_TYPES.KEYDOWN, dir);
    } else if (!isPressed && wasPressed) {
      this.activeDirs.delete(dir);
      this.sendSignal(ACTION_TYPES.KEYUP, dir);
    }
  }

  private handleRelease(e: PointerEvent) {
    if (this.state.pointerId !== e.pointerId) return;

    try {
      if ((e.target as Element).hasPointerCapture(e.pointerId)) {
        (e.target as Element).releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      /* Ignore common pointer release errors */
    }

    this.reset();
  }

  public reset(): void {
    // 释放所有依然处于激活状态的按键 / Release all active keys
    this.activeDirs.forEach((dir) => {
      this.sendSignal(ACTION_TYPES.KEYUP, dir);
    });
    this.activeDirs.clear();

    this.setState(INITIAL_STATE);
  }

  private sendSignal(type: string, dir: Direction) {
    if (!this.config.mapping[dir]) return;

    const targetId = this.config.targetStageId;
    if (!targetId) return;

    const target = Registry.getInstance().getEntity<ICoreEntity & ISignalReceiver>(targetId);
    if (target && target.handleSignal) {
      target.handleSignal({
        targetStageId: targetId,
        type: type,
        payload: {
          key: this.config.mapping[dir].key,
          code: this.config.mapping[dir].code,
          keyCode: this.config.mapping[dir].keyCode,
        },
      });
    }
  }
}
