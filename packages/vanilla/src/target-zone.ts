import { TargetZoneCore, type CursorState, type TargetZoneConfig } from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { projectPercentToBox, supportsContainerQueries } from '@omnipad/web';
import { createDiv, replaceChildren, setCssVars } from './dom';
import { VanillaCoreWidget } from './base';
import type { TargetRenderContext, TargetZoneRenderOptions, VanillaWidgetOptions } from './types';

export type TargetZoneOptions = VanillaWidgetOptions<TargetZoneConfig> & TargetZoneRenderOptions;

export class TargetZone extends VanillaCoreWidget<
  TargetZoneCore,
  CursorState,
  TargetZoneConfig,
  TargetZoneOptions
> {
  private readonly focusLayer: HTMLElement;
  private readonly cursorLayer: HTMLElement;
  private readonly cursorFollowLayer: HTMLElement;
  private readonly contentLayer: HTMLElement;
  private readonly defaultFocus: HTMLElement;
  private readonly defaultCursor: HTMLElement;
  private readonly useNativeContainerQueries = supportsContainerQueries();

  constructor(container: HTMLElement, options: TargetZoneOptions = {}) {
    super({
      container,
      requiredType: OmniPad.Types.TARGET_ZONE,
      options,
      defaultProps: { cursorAutoDelay: 2500 },
      baseClasses: ['omnipad-target-zone'],
      markAsParent: true,
      createCore: (uid, config, customType) => new TargetZoneCore(uid, config, customType),
    });

    this.focusLayer = createDiv('omnipad-target-focus-layer');
    this.cursorLayer = createDiv('omnipad-virtual-cursor');
    this.cursorFollowLayer = createDiv('omnipad-virtual-cursor');
    this.contentLayer = createDiv('omnipad-target-content-layer');
    this.defaultFocus = createDiv('omnipad-default-focus-border-feedback');
    this.defaultCursor = createDiv('omnipad-default-cursor-dot');
    this.cursorLayer.appendChild(this.defaultCursor);
    this.el.append(this.focusLayer, this.cursorLayer, this.cursorFollowLayer, this.contentLayer);
    this.attachPointerBridge();
    this.mount(container);
  }

  protected override renderConfig(config: TargetZoneConfig): void {
    super.renderConfig(config);
    this.renderTarget();
  }

  protected override renderState(state: CursorState): void {
    this.state = state;
    this.renderTarget();
  }

  private renderTarget(): void {
    if (!this.state) return;
    const context = this.createContext(this.state);
    const cursorEnabled = !!this.config.cursorEnabled;
    this.cursorLayer.style.display = cursorEnabled ? '' : 'none';
    this.cursorFollowLayer.style.display = cursorEnabled ? '' : 'none';

    const projected = projectPercentToBox(
      this.state.position,
      () => ({ x: this.core.rect?.width || 0, y: this.core.rect?.height || 0 }),
      this.useNativeContainerQueries,
    );

    for (const layer of [this.cursorLayer, this.cursorFollowLayer]) {
      setCssVars(layer, {
        '--omnipad-virtual-cursor-x': projected.x,
        '--omnipad-virtual-cursor-y': projected.y,
      });
      layer.style.opacity = this.state.isVisible ? '1' : '0';
    }

    this.defaultCursor.classList.toggle('is-down', this.state.isPointerDown);
    if (this.options.renderCursor) {
      replaceChildren(this.cursorLayer, this.options.renderCursor(context) || null);
    } else if (!this.cursorLayer.contains(this.defaultCursor)) {
      replaceChildren(this.cursorLayer, this.defaultCursor);
    }

    if (this.options.renderWithCursor) {
      replaceChildren(this.cursorFollowLayer, this.options.renderWithCursor(context) || null);
    }

    if (this.options.renderFocusFeedback) {
      replaceChildren(
        this.focusLayer,
        this.state.isFocusReturning ? this.options.renderFocusFeedback(context) || null : null,
      );
    } else {
      replaceChildren(this.focusLayer, this.state.isFocusReturning ? this.defaultFocus : null);
    }

    if (this.options.renderContent) {
      replaceChildren(this.contentLayer, this.options.renderContent(context) || null);
    }
  }

  private createContext(state: CursorState): TargetRenderContext {
    return {
      state,
      isDown: state.isPointerDown,
      isReturning: state.isFocusReturning,
      cursorPos: state.position,
    };
  }
}
