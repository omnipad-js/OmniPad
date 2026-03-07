import { Vec2 } from './index';

/**
 * Metadata for basic pointer interaction.
 * Shared by all interactable entities to track physical touch/mouse state.
 */
export interface InteractionState {
  /** Indicates if the component is currently being touched or clicked. */
  isActive: boolean;
  /** The unique ID of the pointer being tracked, used for Pointer Capture. */
  pointerId: number | null;
}

/**
 * Logic-level state for button-type widgets.
 * Handles the processed output after debouncing or toggle logic.
 */
export interface ButtonLogicState {
  /** The final logical state of the button (true = pressed). */
  isPressed: boolean;
  /** Numerical value representing pressure or analog depth, ranging from 0.0 to 1.0. */
  value: number;
}

/**
 * Logic-level state for axis-type or joystick widgets.
 * Represents the normalized directional input.
 */
export interface AxisLogicState {
  /** Normalized direction vector where x and y range from -1.0 to 1.0. */
  vector: { x: number; y: number };
}

/**
 * Runtime state for the Virtual Cursor within a TargetZone.
 */
export interface CursorState {
  /** Current position of the cursor as a percentage (0-100) relative to the stage. */
  position: Vec2;
  /** Visibility toggle based on movement or configuration. */
  isVisible: boolean;
  /** Indicates if a logical "Mouse Down" is currently active. */
  isPointerDown: boolean;
  /** A temporary flag used to trigger focus-reclaim visual feedback. */
  isFocusReturning: boolean;
}

/**
 * State for managing dynamic/floating widgets within an InputZone.
 */
export interface InputZoneState {
  /** Indicates if a dynamic widget (e.g., a floating stick) is currently spawned. */
  isDynamicActive: boolean;
  /** The ID (UID) of the pointer that triggered the dynamic widget. */
  dynamicPointerId: number | null;
  /** The initial spawn coordinates of the dynamic widget (percentage 0-100). */
  dynamicPosition: Vec2;
}

/**
 * Basic state for Managed Layers.
 */
export interface LayerState {
  /** Visual hint for layout debugging or active selection. */
  isHighlighted: boolean;
}

/**
 * Combined state for Button components.
 */
export interface ButtonState extends InteractionState, ButtonLogicState {}

/**
 * Combined state for Keyboard Button components.
 */
export interface KeyboardButtonState extends InteractionState, ButtonLogicState {}

/**
 * Combined state for Mouse Button components.
 */
export interface MouseButtonState extends InteractionState, ButtonLogicState {}

/**
 * Combined state for Trackpad components.
 */
export interface TrackpadState extends InteractionState, ButtonLogicState {}

/**
 * Combined state for D-pad components.
 */
export interface DPadState extends InteractionState, AxisLogicState {}

/**
 * Combined state for Joystick components.
 */
export interface JoystickState extends InteractionState, AxisLogicState, ButtonLogicState {}
