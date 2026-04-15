import { getDeepActiveElement, getDeepElement } from './query';

export const dispatchStandardKeyboardEvent = (
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

export const dispatchCustomKeyboardEvent = (
  type: string,
  payload: { key: string; code: string; keyCode: number },
  forwardFn?: (activeEl: HTMLIFrameElement, type: string, payload: any) => void,
) => {
  const activeEl = getDeepActiveElement();
  if (typeof forwardFn === 'function' && activeEl && activeEl.tagName.toLowerCase() === 'iframe') {
    forwardFn(activeEl as HTMLIFrameElement, type, payload);
    return;
  }
  dispatchStandardKeyboardEvent(type, payload);
};

export const dispatchCustomPointerEventAtPos = (
  type: string,
  x: number,
  y: number,
  opts: { button: number; buttons: number; pressure: number },
  forwardFn?: (target: HTMLIFrameElement, type: string, x: number, y: number, opts: any) => void,
) => {
  const target = getDeepElement(x, y);
  if (!target) return;

  if (typeof forwardFn === 'function' && target.tagName.toLowerCase() === 'iframe') {
    forwardFn(target as HTMLIFrameElement, type, x, y, opts);
    return;
  }

  dispatchStandardPointerEventAtPos(target, type, x, y, opts);
};

export const dispatchStandardPointerEventAtPos = (
  target: Element,
  type: string,
  x: number,
  y: number,
  opts: { button: number; buttons: number; pressure: number },
) => {
  // Defensive Interception: Preventing Illegal Floating-Point Injection (NaN/Infinity Protection)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

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

export const reclaimCustomFocusAtPos = (
  x: number,
  y: number,
  forwardFn?: (target: HTMLIFrameElement, x: number, y: number) => void,
): void => {
  const target = getDeepElement(x, y) as HTMLElement;
  if (!target) return;

  if (typeof forwardFn === 'function' && target.tagName.toLowerCase() === 'iframe') {
    forwardFn(target as HTMLIFrameElement, x, y);
  }

  const currentActive = getDeepActiveElement();
  if (currentActive !== target) {
    focusElement(target);
  }
};

export const focusElement = (el: HTMLElement) => {
  // Skip if already focused
  if (getDeepActiveElement() === el) return;

  // Set tabindex if missing to make element focusable
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
};
