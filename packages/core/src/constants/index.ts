/**
 * Core entity types supported by the library.
 */
export const CMP_TYPES = {
  // --- Zones ---
  /** Area responsible for capturing touches and spawning dynamic widgets */
  INPUT_ZONE: 'input-zone',
  /** Area responsible for receiving signals and simulating DOM events */
  TARGET_ZONE: 'target-zone',

  // --- Widgets ---
  BUTTON: 'button',
  /** Simulates a physical keyboard key press */
  KEYBOARD_BUTTON: 'keyboard-button',
  /** Simulates a mouse button click/hold */
  MOUSE_BUTTON: 'mouse-button',
  /** A joystick that outputs 360-degree or locked direction vectors */
  JOYSTICK: 'joystick',
  /** Classic 4/8-way directional pad */
  D_PAD: 'd-pad',
  /** Trackpad-style relative movement area */
  TRACKPAD: 'trackpad',

  // --- Virtual Helpers ---
  /** Logic for the on-screen visual cursor */
  VIRTUAL_CURSOR: 'virtual-cursor',
  /** The top-level managed container */
  ROOT_LAYER: 'root-layer',
} as const;

/**
 * Standardized input action types for the signal protocol.
 */
export const ACTION_TYPES = {
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  POINTER: 'pointer',
  POINTERMOVE: 'pointermove',
  POINTERDOWN: 'pointerdown',
  POINTERUP: 'pointerup',
  MOUSE: 'mouse',
  MOUSEMOVE: 'mousemove',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  CLICK: 'click',
} as const;

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

/**
 * Cross-framework context keys for dependency injection (e.g., Provide/Inject).
 */
export const CONTEXT = {
  /** The key used to propagate Parent IDs through the component tree */
  PARENT_ID_KEY: 'omnipad-parent-id-link',
} as const;

export * from './gamepad';
export * from './keys';
