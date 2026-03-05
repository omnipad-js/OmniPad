import { BaseEntity } from './BaseEntity';
import { IDependencyBindable, IPointerHandler } from '../types/traits';
import { InputZoneConfig } from '../types/configs';
import { InputZoneState } from '../types/state';
import { Vec2, CMP_TYPES, AnyFunction, AbstractPointerEvent } from '../types';
import { pxToPercent } from '../utils/math';

interface InputZoneDelegates {
  dynamicWidgetPointerDown: (e: AbstractPointerEvent) => void;
  dynamicWidgetPointerMove: (e: AbstractPointerEvent) => void;
  dynamicWidgetPointerUp: (e: AbstractPointerEvent) => void;
  dynamicWidgetPointerCancel: (e: AbstractPointerEvent) => void;
}

const INITIAL_STATE: InputZoneState = {
  isDynamicActive: false,
  dynamicPointerId: null,
  dynamicPosition: { x: 0, y: 0 },
};

/**
 * Logic core for InputZone.
 *
 * Manages a container for input widgets and handles the lifecycle of
 * dynamic (floating) widgets when interacting with empty space.
 */
export class InputZoneCore
  extends BaseEntity<InputZoneConfig, InputZoneState>
  implements IPointerHandler, IDependencyBindable
{
  private delegates: InputZoneDelegates = {
    dynamicWidgetPointerDown: () => {},
    dynamicWidgetPointerMove: () => {},
    dynamicWidgetPointerUp: () => {},
    dynamicWidgetPointerCancel: () => {},
  };

  constructor(uid: string, config: InputZoneConfig) {
    super(uid, CMP_TYPES.INPUT_ZONE, config, INITIAL_STATE);
  }

  // --- IDependencyBindable Implementation ---

  public bindDelegate(key: string, delegate: AnyFunction): void {
    if (Object.prototype.hasOwnProperty.call(this.delegates, key)) {
      (this.delegates as any)[key] = delegate;
    } else if (import.meta.env?.DEV) {
      console.warn(`[Omnipad-Core] TargetZone attempted to bind unknown delegate: ${key}`);
    }
  }

  // --- IPointerHandler Implementation ---

  public get activePointerId(): number | null {
    return this.state.dynamicPointerId;
  }

  public onPointerDown(e: AbstractPointerEvent): void {
    // 如果已经有一个在运行了，则不处理 / Ignore if a dynamic widget is already active
    if (this.state.isDynamicActive) return;

    // 计算相对于本分区的百分比坐标 / Calculate percentage coordinates relative to this zone
    const pos = this.calculateRelativePosition(e.clientX, e.clientY);

    // 激活动态控件状态 / Activate the dynamic widget state
    this.setState({
      isDynamicActive: true,
      dynamicPointerId: e.pointerId,
      dynamicPosition: pos,
    });

    // 更新状态后运行动态控件按下事件 / Run the dynamic control pointerdown event after updating the state
    this.delegates.dynamicWidgetPointerDown(e);
  }

  public onPointerMove(e: AbstractPointerEvent): void {
    // 仅处理属于当前动态控件的指针移动 / Only handle move events for the current active pointer
    if (!this.state.isDynamicActive) return;

    // 运行动态控件移动事件 / Run the dynamic control pointermove event
    this.delegates.dynamicWidgetPointerMove(e);
  }

  public onPointerUp(e: AbstractPointerEvent): void {
    // 在释放之前先运行动态控件抬起事件 / Run the dynamic control pointerup event
    this.delegates.dynamicWidgetPointerUp(e);

    this.reset();
  }

  public onPointerCancel(e: AbstractPointerEvent): void {
    this.delegates.dynamicWidgetPointerCancel(e);

    this.reset();
  }

  // --- Helper Calculations ---

  /**
   * Converts viewport pixels to percentage coordinates relative to the zone.
   */
  private calculateRelativePosition(clientX: number, clientY: number): Vec2 {
    const rect = this.rect;
    if (!rect) return { x: 0, y: 0 };

    return {
      x: pxToPercent(clientX - rect.left, rect.width),
      y: pxToPercent(clientY - rect.top, rect.height),
    };
  }

  /**
   * Whether the interceptor layer should be enabled.
   */
  public get isInterceptorRequired(): boolean {
    // 只要开启了动态控件，或者开启了焦点保护，就需要拦截层
    // As long as dynamic widget is enabled OR focus protection is on, we need the layer
    return !!(this.config.dynamicWidgetId || this.config.preventFocusLoss);
  }

  public reset(): void {
    // 强制清理动态控件状态 / Force clear dynamic widget state
    this.setState({
      isDynamicActive: false,
      dynamicPointerId: null,
    });
  }
}
