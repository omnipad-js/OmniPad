import { dispatchStandardKeyboardEvent, dispatchStandardPointerEventAtPos } from './dispatch';
import { IframeManager } from '../singletons/IFrameManager';
import { getDeepActiveElement, getDeepElement } from './query';

/**
 * Forcefully focuses an element.
 * Automatically handles the 'tabindex' attribute to ensure non-focusable elements (like Canvas)
 * can receive focus.
 *
 * @param el - The target HTMLElement to focus.
 */
export const focusElement = (el: HTMLElement) => {
  // Skip if already focused
  if (getDeepActiveElement() === el) return;

  // Set tabindex if missing to make element focusable
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus();
};

/**
 * Dispatches a synthetic KeyboardEvent to the window object.
 *
 * @param type - The event type, e.g., 'keydown' or 'keyup'.
 * @param payload - Key mapping data including key, code, and legacy keyCode.
 */
export const dispatchKeyboardEvent = (
  type: string,
  payload: { key: string; code: string; keyCode: number },
) => {
  // Get the current truly focused element (correctness guaranteed by TargetZone's `ensureFocus`)
  const activeEl = getDeepActiveElement();
  if (activeEl && activeEl.tagName.toLowerCase() === 'iframe') {
    IframeManager.getInstance().forwardKeyboardEvent(activeEl as HTMLIFrameElement, type, payload);
    return;
  }

  dispatchStandardKeyboardEvent(type, payload);
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
  const target = getDeepElement(x, y);
  if (!target) return;

  if (target.tagName.toLowerCase() === 'iframe') {
    IframeManager.getInstance().forwardPointerEvent(target as HTMLIFrameElement, type, x, y, opts);
    return;
  }

  dispatchStandardPointerEventAtPos(target, type, x, y, opts);
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
 * @returns True if the focus was successfully moved to the target; false if it was already focused or no target found.
 */
export const reclaimFocusAtPos = (x: number, y: number, callback: () => void): void => {
  // Find the deepest element at coordinates, penetrating Shadow DOM boundaries
  // 在指定坐标处寻找最深层元素，穿透 Shadow DOM 边界
  const target = getDeepElement(x, y) as HTMLElement;
  if (!target) return;

  // Identify the current truly active element across all Shadow Roots
  // 识别当前页面中真正获得焦点的最深层元素（跨越所有 Shadow Root）
  const currentActive = getDeepActiveElement();

  // If the target is not currently focused, forcefully reclaim focus
  // 如果当前焦点不在目标元素上，则执行强制夺回逻辑
  if (currentActive !== target) {
    focusElement(target);
    callback();
  }
};
