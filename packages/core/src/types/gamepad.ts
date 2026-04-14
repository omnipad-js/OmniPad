/** Standard buttons for Gamepad API */
export type StandardButton =
  | 'A'
  | 'B'
  | 'X'
  | 'Y'
  | 'LB'
  | 'RB'
  | 'LT'
  | 'RT'
  | 'Select'
  | 'Start'
  | 'L3'
  | 'R3'
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right';

export interface GamepadMappingConfig {
  /**
   * Mapping of standard gamepad buttons to virtual component CIDs.
   * Key: Standard button name (e.g., 'A', 'X', 'RT').
   * Value: Configuration ID (CID) of the target virtual widget.
   */
  buttons?: Partial<Record<StandardButton, string>>;
  /**
   * CID of the virtual widget (D-Pad) to be driven by the physical d-pad.
   */
  dpad?: string;
  /**
   * CID of the virtual widget (Joystick or D-Pad) to be driven by the physical left stick.
   */
  leftStick?: string;
  /**
   * CID of the virtual widget (Joystick or D-Pad) to be driven by the physical right stick.
   */
  rightStick?: string;
  /**
   * Minimum axial displacement required to trigger input (0.0 to 1.0).
   * Prevents drift issues on older controllers.
   * @default 0.1
   */
  deadzone?: number;
}

/**
 * Represents the state of a single button on an abstract gamepad.
 */
export interface AbstractGamepadButton {
  pressed: boolean;
  value: number; // 0.0 - 1.0, 某些高级逻辑可能需要
}

/**
 * Platform-agnostic representation of a physical or virtual gamepad.
 * Derived from the W3C Gamepad API but decoupled from the environment.
 */
export interface AbstractGamepad {
  /** Whether the gamepad is still connected to the system. */
  connected: boolean;
  /** The state of all buttons on the gamepad. */
  buttons: ReadonlyArray<AbstractGamepadButton>;
  /** The current positions of all axes (analog sticks), ranging from -1.0 to 1.0. */
  axes: ReadonlyArray<number>;
}
