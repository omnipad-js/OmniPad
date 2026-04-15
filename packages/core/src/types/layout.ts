import { STANDARD_ANCHORS, VALID_UNITS } from '../constants/layout';

/**
 * Defines the spatial properties of a component.
 * Supports various CSS units (px, %, vh, vw) via FlexibleLength.
 */
export interface LayoutBox {
  /** Offset from the left edge of the parent container. */
  left?: FlexibleLength;
  /** Offset from the top edge of the parent container. */
  top?: FlexibleLength;
  /** Offset from the right edge of the parent container. */
  right?: FlexibleLength;
  /** Offset from the bottom edge of the parent container. */
  bottom?: FlexibleLength;
  /** Width of the component. */
  width?: FlexibleLength;
  /** Height of the component. */
  height?: FlexibleLength;
  /** Whether equal width and length. (aspect-ratio: 1/1) */
  isSquare?: boolean;
  /**
   * The alignment point of the component relative to its (left, top) coordinates.
   * @example 'center' will center the component on its position.
   */
  anchor?: AnchorPoint;
  /** Z-index for layering control. */
  zIndex?: number;
  /**
   * CSS selector for the target element (e.g., "#game-canvas").
   * If provided, the component switches to "Sticky" mode and positions itself relative to this element.
   */
  stickySelector?: string;
}

/**
 * Derived type for type safety in TS
 */
export type CssUnit = (typeof VALID_UNITS)[number];

/**
 * Parsed length input.
 */
export interface ParsedLength {
  value: number;
  unit: CssUnit;
}

/**
 * Flexible length input.
 * Supports numbers (interpreted as px) or strings (e.g., '50%', '10vh').
 */
export type FlexibleLength = ParsedLength | string | number;

/**
 * Anchor position used to determine the alignment of an element relative to its coordinates.
 */
export type AnchorPoint = (typeof STANDARD_ANCHORS)[number];
