import type { ConfigTreeNode } from '@omnipad/core';
import { createDiv } from './dom';
import { createWidgetFromNode } from './component-registry';
import type { VanillaLayerOptions, VanillaWidgetInstance } from './types';

export class VirtualLayerBase implements VanillaWidgetInstance {
  public readonly uid = 'virtual-layer';
  public readonly el: HTMLElement;

  private readonly children: VanillaWidgetInstance[] = [];
  private readonly append: boolean;

  constructor(container: HTMLElement, options: VanillaLayerOptions = {}) {
    this.append = options.append !== false;
    this.el = createDiv(['omnipad-virtual-layer-base', 'omnipad-prevent']);

    this.renderNodes(options.nodes || []);
    options.renderContent?.(this.el);

    if (this.append) {
      container.appendChild(this.el);
    }
  }

  public updateNodes(nodes: ConfigTreeNode[]): void {
    for (const child of this.children.splice(0)) child.destroy();
    this.el.replaceChildren();
    this.renderNodes(nodes);
  }

  public destroy(): void {
    for (const child of this.children.splice(0)) child.destroy();
    this.el.remove();
  }

  private renderNodes(nodes: ConfigTreeNode[]): void {
    for (const node of nodes) {
      this.children.push(createWidgetFromNode(this.el, node));
    }
  }
}
