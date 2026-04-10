/**
 * A unique signature used to identify and verify that messages received via
 * window.postMessage originate from the OmniPad system.
 */
export const OMNIPAD_IPC_SIGNATURE = '__OMNIPAD_IPC_V1__';

/**
 * Represents the structure of a data packet used for Inter-Process Communication (IPC)
 * between the Host (main window) and the Guest (iframe).
 */
export interface IpcMessage {
  /** Verification string to filter out external third-party messages */
  signature: typeof OMNIPAD_IPC_SIGNATURE;

  /**
   * The broad category of the input event.
   * Distinguishes between spatial interactions and discrete key signals.
   */
  type: 'pointer' | 'keyboard';

  /**
   * The specific event action name.
   * Corresponds to standard browser event types like 'pointerdown', 'mousemove', 'keydown', etc.
   */
  action: string;

  /**
   * The data payload for the event.
   * For 'pointer' type: Contains relative coordinates {x, y} and event options.
   * For 'keyboard' type: Contains key mapping data {key, code, keyCode}.
   */
  payload: any;
}
