import { BaseEntity } from './BaseEntity';
import { IPointerHandler } from '../types/traits';
import { InputZoneConfig } from '../types/configs';
import { InputZoneState } from '../types/state';
import { Vec2, CMP_TYPES } from '../types';
import { pxToPercent } from '../utils/math';

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
  implements IPointerHandler
{
  constructor(uid: string, config: InputZoneConfig) {
    super(uid, CMP_TYPES.INPUT_ZONE, config, INITIAL_STATE);
  }

  public onPointerDown(e: PointerEvent): void {
    // 1. 如果已经有一个在运行了，则不处理 / Ignore if a dynamic widget is already active
    if (this.state.isDynamicActive) return;

    // 2. 关键判断：是否点在空白处？ / Logic: verify if the background was hit instead of a child widget
    // 逻辑：如果 e.target === e.currentTarget，说明没点中子控件（Button），点在背景上了
    if (e.target !== e.currentTarget) return;

    if (e.cancelable) e.preventDefault();

    e.stopPropagation();

    // 3. 计算相对于本分区的百分比坐标 / Calculate percentage coordinates relative to this zone
    const pos = this.calculateRelativePosition(e.clientX, e.clientY);

    // 4. 锁定该指针到本分区（直到抬起） / Lock the pointer to this zone until released
    // 此处通常由适配层执行 setPointerCapture 以确保事件流连贯
    // (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // 5. 激活动态控件状态 / Activate the dynamic widget state
    this.setState({
      isDynamicActive: true,
      dynamicPointerId: e.pointerId,
      dynamicPosition: pos,
    });
  }

  public onPointerMove(e: PointerEvent): void {
    // 仅处理属于当前动态控件的指针移动 / Only handle move events for the current active pointer
    if (!this.state.isDynamicActive || e.pointerId !== this.state.dynamicPointerId) return;

    // 这里 InputZone 只需要保持 Capture 即可，具体逻辑由动态组件处理
    // InputZone only maintains the capture; specific logic is handled by the dynamic widget
  }

  public onPointerUp(e: PointerEvent): void {
    if (e.cancelable) e.preventDefault();
    this.handleRelease(e);
  }

  public onPointerCancel(e: PointerEvent): void {
    this.handleRelease(e);
  }

  /**
   * Internal helper to handle pointer release and cleanup.
   */
  private handleRelease(e: PointerEvent) {
    if (e.pointerId === this.state.dynamicPointerId) {
      // 释放指针捕获 / Release pointer capture
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore errors if capture was already lost
      }

      // 重置动态控件状态 / Reset dynamic widget state
      this.setState({
        isDynamicActive: false,
        dynamicPointerId: null,
      });
    }
  }

  // --- Helper Calculations ---

  /**
   * Converts viewport pixels to percentage coordinates relative to the zone.
   */
  private calculateRelativePosition(clientX: number, clientY: number): Vec2 {
    const rect = this.getRect();
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
