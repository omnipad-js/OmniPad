import {
  Registry,
  bindEntityDelegates,
  type AnyFunction,
  type BaseConfig,
  type EntityType,
  type IConfigurable,
  type ICoreEntity,
  type IPointerHandler,
  type IResettable,
  type ISpatial,
  type IStateful,
} from '@omnipad/core';
import { distillRect } from '@omnipad/core/utils';
import {
  WindowManager,
  StickyController,
  createPointerBridge,
  createWebStickyProvider,
  flattenToHostLayout,
  setupSpatialLogic,
  type StickyProvider,
} from '@omnipad/web';
import { addClasses, applyLayout, asPointerEventListener, createDiv, replaceClasses } from './dom';
import { resolveWidgetConfig } from './config';
import type { LayoutSyncTarget, VanillaWidgetInstance, VanillaWidgetOptions } from './types';

interface BaseWidgetParams<
  TCore,
  TConfig extends BaseConfig,
  TOptions extends VanillaWidgetOptions<TConfig> = VanillaWidgetOptions<TConfig>,
> {
  container: HTMLElement;
  requiredType: EntityType;
  options?: TOptions;
  defaultProps?: Record<string, unknown>;
  extraSkipProps?: string[];
  baseClasses: string[];
  createCore: (uid: string, config: TConfig, customType?: EntityType) => TCore;
  markAsParent?: boolean;
}

type PointerHandlers = ReturnType<typeof createPointerBridge>;

export abstract class VanillaCoreWidget<
  TCore extends ICoreEntity,
  TState,
  TConfig extends BaseConfig,
  TOptions extends VanillaWidgetOptions<TConfig> = VanillaWidgetOptions<TConfig>,
> implements VanillaWidgetInstance {
  public readonly uid: string;
  public readonly el: HTMLElement;
  public readonly core: TCore;

  protected config: TConfig;
  protected state: TState | undefined;
  protected readonly options: TOptions;

  private readonly append: boolean;
  private readonly disposers: Array<() => void> = [];
  private readonly eventDisposers: Array<() => void> = [];
  private customClasses: string[] = [];
  private spatialCleanup: (() => void) | null = null;
  private layoutInvalidationCleanup: (() => void) | null = null;
  private stickyController: StickyController<Element> | null = null;
  private stickyProvider: StickyProvider<Element> | null = null;
  private pointerHandlers: PointerHandlers | null = null;
  private mounted = false;

  protected constructor(params: BaseWidgetParams<TCore, TConfig, TOptions>) {
    this.options = (params.options || {}) as TOptions;
    this.append = this.options.append !== false;

    const resolved = resolveWidgetConfig<TConfig>(
      params.requiredType,
      params.container,
      this.options,
      params.defaultProps,
      params.extraSkipProps,
    );

    this.uid = resolved.uid;
    this.config = resolved.initialConfig;
    this.core = params.createCore(this.uid, this.config, resolved.customType);
    this.el = createDiv(params.baseClasses);
    this.el.id = this.uid;
    addClasses(this.el, 'omnipad-prevent');

    if (params.markAsParent) {
      this.el.setAttribute('data-omnipad-parent-id', this.uid);
    }
  }

  protected mount(container: HTMLElement): void {
    if (this.mounted) return;
    this.mounted = true;

    if (this.append) {
      container.appendChild(this.el);
    }

    Registry.getInstance().register(this.core);
    this.subscribeCore();
    const windowManager = WindowManager.getInstance();
    windowManager.init();
    this.layoutInvalidationCleanup = windowManager.subscribeLayoutInvalidation(() => {
      if (this.stickyProvider) {
        this.syncLayout(this.config);
      }
    });
    this.spatialCleanup = setupSpatialLogic(
      this.core,
      this.el,
      (el) => distillRect(el.getBoundingClientRect()),
      () => this.stickyProvider,
    );
  }

  protected attachPointerBridge(options: { requireDirectHit?: boolean } = {}): void {
    if (!('onPointerDown' in this.core)) return;
    this.pointerHandlers = createPointerBridge(
      this.core as unknown as IPointerHandler & { activePointerId?: number | null },
      options,
    );

    this.addPointerListener('pointerdown', (event) => this.onPointerDown(event));
    this.addPointerListener('pointermove', (event) => this.onPointerMove(event));
    this.addPointerListener('pointerup', (event) => this.onPointerUp(event));
    this.addPointerListener('pointercancel', (event) => this.onPointerCancel(event));
    this.addPointerListener('lostpointercapture', (event) => this.onPointerCancel(event));
  }

  protected bindDelegates(delegates: Record<string, AnyFunction>): void {
    bindEntityDelegates(this.core, delegates);
  }

  public updateConfig(patch: Partial<TConfig>): void {
    (this.core as unknown as IConfigurable<TConfig>).updateConfig(patch);
  }

  public markRectDirty(): void {
    if ('markRectDirty' in this.core) {
      (this.core as { markRectDirty: () => void }).markRectDirty();
    }
    if (this.stickyProvider) {
      this.syncLayout(this.config);
    }
  }

  public onPointerDown(event: Parameters<IPointerHandler['onPointerDown']>[0]): void {
    this.pointerHandlers?.onPointerDown(event as PointerEvent);
  }

  public onPointerMove(event: Parameters<IPointerHandler['onPointerMove']>[0]): void {
    this.pointerHandlers?.onPointerMove(event as PointerEvent);
  }

  public onPointerUp(event: Parameters<IPointerHandler['onPointerUp']>[0]): void {
    this.pointerHandlers?.onPointerUp(event as PointerEvent);
  }

  public onPointerCancel(event: Parameters<IPointerHandler['onPointerCancel']>[0]): void {
    this.pointerHandlers?.onPointerCancel(event as PointerEvent);
  }

  public destroy(): void {
    for (const dispose of this.eventDisposers.splice(0)) dispose();
    for (const dispose of this.disposers.splice(0)) dispose();
    this.layoutInvalidationCleanup?.();
    this.layoutInvalidationCleanup = null;
    this.spatialCleanup?.();
    this.stickyController?.onCleanUp();
    this.core.destroy();
    this.el.remove();
  }

  protected renderConfig(config: TConfig): void {
    this.syncLayout(config);
    this.customClasses = replaceClasses(
      this.el,
      this.customClasses,
      (config as LayoutSyncTarget).cssClass,
    );
  }

  protected renderState(_state: TState): void {}

  protected getEffectiveLayout(config: TConfig): TConfig['layout'] {
    const layout = config.layout;
    const targetRect = this.stickyProvider?.getRect();
    return targetRect ? flattenToHostLayout(layout, targetRect) : layout;
  }

  protected syncLayout(config: TConfig): void {
    applyLayout(this.el, this.getEffectiveLayout(config));
  }

  protected addPointerListener(type: string, handler: (event: PointerEvent) => void): void {
    const listener = asPointerEventListener(handler);
    this.el.addEventListener(type, listener);
    this.eventDisposers.push(() => this.el.removeEventListener(type, listener));
  }

  private subscribeCore(): void {
    if ('subscribeConfig' in this.core) {
      const unsubscribe = (this.core as unknown as IConfigurable<TConfig>).subscribeConfig(
        (newConfig) => {
          this.config = newConfig;
          this.syncSticky(newConfig);
          this.renderConfig(newConfig);
        },
      );
      this.disposers.push(unsubscribe);
    }

    if ('subscribeState' in this.core) {
      const unsubscribe = (this.core as unknown as IStateful<TState>).subscribeState((newState) => {
        this.state = newState;
        this.renderState(newState);
      });
      this.disposers.push(unsubscribe);
    }
  }

  private syncSticky(config: TConfig): void {
    const selector = config.layout?.stickySelector;

    if (!this.stickyController) {
      this.stickyController = new StickyController(
        this.core as unknown as ICoreEntity & ISpatial & IResettable,
        () => this.syncLayout(this.config),
      );
    }

    const result = this.stickyController.handleSelectorChange(
      selector,
      this.stickyProvider,
      (newSelector) => createWebStickyProvider(newSelector),
    );
    this.stickyProvider = result.provider;
  }
}
