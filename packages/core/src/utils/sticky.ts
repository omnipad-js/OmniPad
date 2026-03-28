import { AbstractRect, LayoutBox, ParsedLength } from '../types';
import { createCachedProvider } from './cache';
import { parseLength } from './layout';

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
   * @returns The previous cached element (if any).
   */
  public updateSelector(newSelector: string): void {
    if (this._selector === newSelector) return;
    this._selector = newSelector;
    this._cachedTarget = null;
    this.markDirty();
  }
}

/**
 * Resolves a relative "Sticky" layout into absolute viewport coordinates.
 * 
 * This function calculates the exact pixel positions required for `fixed` CSS positioning 
 * by mapping a relative `LayoutBox` (which may use percentages or offsets) onto the 
 * physical coordinate system of a target reference element (e.g., a game canvas).
 * 
 * @param layout - The relative layout configuration containing sticky instructions.
 * @param targetRect - The current physical bounding box of the reference element.
 * @returns A new LayoutBox with all dimensions resolved to absolute pixel strings.
 */
export function resolveStickyLayout(layout: LayoutBox, targetRect: AbstractRect): LayoutBox {
  // 1. 解析所有维度参数
  const pL = layout.left !== undefined ? parseLength(layout.left) : null;
  const pR = layout.right !== undefined ? parseLength(layout.right) : null;
  const pT = layout.top !== undefined ? parseLength(layout.top) : null;
  const pB = layout.bottom !== undefined ? parseLength(layout.bottom) : null;
  const pW = layout.width !== undefined ? parseLength(layout.width) : null;
  const pH = layout.height !== undefined ? parseLength(layout.height) : null;

  // 辅助函数：计算相对目标区域的像素偏移
  const getAbs = (p: ParsedLength | undefined, base: number) =>
    p ? (p.unit === '%' ? (p.value / 100) * base : p.value) : 0;

  // --- 水平计算 (Horizontal) ---
  let finalWidth: number;
  let finalLeft: number;

  if (pL !== null && pR !== null && pW === null) {
    // 情况 A: left + right 决定宽度
    finalLeft = targetRect.left + getAbs(pL, targetRect.width);
    const rightOffset = targetRect.right - getAbs(pR, targetRect.width);
    finalWidth = rightOffset - finalLeft;
  } else {
    // 情况 B: 标准优先级 (left > right)
    finalWidth = pW ? getAbs(pW, targetRect.width) : 0;
    if (pL !== null) {
      finalLeft = targetRect.left + getAbs(pL, targetRect.width);
    } else if (pR !== null) {
      finalLeft = targetRect.right - getAbs(pR, targetRect.width) - finalWidth;
    } else {
      finalLeft = targetRect.left; // 默认靠左
    }
  }

  // --- 垂直计算 (Vertical) ---
  let finalHeight: number;
  let finalTop: number;

  if (pT !== null && pB !== null && pH === null) {
    // 情况 A: top + bottom 决定高度
    finalTop = targetRect.top + getAbs(pT, targetRect.height);
    const bottomOffset = targetRect.bottom - getAbs(pB, targetRect.height);
    finalHeight = bottomOffset - finalTop;
  } else {
    // 情况 B: 标准优先级 (top > bottom)
    finalHeight = pH ? getAbs(pH, targetRect.height) : 0;
    if (pT !== null) {
      finalTop = targetRect.top + getAbs(pT, targetRect.height);
    } else if (pB !== null) {
      finalTop = targetRect.bottom - getAbs(pB, targetRect.height) - finalHeight;
    } else {
      finalTop = targetRect.top; // 默认靠顶
    }
  }

  // 更新结果对象
  return {
    ...layout,
    left: `${finalLeft}px`,
    top: `${finalTop}px`,
    width: pW || (pL && pR) ? `${finalWidth}px` : layout.width,
    height: pH || (pT && pB) ? `${finalHeight}px` : layout.height,
    // 清除 right 和 bottom，因为已经转换为了 fixed 坐标系的 top/left
    right: undefined,
    bottom: undefined,
  };
}
