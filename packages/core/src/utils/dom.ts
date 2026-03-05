// --- Query Utilities ---

import { IPointerHandler } from '../types';

/**
 * Recursively penetrates Shadow DOM boundaries to find the deepest element at the
 * specified viewport coordinates.
 *
 * @param x - Viewport X coordinate (px)
 * @param y - Viewport Y coordinate (px)
 * @param ignoreClass - Style class of DOM elements to be ignored
 * @returns The deepmost Element or null if none found at the position.
 */
export const getDeepElement = (
  x: number,
  y: number,
  ignoreClass: string = 'omnipad-target-zone',
): Element | null => {
  // Get all elements beneath the point
  const elements = document.elementsFromPoint(x, y);

  // Find the first element without ignoreClass (To skip elements like TargetZone)
  let target = elements.find((el) => !el.classList.contains(ignoreClass));

  if (!target) return null;

  // Drill down into shadowRoot if the current element is a host
  while (target && target.shadowRoot) {
    const nestedElements = target.shadowRoot.elementsFromPoint(x, y);
    const nestedTarget = nestedElements.find((el) => !el.classList.contains(ignoreClass));

    // If no nested element found or the same element returned, break recursion
    if (!nestedTarget || nestedTarget === target) break;
    target = nestedTarget;
  }

  return target;
};

/**
 * Recursively finds the truly focused element by traversing Shadow DOM boundaries.
 *
 * @returns The deepmost active Element in focus or null.
 */
export const getDeepActiveElement = (): Element | null => {
  let el = document.activeElement;

  // Traverse through activeElements of shadow containers
  while (el && el.shadowRoot && el.shadowRoot.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return el;
};

// --- Action Utilities ---

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
  const ev = new KeyboardEvent(type, {
    ...payload,
    which: payload.keyCode, // Support for legacy Flash engines
    bubbles: true,
    cancelable: true,
    view: window,
  });
  window.dispatchEvent(ev);
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

  const commonProps: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true, // Crucial for piercing Shadow DOM boundaries
    clientX: x,
    clientY: y,
    view: window,
    ...opts,
  };

  // If type is pointer-based, dispatch both PointerEvent and MouseEvent for 100% engine compatibility
  if (type.startsWith('pointer')) {
    target.dispatchEvent(
      new PointerEvent(type, {
        isPrimary: true,
        pointerId: 9999,
        pointerType: 'mouse', // Emulate mouse behavior for Flash MouseOver/Down logic
        ...commonProps,
      }),
    );

    // Automatically map pointer events to traditional mouse events
    const mouseType = type.replace('pointer', 'mouse');
    target.dispatchEvent(new MouseEvent(mouseType, commonProps));
  } else {
    // Fallback for direct mouse event dispatch
    target.dispatchEvent(new MouseEvent(type, commonProps));
  }
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

// --- Compatibility ---

let _isContainerQueriesSupported: boolean | undefined;

export const supportsContainerQueries = (): boolean => {
  if (_isContainerQueriesSupported !== undefined) return _isContainerQueriesSupported;

  _isContainerQueriesSupported =
    typeof window !== 'undefined' && !!window.CSS?.supports?.('width: 1cqw');

  return _isContainerQueriesSupported;
};

// --- Safe Capture ---

/**
 * Safely sets pointer capture on an element.
 *
 * @param el - The target element to capture the pointer.
 * @param pointerId - The unique ID of the pointer (from PointerEvent).
 */
export const safeSetCapture = (el: EventTarget | null, pointerId: number) => {
  if (el instanceof Element) {
    try {
      el.setPointerCapture(pointerId);
    } catch (err) {
      if (import.meta.env?.DEV) console.warn('[Omnipad-DOM] Failed to set pointer capture:', err);
    }
  }
};

/**
 * Safely releases pointer capture from an element.
 * Checks for current capture state and wraps in try-catch to prevent crashes.
 *
 * @param el - The target element.
 * @param pointerId - The unique ID of the pointer to release.
 */
export const safeReleaseCapture = (el: EventTarget | null, pointerId: number) => {
  if (el instanceof Element && el.hasPointerCapture(pointerId)) {
    try {
      el.releasePointerCapture(pointerId);
    } catch (err) {
      // Browsers often auto-release on up/cancel, so we silently ignore errors here.
    }
  }
};

/**
 * Creates a standardized bridge between native DOM PointerEvents and Core abstract handlers.
 * Handles event prevention, stop propagation, pointer capture, and multi-touch filtering.
 *
 * @param coreHandler - The logic core instance that implements IPointerHandler.
 * @param getElement - A getter function to retrieve the DOM element for pointer capture.
 * @returns An object containing mapped event handlers for Vue/React template binding.
 */
export function createPointerBridge(
  coreHandler: IPointerHandler & { activePointerId?: number | null },
  options: {
    /** Respond only to direct clicks (without responding to events bubbled up from child elements) */
    requireDirectHit?: boolean;
  } = {},
) {
  return {
    /**
     * Entry point for a pointer interaction.
     * Establishes capture and initializes core logic.
     */
    onPointerDown(e: PointerEvent) {
      // 拒收合成事件，防止事件环路 / Prevent synthetic events to avoid feedback loops
      if (!e.isTrusted) return;

      // 如果开启了“仅限直接点击”，则进行校验 / If “Direct Click Only” is enabled, verification will be performed.
      if (options?.requireDirectHit && e.target !== e.currentTarget) return;

      // 如果当前已有指针在控制，则忽略后续的其他指针按下 / Ensure the widget only responds to one pointer at a time
      if (coreHandler.activePointerId != null) return;

      // 阻止默认行为与冒泡 / Block default behavior and propagation
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      // 获取捕获目标并执行锁定 / Resolve target element and set pointer capture
      const el = e.currentTarget;
      if (el) safeSetCapture(el, e.pointerId);

      // 转发至核心逻辑 / Forward to core logic
      coreHandler.onPointerDown(e);
    },

    /**
     * Continuous movement handling.
     * Throttling should be handled within the core implementation.
     */
    onPointerMove(e: PointerEvent) {
      if (!e.isTrusted) return;

      // 校验指针 ID 是否匹配，防止多指冲突 / Validate pointer ID to prevent multi-touch interference
      if (coreHandler.activePointerId != null && coreHandler.activePointerId !== e.pointerId)
        return;
      if (e.cancelable) e.preventDefault();

      coreHandler.onPointerMove(e);
    },

    /**
     * Successful interaction completion.
     * Filters by pointerId to ensure only the capturing finger triggers release.
     */
    onPointerUp(e: PointerEvent) {
      if (!e.isTrusted) return;
      if (coreHandler.activePointerId != null && coreHandler.activePointerId !== e.pointerId)
        return;
      if (e.cancelable) e.preventDefault();

      // 释放指针锁定 / Release pointer capture
      const el = e.currentTarget;
      if (el) safeReleaseCapture(el, e.pointerId);

      coreHandler.onPointerUp(e);
    },

    /**
     * System-level interaction cancellation (e.g., alert popups, browser gestures).
     */
    onPointerCancel(e: PointerEvent) {
      if (!e.isTrusted) return;
      if (coreHandler.activePointerId != null && coreHandler.activePointerId !== e.pointerId)
        return;

      const el = e.currentTarget;
      if (el) safeReleaseCapture(el, e.pointerId);

      coreHandler.onPointerCancel(e);
    },
  };
}
