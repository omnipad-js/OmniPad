import { AbstractRect, ICoreEntity, IResettable, ISpatial } from '@omnipad/core';
import { createCachedProvider, distillRect } from '@omnipad/core/utils';
import { smartQuerySelector } from './query';
import { StickyProvider } from '../ts/spatial';
import { ElementObserver } from '../singletons/ElementObserver';

/**
 * Creates a StickyProvider pre-configured for the Web environment.
 */
export const createWebStickyProvider = (selector: string) => {
  return new StickyProvider<Element>(
    selector,
    (id) => smartQuerySelector(id) as Element, // finder
    (el) => {
      // rectProvider
      const r = (el as Element).getBoundingClientRect();
      return distillRect(r);
    },
    (el) => el.isConnected, // presenceChecker
  );
};

/**
 * Orchestrates the "sticky" layout logic for an entity.
 *
 * It manages the lifecycle of a StickyProvider and synchronizes spatial
 * updates (Resize/Intersection) between a physical DOM target and the
 * logical Core entity.
 *
 * @template T - The type of the physical element (usually HTMLElement or Element).
 */
export class StickyController<T> {
  /**
   * Creates an instance of StickyController.
   *
   * @param observer - The unified observer singleton (RO/IO) to track the target.
   * @param instance - The core entity instance which must support spatial awareness and resetting.
   * @param onUpdate - Callback triggered when the layout needs to be re-synchronized (e.g., forcing a UI refresh).
   */
  constructor(
    private instance: ICoreEntity & ISpatial & IResettable,
    private onUpdate: () => void,
  ) {}

  /**
   * Generates a unique identifier for this controller's target element's internal observer registrations.
   */
  public get uid(): string {
    return this.instance.uid + '-sticky';
  }

  /**
   * Resolves the strategy for changing or initializing the sticky target.
   *
   * This method handles:
   * 1. Teardown of old observers if the selector is removed.
   * 2. Lazy initialization or hot-swapping of the StickyProvider.
   * 3. Re-binding spatial and visibility observers to the new target.
   *
   * @param newSelector - The CSS selector of the target element to stick to.
   * @param currentProvider - The current active StickyProvider instance, if any.
   * @param factory - A factory function to create a new environment-specific StickyProvider (e.g., WebStickyProvider).
   * @returns An object containing the resolved provider and a flag indicating if an update occurred.
   */
  public handleSelectorChange(
    newSelector: string | undefined,
    currentProvider: StickyProvider<T> | null,
    factory: (s: string) => StickyProvider<T>,
  ): { provider: StickyProvider<T> | null; updated: boolean } {
    const observer = ElementObserver.getInstance();

    // Case 1: Sticky mode disabled
    if (!newSelector) {
      observer.disconnect(this.uid);
      return { provider: null, updated: true };
    }

    let provider = currentProvider;
    let updated = false;

    // Case 2: Initialization or updating the provider
    if (!provider) {
      provider = factory(newSelector);
      updated = true;
    } else {
      // StickyProvider.updateSelector handles internal diffing
      updated = provider.updateSelector(newSelector);
    }

    if (updated) {
      const target = provider.getTarget();
      if (target) {
        // Bind spatial observers to the physical target
        // Core only commands the "observation"; the implementation is delegated to the observer pool.

        // 1. Monitor size/position changes
        observer.observeResize(this.uid, target as any, () => {
          // Invalidate caches in both provider and core logic
          provider?.markDirty();
          this.instance.markRectDirty();
          this.onUpdate();
        });

        // 2. Monitor visibility status
        observer.observeIntersect(this.uid, target as any, (isVisible) => {
          // Safety: Cut off input signals if the target element disappears (e.g., hidden by game logic)
          if (!isVisible) {
            this.instance.reset();
          }
        });

        // Notify the adapter to perform an immediate sync
        this.onUpdate();
      }
    }

    return { provider, updated };
  }

  /**
   * Disconnects all observers and releases resources.
   * Should be called when the host component is unmounted.
   */
  public onCleanUp(): void {
    ElementObserver.getInstance().disconnect(this.uid);
  }
}

/**
 * Orchestrates environment-agnostic spatial and visibility logic for an entity.
 *
 * @template T - The type of the physical element (e.g., HTMLElement, Element).
 * @param entity - The logic core entity instance (must implement ICoreEntity).
 * @param element - The physical element target to be observed.
 * @param getRect - An environment-specific function to retrieve the element's current Rect.
 * @param stickyProvider - Optional. If provided, its cache will be invalidated alongside the entity's.
 *
 * @returns A cleanup function to disconnect all registered observers.
 */
export function setupSpatialLogic<T extends Element>(
  entity: any,
  element: T,
  getRect: (el: T) => AbstractRect,
  stickyProvider?: StickyProvider<T> | null,
) {
  if (!entity.uid) return () => {};
  const uid = entity.uid;
  const observer = ElementObserver.getInstance();

  // --- 1. Spatial Logic (Rect & Resize) ---
  if ('bindRectProvider' in entity) {
    const spatialCore = entity as unknown as ISpatial;

    // 创建带缓存的提供者 / Create cached provider
    const cached = createCachedProvider(() => getRect(element));

    // 绑定获取与清理回调 / Bind getter and invalidation callback
    spatialCore.bindRectProvider(cached.get, () => {
      cached.markDirty();
      // 联动清理吸附目标的缓存 / Link invalidation to sticky provider
      if (stickyProvider) {
        stickyProvider.markDirty();
      }
    });

    // 注册尺寸监听 / Register ResizeObserver
    observer.observeResize(uid, element, () => {
      spatialCore.markRectDirty();
    });
  }

  // --- 2. Visibility Logic (Intersection) ---
  if ('reset' in entity) {
    const resettableCore = entity as unknown as IResettable;

    observer.observeIntersect(uid, element, (isVisible) => {
      // 丢失可见性时自动重置信号 (安全阀) / Auto-reset on visibility loss
      if (!isVisible) {
        resettableCore.reset();
      }
    });
  }

  // 返回清理函数 (用于注销所有监听) / Return cleanup function
  return () => {
    observer.disconnect(uid);
  };
}
