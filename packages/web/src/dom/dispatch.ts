import { getDeepActiveElement, getDeepElement } from './query';

export const dispatchStandardKeyboardEvent = (
  type: string,
  payload: { key: string; code: string; keyCode: number },
): boolean => {
  const ev = new KeyboardEvent(type, {
    ...payload,
    which: payload.keyCode, // Support for legacy Flash engines
    bubbles: true,
    cancelable: true,
    view: window,
  });
  return window.dispatchEvent(ev);
};

export const dispatchCustomKeyboardEvent = (
  type: string,
  payload: { key: string; code: string; keyCode: number },
  forwardFn?: (activeEl: HTMLIFrameElement, type: string, payload: any) => void,
): boolean => {
  const activeEl = getDeepActiveElement();
  if (typeof forwardFn === 'function' && activeEl && activeEl.tagName.toLowerCase() === 'iframe') {
    forwardFn(activeEl as HTMLIFrameElement, type, payload);
    return true;
  }
  return dispatchStandardKeyboardEvent(type, payload);
};

export const dispatchCustomPointerEventAtPos = (
  type: string,
  x: number,
  y: number,
  opts: { button: number; buttons: number; pressure: number },
  forwardFn?: (target: HTMLIFrameElement, type: string, x: number, y: number, opts: any) => void,
): boolean => {
  const target = getDeepElement(x, y);
  if (!target) return false;

  if (typeof forwardFn === 'function' && target.tagName.toLowerCase() === 'iframe') {
    forwardFn(target as HTMLIFrameElement, type, x, y, opts);
    return true;
  }

  return dispatchStandardPointerEventAtPos(target, type, x, y, opts);
};

export const dispatchStandardPointerEventAtPos = (
  target: Element,
  type: string,
  x: number,
  y: number,
  opts: { button: number; buttons: number; pressure: number },
): boolean => {
  // Defensive Interception: Preventing Illegal Floating-Point Injection (NaN/Infinity Protection)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
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
    return target.dispatchEvent(new MouseEvent(mouseType, commonProps));
  } else {
    // Fallback for direct mouse event dispatch
    return target.dispatchEvent(new MouseEvent(type, commonProps));
  }
};

export const reclaimCustomFocusAtPos = (
  x: number,
  y: number,
  forwardFn?: (target: HTMLIFrameElement, x: number, y: number) => void,
): boolean => {
  // Find the deepest element at coordinates, penetrating Shadow DOM boundaries
  // 在指定坐标处寻找最深层元素，穿透 Shadow DOM 边界
  const target = getDeepElement(x, y) as HTMLElement;
  if (!target) return false;

  // If an iframe is found, first send a reclaim request to the iframe
  // 如果找到的是 iframe，先往 iframe 发送回焦请求
  if (typeof forwardFn === 'function' && target.tagName.toLowerCase() === 'iframe') {
    forwardFn(target as HTMLIFrameElement, x, y);
  }

  return focusElement(target);
};

export const focusElement = (el: HTMLElement): boolean => {
  // Identify the current truly active element across all Shadow Roots
  // 识别当前页面中真正获得焦点的最深层元素（跨越所有 Shadow Root）
  if (getDeepActiveElement() === el) return false;

  // If the target is not currently focused, forcefully reclaim focus
  // 如果当前焦点不在目标元素上，则执行强制夺回逻辑
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
  return true;
};
