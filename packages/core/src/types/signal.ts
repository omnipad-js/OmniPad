import { InputActionType, StageId, Vec2 } from '.';

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
