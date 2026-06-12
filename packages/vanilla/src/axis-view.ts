import { projectVectorToBox, supportsContainerQueries } from '@omnipad/web';
import { createDiv, pxSizeFromRect, replaceChildren, setCssVars } from './dom';
import type { DPadState, JoystickState, Vec2 } from '@omnipad/core';
import type { AxisRenderContext, RenderElement } from './types';

export class AxisView<TState extends DPadState | JoystickState> {
  public readonly bg: HTMLElement;
  public readonly stickContainer: HTMLElement;
  public readonly contentLayer: HTMLElement;

  private readonly defaultStick: HTMLElement;
  private readonly useNativeContainerQueries = supportsContainerQueries();

  constructor(private readonly el: HTMLElement) {
    this.el.classList.add('omnipad-axis-base', 'omnipad-prevent');
    this.el.tabIndex = -1;

    this.bg = createDiv('omnipad-axis-bg');
    this.stickContainer = createDiv('omnipad-axis-stick-container');
    this.contentLayer = createDiv('omnipad-axis-content-layer');
    this.defaultStick = createDiv('omnipad-default-axis-stick');
    this.stickContainer.appendChild(this.defaultStick);
    this.el.append(this.bg, this.stickContainer, this.contentLayer);
  }

  public update(params: {
    state: TState | undefined;
    showStick: boolean;
    baseSize: Vec2;
    renderStick?: RenderElement<AxisRenderContext<TState>>;
    renderContent?: RenderElement<AxisRenderContext<TState>>;
  }): void {
    const vector = params.state?.vector || { x: 0, y: 0 };
    const isActive = !!params.state?.isActive;
    this.el.classList.toggle('is-active', isActive);
    this.defaultStick.classList.toggle('is-active', isActive);
    this.stickContainer.style.display = params.showStick ? '' : 'none';

    const box = projectVectorToBox(vector, params.baseSize, this.useNativeContainerQueries);
    setCssVars(this.stickContainer, {
      '--omnipad-axis-stick-container-x': box.x,
      '--omnipad-axis-stick-container-y': box.y,
      '--omnipad-axis-stick-width': box.width,
      '--omnipad-axis-stick-height': box.height,
    });
    this.stickContainer.style.transition = isActive ? 'none' : 'transform 0.1s ease-out';

    if (!params.state) return;
    const context = { isActive, vector, state: params.state };
    if (params.renderStick) {
      replaceChildren(this.stickContainer, params.renderStick(context) || null);
    } else if (!this.stickContainer.contains(this.defaultStick)) {
      replaceChildren(this.stickContainer, this.defaultStick);
    }

    if (params.renderContent) {
      replaceChildren(this.contentLayer, params.renderContent(context) || null);
    }
  }

  public getBaseSize(rect: { width: number; height: number } | null | undefined): Vec2 {
    return this.useNativeContainerQueries ? { x: 0, y: 0 } : pxSizeFromRect(rect);
  }
}
