import { getDeepElement } from "./query";

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