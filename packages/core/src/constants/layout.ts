/**
 * Supported CSS units for layout calculation.
 * Using a constant array for runtime validation.
 */
export const VALID_UNITS = ['px', '%', 'vh', 'vw', 'vmin', 'vmax', 'rem', 'em'] as const;

/**
 * Anchor position used to determine the alignment of an element relative to its coordinates.
 */
export const STANDARD_ANCHORS = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;
