import { AbstractRect, ICoreEntity, IElementObserver, IResettable, ISpatial } from '@omnipad/core';
import { createCachedProvider } from '@omnipad/core/utils';

/**
 * Headless Sticky Provider.
 * Manages reference coordinate tracking without direct DOM dependency.
 *
 * It relies on an externally injected 'finder' function to resolve
 * the reference object and a 'rectProvider' to get its dimensions.
 */
export class StickyProvider<T> {
  private _selector: string;
  private _cachedTarget: T | null = null;
  private _rectCache: ReturnType<typeof createCachedProvider<AbstractRect | null>>;

  /**
   * @param selector - The selector (e.g. selector) of the reference.
   * @param finder - A function that resolves the selector to a physical object.
   * @param rectProvider - A function that returns the bounds of the resolved object.
   * @param presenceChecker - A function to check if the target is still valid/attached.
   */
  constructor(
    selector: string,
    private finder: (id: string) => T,
    private rectProvider: (target: T) => AbstractRect | null,
    private presenceChecker: (target: T) => boolean,
  ) {
    this._selector = selector;

    this._rectCache = createCachedProvider(() => {
      const target = this.getTarget();
      if (!target) return null;
      return this.rectProvider(target);
    });
  }

  /**
   * Resolves and returns the target object.
   */
  public getTarget(): T | null {
    if (this._cachedTarget && this.presenceChecker(this._cachedTarget)) {
      return this._cachedTarget;
    }

    this._cachedTarget = this.finder(this._selector);
    return this._cachedTarget;
  }

  /**
   * Returns the current Rect of the sticky target.
   * Uses internal cache to prevent layout thrashing.
   */
  public getRect(): AbstractRect | null {
    return this._rectCache.get();
  }

  /**
   * Invalidates the current Rect cache.
   * Should be called during window resize, scroll, or manual re-alignments.
   */
  public markDirty(): void {
    this._rectCache.markDirty();
  }

  /**
   * Updates the selector and clears the current element cache.
   *
   * @param newSelector - The new CSS selector.
   * @returns Whether the selector is updated.
   */
  public updateSelector(newSelector: string): boolean {
    if (this._selector === newSelector) return false;
    this._selector = newSelector;
    this._cachedTarget = null;
    this.markDirty();
    return true;
  }
}

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
    private observer: IElementObserver<T>,
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
    // Case 1: Sticky mode disabled
    if (!newSelector) {
      this.observer.disconnect(this.uid);
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
        this.observer.observeResize(this.uid, target, () => {
          // Invalidate caches in both provider and core logic
          provider?.markDirty();
          this.instance.markRectDirty();
          this.onUpdate();
        });

        // 2. Monitor visibility status
        this.observer.observeIntersect(this.uid, target, (isVisible) => {
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
    this.observer.disconnect(this.uid);
  }
}
