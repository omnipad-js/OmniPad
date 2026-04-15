import {
  dispatchCustomKeyboardEvent,
  dispatchCustomPointerEventAtPos,
  reclaimCustomFocusAtPos,
} from './dispatch';
import { IframeManager } from '../singletons/IFrameManager';

/**
 * Dispatches a synthetic KeyboardEvent to the window object.
 *
 * @param type - The event type, e.g., 'keydown' or 'keyup'.
 * @param payload - Key mapping data including key, code, and legacy keyCode.
 */
export const dispatchKeyboardEvent = (
  type: string,
  payload: { key: string; code: string; keyCode: number },
): boolean => {
  return dispatchCustomKeyboardEvent(type, payload, (a, b, c) => {
    IframeManager.getInstance().forwardKeyboardEvent(a, b, c);
  });
};

/**
 * Dispatches a high-fidelity sequence of Pointer and Mouse events at specific pixel coordinates.
 * Finds the target element dynamically at the moment of dispatch.
 *
 * @param type - The event type (should start with 'pointer' for best compatibility).
 * @param x - Viewport X coordinate (px).
 * @param y - Viewport Y coordinate (px).
 * @param opts - Additional PointerEvent options (button, pressure, etc.).
 */
export const dispatchPointerEventAtPos = (
  type: string,
  x: number,
  y: number,
  opts: { button: number; buttons: number; pressure: number },
) => {
  return dispatchCustomPointerEventAtPos(type, x, y, opts, (a, b, c, d, e) => {
    IframeManager.getInstance().forwardPointerEvent(a, b, c, d, e);
  });
};

/**
 * Reclaims browser focus for the element located at the specified viewport coordinates.
 *
 * This utility identifies the deepest element (penetrating Shadow DOM) at the given position
 * and ensures it becomes the active element. It is essential for ensuring that
 * game engines (like Ruffle) receive keyboard events immediately after a virtual interaction.
 *
 * @param x - The horizontal coordinate relative to the viewport.
 * @param y - The vertical coordinate relative to the viewport.
 */
export const reclaimFocusAtPos = (x: number, y: number): boolean => {
  return reclaimCustomFocusAtPos(x, y, (a, b, c) => {
    IframeManager.getInstance().forwardFocusReclaim(a, b, c);
  });
};
