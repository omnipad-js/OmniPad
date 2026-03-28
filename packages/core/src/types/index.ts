/**
 * =================================================================
 * 1. Constants Definition
 * Used for runtime logic and as a baseline for type definitions.
 * =================================================================
 */

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
 * =================================================================
 * 2. Type Definitions
 * =================================================================
 */

/** * Represents an abstract bounding box, typically used as a
 * lightweight alternative to the DOMRect interface.
 */
export interface AbstractRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/** * Represents abstract pointer data, providing a platform-agnostic
 * alternative to the native PointerEvent.
 */
export interface AbstractPointerEvent {
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
}

/**
 * Represents a 2D coordinate or vector.
 * Typically used for percentage-based positioning (0-100).
 */
export interface Vec2 {
  x: number;
  y: number;
}

/** Unique identifier for a Stage (TargetZone) */
export type StageId = string;
/** Unique identifier for an Input Widget */
export type WidgetId = string;
/** Unique identifier for a Zone container (InputZone) */
export type ZoneId = string;

/** Union type of all built-in entity values */
export type AnyEntityType = (typeof CMP_TYPES)[keyof typeof CMP_TYPES];

/** Supported Widget type strings, allowing for custom string extensions */
export type WidgetType =
  | typeof CMP_TYPES.BUTTON
  | typeof CMP_TYPES.KEYBOARD_BUTTON
  | typeof CMP_TYPES.MOUSE_BUTTON
  | typeof CMP_TYPES.JOYSTICK
  | typeof CMP_TYPES.D_PAD
  | typeof CMP_TYPES.TRACKPAD
  | (string & {});

/** Supported Zone type strings, allowing for custom string extensions */
export type ZoneType = typeof CMP_TYPES.INPUT_ZONE | typeof CMP_TYPES.TARGET_ZONE | (string & {});

/** General node type identifier for ConfigTreeNode or Registry lookups */
export type EntityType = AnyEntityType | (string & {});

/** Built-in input action identifiers */
export type BuiltInActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];
/** Input action type strings, allowing for custom action extensions */
export type InputActionType = BuiltInActionType | (string & {});

/**
 * Supported CSS units for layout calculation.
 * Using a constant array for runtime validation.
 */
export const VALID_UNITS = ['px', '%', 'vh', 'vw', 'rem', 'em'] as const;

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
export type AnchorPoint =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * =================================================================
 * 3. Signal Protocol
 * Data structure for communication between Widgets and Stages.
 * =================================================================
 */

/**
 * Represents a signal emitted by an input widget to be processed by a target zone.
 */
export interface InputActionSignal {
  /** The unique identifier of the destination TargetZone */
  targetStageId: StageId;
  /** The action type to perform (e.g., keydown, mousemove) */
  type: InputActionType;
  /** The payload containing specific input details */
  payload: {
    /** Character value of the key (e.g., ' ') */
    key?: string;
    /** Physical key code (e.g., 'Space') */
    code?: string;
    /** Legacy numeric key code (e.g., 32) */
    keyCode?: number;
    /** Coordinate point in percentage (0-100) */
    point?: Vec2;
    /** Relative displacement in percentage (0-100) */
    delta?: Vec2;
    /** Mouse button index (0: Left, 1: Middle, 2: Right) */
    button?: 0 | 1 | 2;
    /** Input pressure or force (0.0 to 1.0) */
    pressure?: number;

    /** Allows for arbitrary custom data to support widget extensions */
    [key: string]: any;
  };
}

/**
 * Cross-framework context keys for dependency injection (e.g., Provide/Inject).
 */
export const CONTEXT = {
  /** The key used to propagate Parent IDs through the component tree */
  PARENT_ID_KEY: 'omnipad-parent-id-link',
} as const;

/**
 * A safe alternative to the global 'Function' type.
 * Represents any callable function with any arguments.
 */
export type AnyFunction = (...args: any[]) => void;

// Export sub-modules
export * from './configs';
export * from './gamepad';
export * from './keys';
export * from './registry';
export * from './state';
export * from './traits';
