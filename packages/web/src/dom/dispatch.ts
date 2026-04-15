import { getDeepActiveElement, getDeepElement } from './query';

export const focusElement = (el: HTMLElement) => {
  // Skip if already focused
  if (getDeepActiveElement() === el) return;

  // Set tabindex if missing to make element focusable
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
};

export const reclaimLocalFocusAtPos = (x: number, y: number): void => {
  const target = getDeepElement(x, y) as HTMLElement;
  if (!target) return;

  const currentActive = getDeepActiveElement();
  if (currentActive !== target) {
    focusElement(target);
  }
};

export const dispatchLocalKeyboardEvent = (
  type: string,
  payload: { key: string; code: string; keyCode: number },
) => {
  dispatchStandardKeyboardEvent(type, payload);
};

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

export const dispatchLocalPointerEventAtPos = (
  type: string,
  x: number,
  y: number,
  opts: { button: number; buttons: number; pressure: number },
) => {
  const target = getDeepElement(x, y);
  if (!target) return;

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
