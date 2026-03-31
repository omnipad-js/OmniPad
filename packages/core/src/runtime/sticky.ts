import { AbstractRect, ICoreEntity, IElementObserver, IResettable, ISpatial } from '../types';
import { createCachedProvider } from '../utils/cache';

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

export class StickyController<T> {
  private stickyKey: string;

  constructor(
    private observer: IElementObserver<T>,
    private instance: ICoreEntity & ISpatial & IResettable,
    private onUpdate: () => void,
  ) {
    this.stickyKey = this.instance.uid + '-sticky';
  }

  // 纯逻辑：处理选择器变化的策略
  public handleSelectorChange(
    newSelector: string | undefined,
    currentProvider: StickyProvider<T> | null,
    factory: (s: string) => StickyProvider<T>,
  ) {
    if (!newSelector) {
      this.observer.disconnect(this.stickyKey);
      return { provider: null, updated: true };
    }

    let provider = currentProvider;
    let updated = false;

    if (!provider) {
      provider = factory(newSelector);
      updated = true;
    } else {
      updated = provider.updateSelector(newSelector);
    }

    if (updated) {
      const target = provider.getTarget();
      if (target) {
        // 核心只负责下达“观测”命令，不关心底层怎么 observe
        this.observer.observeResize(this.stickyKey, target, () => {
          // 这里的逻辑依然由单例池节流
          provider?.markDirty();
          this.instance.markRectDirty();
        });
        this.observer.observeIntersect(this.stickyKey, target, (isVisible) => {
          if (!isVisible) {
            this.instance.reset();
          }
        });

        this.onUpdate();
      }
    }

    return { provider, updated };
  }

  public onCleanUp() {
    this.observer.disconnect(this.stickyKey);
  }
}
