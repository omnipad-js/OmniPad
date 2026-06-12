import {
  InputZoneCore,
  filterNotDynamicChildren,
  type ConfigTreeNode,
  type InputZoneConfig,
  type InputZoneState,
} from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { createPointerBridge, projectPercentToBox, supportsContainerQueries } from '@omnipad/web';
import { createDiv, setCssVars } from './dom';
import { VanillaCoreWidget } from './base';
import { VirtualLayerBase } from './virtual-layer';
import { createWidgetFromNode } from './component-registry';
import type {
  DynamicWidgetSource,
  InputZoneRenderOptions,
  VanillaWidgetInstance,
  VanillaWidgetOptions,
} from './types';

export type InputZoneOptions = VanillaWidgetOptions<InputZoneConfig> &
  InputZoneRenderOptions & {
    children?: ConfigTreeNode[];
  };

export class InputZone extends VanillaCoreWidget<
  InputZoneCore,
  InputZoneState,
  InputZoneConfig,
  InputZoneOptions
> {
  private readonly fixedLayer: VirtualLayerBase;
  private readonly trigger: HTMLElement;
  private readonly dynamicMount: HTMLElement;
  private readonly useNativeContainerQueries = supportsContainerQueries();
  private readonly triggerDisposers: Array<() => void> = [];
  private dynamicWidget: VanillaWidgetInstance | null = null;

  constructor(container: HTMLElement, options: InputZoneOptions = {}) {
    super({
      container,
      requiredType: OmniPad.Types.INPUT_ZONE,
      options,
      baseClasses: ['omnipad-input-zone'],
      markAsParent: true,
      createCore: (uid, config, customType) => new InputZoneCore(uid, config, customType),
    });

    const fixedChildren = filterNotDynamicChildren(
      options.children || options.treeNode?.children,
      this.config.dynamicWidgetId || '',
    );

    this.fixedLayer = new VirtualLayerBase(this.el, {
      nodes: fixedChildren,
      renderContent: (layerEl) => options.renderContent?.(layerEl, this),
    });

    this.trigger = createDiv(['omnipad-input-zone-trigger', 'omnipad-prevent']);
    this.dynamicMount = createDiv('dynamic-widget-mount');
    this.trigger.appendChild(this.dynamicMount);
    this.el.appendChild(this.trigger);
    this.attachTriggerBridge();
    this.resolveDynamicWidget(options.dynamicWidget);
    this.mount(container);
  }

  public override destroy(): void {
    for (const dispose of this.triggerDisposers.splice(0)) dispose();
    this.dynamicWidget?.destroy();
    this.fixedLayer.destroy();
    super.destroy();
  }

  protected override renderConfig(config: InputZoneConfig): void {
    super.renderConfig(config);
    this.trigger.style.display =
      this.dynamicWidget || this.core.isInterceptorRequired ? '' : 'none';
  }

  protected override renderState(state: InputZoneState): void {
    if (!state.isDynamicActive) {
      this.dynamicMount.style.visibility = 'hidden';
      this.dynamicMount.style.opacity = '0';
      this.dynamicMount.style.pointerEvents = 'none';
      return;
    }

    const projected = projectPercentToBox(
      state.dynamicPosition,
      () => ({ x: this.core.rect?.width || 0, y: this.core.rect?.height || 0 }),
      this.useNativeContainerQueries,
    );
    setCssVars(this.dynamicMount, {
      '--dynamic-widget-mount-x': projected.x,
      '--dynamic-widget-mount-y': projected.y,
    });
    this.dynamicMount.style.zIndex = '100';
    this.dynamicMount.style.visibility = 'visible';
    this.dynamicMount.style.opacity = '1';
    this.dynamicMount.style.pointerEvents = 'auto';
  }

  private attachTriggerBridge(): void {
    const bridge = createPointerBridge(this.core, { requireDirectHit: true });
    const bind = (type: string, handler: (event: PointerEvent) => void) => {
      const listener = (event: Event) => handler(event as PointerEvent);
      this.trigger.addEventListener(type, listener);
      this.triggerDisposers.push(() => this.trigger.removeEventListener(type, listener));
    };

    bind('pointerdown', bridge.onPointerDown);
    bind('pointermove', bridge.onPointerMove);
    bind('pointerup', bridge.onPointerUp);
    bind('pointercancel', bridge.onPointerCancel);
    bind('lostpointercapture', bridge.onPointerCancel);
  }

  private resolveDynamicWidget(source?: DynamicWidgetSource): void {
    const resolvedSource = source || this.getDynamicNodeFromConfig();
    if (!resolvedSource) return;

    if (typeof resolvedSource === 'function') {
      this.dynamicWidget = resolvedSource(this.dynamicMount) || null;
    } else if ('destroy' in resolvedSource && 'el' in resolvedSource) {
      this.dynamicWidget = resolvedSource;
      this.dynamicMount.appendChild(resolvedSource.el);
    } else {
      this.dynamicWidget = createWidgetFromNode(this.dynamicMount, resolvedSource);
    }

    if (!this.dynamicWidget) return;
    this.updateConfig({ dynamicWidgetId: this.dynamicWidget.uid });
    this.bindDelegates({
      dynamicWidgetPointerDown: (event: PointerEvent) => {
        this.dynamicWidget?.markRectDirty?.();
        this.dynamicWidget?.onPointerDown?.(event);
      },
      dynamicWidgetPointerMove: (event: PointerEvent) => {
        this.dynamicWidget?.onPointerMove?.(event);
      },
      dynamicWidgetPointerUp: (event: PointerEvent) => {
        this.dynamicWidget?.onPointerUp?.(event);
      },
      dynamicWidgetPointerCancel: (event: PointerEvent) => {
        this.dynamicWidget?.onPointerCancel?.(event);
      },
    });
  }

  private getDynamicNodeFromConfig(): ConfigTreeNode | null {
    const dynamicId = this.config.dynamicWidgetId;
    if (!dynamicId) return null;
    return this.options.treeNode?.children?.find((node) => node.uid === dynamicId) || null;
  }
}
