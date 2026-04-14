import { AnchorPoint, FlexibleLength } from '.';
import { CMP_TYPES } from '../constants';
import { GamepadMappingConfig } from './gamepad';
import { ActionMapping } from './keys';

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
 * Base configuration interface for all components.
 */
export interface BaseConfig {
  /**
   * Config ID (CID) used in persistent storage.
   *
   * If omitted, a random UID will be generated during parsing.
   * If starts with '$', it points to a global static entity. (UID = CID)
   */
  id?: string;
  /** The unique type identifier for the component. */
  baseType: string;
  /** CID of the parent component. Root components have no parentId. */
  parentId?: string;
  /** Spatial layout configuration relative to its parent zone. */
  layout: LayoutBox;
  /**
   * Custom CSS class names or style tags.
   *
   * For visual decoration only; must not include layout attributes such as top/left/width/height while the same properties are set in `layout: LayoutBox`.
   */
  cssClass?: string;
}

/**
 * Configuration for a virtual keyboard/mouse button.
 */
export interface ButtonConfig extends BaseConfig {
  baseType: typeof CMP_TYPES.BUTTON;
  /** The text or symbol displayed on the button surface. */
  label?: string;
  /** CID of the TargetZone where signals should be dispatched. */
  targetStageId?: string;
  /** Keyboard or mouse event metadata to be emitted when triggered. */
  mapping?: ActionMapping;
}

/**
 * Configuration for a virtual trackpad.
 */
export interface TrackpadConfig extends BaseConfig {
  baseType: typeof CMP_TYPES.TRACKPAD;
  /** The text or symbol displayed on the trackpad surface. */
  label?: string;
  /** Determines the mapping ratio between the physical displacement of the trackpad and the movement of the screen cursor. */
  sensitivity?: number;
  /** CID of the TargetZone where signals should be dispatched. */
  targetStageId?: string;
  /** Optional: Mouse or keyboard event metadata to be emitted when triggered. */
  mapping?: ActionMapping;
}

/**
 * Configuration for a virtual d-pad.
 */
export interface DPadConfig extends BaseConfig {
  baseType: typeof CMP_TYPES.D_PAD;
  /** CID of the TargetZone where signals should be dispatched. */
  targetStageId?: string;
  /** Defines the specific actions or key signals emitted for each cardinal direction. */
  mapping?: {
    up: ActionMapping;
    down: ActionMapping;
    left: ActionMapping;
    right: ActionMapping;
  };
  /** Determines the minimum travel distance required to trigger a direction. */
  threshold?: number;
  /* Controls the visibility of the internal floating feedback handle (stick). */
  showStick?: boolean;
}

export interface JoystickConfig extends BaseConfig {
  baseType: typeof CMP_TYPES.JOYSTICK;
  /** The text or symbol displayed on the stick button surface. */
  label?: string;
  /** CID of the TargetZone where signals should be dispatched. */
  targetStageId?: string;
  /** Determines the minimum travel distance required to trigger a direction. */
  threshold?: number;
  /** Whether enable cursor displacement simulation. */
  cursorMode?: boolean;
  /** Determines the mapping velocity between the physical displacement of the joystick and the movement of the screen cursor. */
  cursorSensitivity?: number;
  /** Defines the specific actions or key signals emitted for each cardinal direction and stick button. */
  mapping?: {
    up?: ActionMapping;
    down?: ActionMapping;
    left?: ActionMapping;
    right?: ActionMapping;
    stick?: ActionMapping;
  };
}

/**
 * Configuration for an Input Zone.
 * Input Zones act as containers and can handle dynamic (floating) widgets.
 */
export interface InputZoneConfig extends BaseConfig {
  baseType: typeof CMP_TYPES.INPUT_ZONE;
  /** If true, prevents the browser focus from leaving the game area when touching this zone. */
  preventFocusLoss?: boolean;
  /**
   * The CID of a child component intended to be used as a dynamic (floating) widget.
   */
  dynamicWidgetId?: string;
}

/**
 * Configuration for a Target Focus Zone.
 * Acts as the bridge between virtual signals and the actual game/app DOM.
 */
export interface TargetZoneConfig extends BaseConfig {
  baseType: typeof CMP_TYPES.TARGET_ZONE;
  /** Whether to render a visual virtual cursor. */
  cursorEnabled?: boolean;
  /** Delay in milliseconds before the virtual cursor auto-hides after inactivity (0 to disable). */
  cursorAutoDelay?: number;
}

/**
 * Union type representing any valid component configuration.
 */
export type AnyConfig =
  | ButtonConfig
  | InputZoneConfig
  | TargetZoneConfig
  | TrackpadConfig
  | DPadConfig
  | JoystickConfig
  | any;

/**
 * Representation of a single item in a flattened configuration profile.
 * Ideal for database storage and flat-list editing.
 */
export interface FlatConfigItem {
  /** Unique identifier (CID) in the scope of the profile. */
  id: string;
  /** Component type string. */
  type: string;
  /** Parent CID. Empty if this is the root node. */
  parentId?: string;
  /** Flattened business logic and layout properties. */
  config?: Record<string, any>;
}

/**
 * The root structure of a OmniPad configuration file.
 */
export interface OmniPadProfile {
  /** Metadata about the profile creator and version. */
  meta: {
    name: string;
    version: string;
    author?: string;
    description?: string;
  };
  /** List of all components in the profile. Hierarchies are defined via parentId. */
  items: FlatConfigItem[];
  /**
   * Global mapping configuration for physical gamepad hardware.
   * Defines how hardware inputs interact with the virtual components listed in 'items'.
   */
  gamepadMappings?: GamepadMappingConfig[];
}

/**
 * A recursive tree structure representing the runtime hierarchy of components.
 * Used by the adapter layer (e.g., Vue) to render components recursively.
 */
export interface ConfigTreeNode {
  /** Runtime Unique Entity ID (UID), unique across the entire application. */
  uid: string;
  /** Component type string. */
  type: string;
  /** Component properties (layout, mapping, etc.), stripped of hierarchy data. */
  config?: Record<string, any>;
  /** Nested children tree nodes. */
  children?: ConfigTreeNode[];
}
