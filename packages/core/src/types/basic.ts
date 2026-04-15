import { ACTION_TYPES, CMP_TYPES } from '../constants/basic';

/**
 * Represents an abstract bounding box, typically used as a
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

/**
 * Represents abstract pointer data, providing a platform-agnostic
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
 * A safe alternative to the global 'Function' type.
 * Represents any callable function with any arguments.
 */
export type AnyFunction = (...args: any[]) => void;
