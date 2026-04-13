import { ParsedLength, LayoutBox, AbstractRect } from '@omnipad/core';
import { flattenRelativeLayout } from '../ts/layout';

/**
 * Converts various CSS units into absolute pixel values based on the browser environment.
 *
 * Supports: `px`, `%` (relative to `baseSize`), `vw`, `vh`, `vmin`, `vmax`, `rem`, and `em`.
 *
 * **Note:** `rem` and `em` are both resolved using the root element's font size for simplicity.
 *
 * @param p - The parsed length object containing the value and unit.
 * @param baseSize - The reference dimension (width or height) used to resolve percentage (%) values.
 * @returns The computed numerical value in pixels.
 */
export function toAbsolutePx(p: ParsedLength | undefined, baseSize: number): number {
  if (!p) return 0;

  switch (p.unit) {
    case 'px':
      return p.value;
    case '%':
      return (p.value / 100) * baseSize;
    case 'vw':
      return (p.value / 100) * window.innerWidth;
    case 'vh':
      return (p.value / 100) * window.innerHeight;
    case 'vmin':
      return (p.value / 100) * Math.min(window.innerWidth, window.innerHeight);
    case 'vmax':
      return (p.value / 100) * Math.max(window.innerWidth, window.innerHeight);
    case 'rem':
    case 'em': {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return p.value * rootFontSize;
    }
    default:
      return p.value;
  }
}

/**
 * Flattens a relative layout into the coordinate system of its reference rectangle.
 *
 * **Core Logic:**
 * This function takes a layout that is defined relative to `refRect` (the "guest" space)
 * and calculates its equivalent position in the coordinate space that `refRect`
 * itself inhabits (the "host" space).
 *
 * It resolves mixed units, calculates dimensions based on directional constraints
 * (like stretching via left+right), and returns a normalized box where all values
 * are absolute pixel strings.
 *
 * @param layout - The layout properties relative to the reference rectangle.
 * @param refRect - The host rectangle defining the reference coordinate system.
 * @returns A normalized `LayoutBox` with pixel-based `left`, `top`, `width`, and `height`.
 */
export function flattenToHostLayout(layout: LayoutBox, refRect: AbstractRect): LayoutBox {
  return flattenRelativeLayout(layout, refRect, toAbsolutePx);
}
