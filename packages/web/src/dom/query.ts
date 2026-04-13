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
  ignoreClass: string = 'omnipad-prevent',
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

/**
 * A robust wrapper for selecting a single DOM element.
 *
 *
 * @param selector - A string containing one or more selectors to match.
 * @returns The first {@link Element} that matches the specified selector, or `null` if no matches are found or the selector is invalid.
 *
 * @example
 * // Handles special characters in IDs gracefully
 * smartQuerySelector('#my.id$with:special-chars');
 * // Falls back to standard CSS selectors
 * smartQuerySelector('.container > div:first-child');
 */
export const smartQuerySelector = (selector: string): Element | null => {
  if (!selector) return null;

  // Forced use of getElementById for IDs to bypass CSS selector escaping rules
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    const el = document.getElementById(id);
    if (el) return el;
  }

  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
};
