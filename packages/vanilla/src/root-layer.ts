import {
  RootLayerCore,
  type BaseConfig,
  type ConfigTreeNode,
  type LayerState,
} from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { VanillaCoreWidget } from './base';
import { VirtualLayerBase } from './virtual-layer';
import type { VanillaWidgetOptions } from './types';

export type RootLayerOptions = VanillaWidgetOptions<BaseConfig> & {
  children?: ConfigTreeNode[];
  renderContent?: (container: HTMLElement) => void;
};

export class RootLayer extends VanillaCoreWidget<
  RootLayerCore,
  LayerState,
  BaseConfig,
  RootLayerOptions
> {
  private readonly layer: VirtualLayerBase;

  constructor(container: HTMLElement, options: RootLayerOptions = {}) {
    super({
      container,
      requiredType: OmniPad.Types.ROOT_LAYER,
      options,
      baseClasses: ['omnipad-root-layer'],
      markAsParent: true,
      createCore: (uid, config, customType) => new RootLayerCore(uid, config, customType),
    });

    this.layer = new VirtualLayerBase(this.el, {
      nodes: options.children || options.treeNode?.children || [],
      renderContent: options.renderContent,
    });
    this.mount(container);
  }

  public override destroy(): void {
    this.layer.destroy();
    super.destroy();
  }
}
