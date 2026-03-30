import { AbstractRect } from '../types';
import { createCachedProvider } from '../utils/cache';

/**
 * Headless Sticky Provider.
 * Manages reference coordinate tracking without direct DOM dependency.
 *
 * It relies on an externally injected 'finder' function to resolve
 * the reference object and a 'rectProvider' to get its dimensions.
 */
export class StickyProvider {
  private _selector: string;
  private _cachedTarget: any | null = null;
  private _rectCache: ReturnType<typeof createCachedProvider<AbstractRect | null>>;

  /**
   * @param selector - The selector (e.g. selector) of the reference.
   * @param finder - A function that resolves the selector to a physical object.
   * @param rectProvider - A function that returns the bounds of the resolved object.
   * @param presenceChecker - A function to check if the target is still valid/attached.
   */
  constructor(
    selector: string,
    private finder: (id: string) => any,
    private rectProvider: (target: any) => AbstractRect | null,
    private presenceChecker: (target: any) => boolean,
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
  public getTarget(): any | null {
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
