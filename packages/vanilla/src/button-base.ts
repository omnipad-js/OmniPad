import { applyLayout, createDiv, replaceChildren } from './dom';
import type { ButtonRenderContext, RenderElement } from './types';
import type { LayoutBox } from '@omnipad/core';

export class ButtonBaseView {
  public readonly el: HTMLElement;

  private readonly baseLayer: HTMLElement;
  private readonly contentLayer: HTMLElement;
  private readonly defaultBase: HTMLElement;
  private readonly defaultLabel: HTMLElement;

  constructor(el: HTMLElement = createDiv()) {
    this.el = el;
    this.el.classList.add('omnipad-button-base', 'omnipad-prevent');
    this.el.tabIndex = -1;

    this.defaultBase = createDiv('omnipad-default-button-base');
    this.defaultLabel = document.createElement('span');
    this.defaultLabel.className = 'omnipad-default-button-label';

    this.baseLayer = createDiv('omnipad-button-visual-layer');
    this.contentLayer = createDiv('omnipad-button-content-layer');
    this.baseLayer.appendChild(this.defaultBase);
    this.contentLayer.appendChild(this.defaultLabel);
    this.el.append(this.baseLayer, this.contentLayer);
  }

  public update(params: {
    layout?: LayoutBox;
    isActive: boolean;
    label?: string;
    renderBase?: RenderElement<ButtonRenderContext>;
    renderContent?: RenderElement<ButtonRenderContext>;
  }): void {
    applyLayout(this.el, params.layout);
    this.defaultBase.classList.toggle('is-active', params.isActive);

    const context = { isActive: params.isActive, label: params.label };
    if (params.renderBase) {
      replaceChildren(this.baseLayer, params.renderBase(context) || null);
    } else if (!this.baseLayer.contains(this.defaultBase)) {
      replaceChildren(this.baseLayer, this.defaultBase);
    }

    if (params.renderContent) {
      replaceChildren(this.contentLayer, params.renderContent(context) || null);
    } else {
      this.defaultLabel.textContent = params.label || '';
      this.defaultLabel.style.display = params.label ? '' : 'none';
      if (!this.contentLayer.contains(this.defaultLabel)) {
        replaceChildren(this.contentLayer, this.defaultLabel);
      }
    }
  }
}
