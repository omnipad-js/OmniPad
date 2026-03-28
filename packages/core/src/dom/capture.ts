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
      if (import.meta.env?.DEV) console.warn('[OmniPad-DOM] Failed to set pointer capture:', err);
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
