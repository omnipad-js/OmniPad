import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchKeyboardEvent, dispatchPointerEventAtPos, reclaimFocusAtPos } from './action';
import { createPointerBridge } from './bridge';
import { safeReleaseCapture, safeSetCapture } from './capture';
import {
  dispatchKeyboardEventForward,
  dispatchPointerEventAtPosForward,
  reclaimFocusAtPosForward,
} from './dispatch';
import { flattenToHostLayout, toAbsolutePx } from './layout';
import { getDeepActiveElement, getDeepElement, smartQuerySelector } from './query';

const originalElementsFromPoint = document.elementsFromPoint;

function setElementsFromPoint(elements: Element[]): void {
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: vi.fn(() => elements),
  });
}

class MockMouseEvent extends window.Event {
  public constructor(type: string, init: MouseEventInit = {}) {
    super(type, init);
    for (const key of ['clientX', 'clientY', 'button', 'buttons', 'pressure'] as const) {
      Object.defineProperty(this, key, { value: (init as any)[key], enumerable: true });
    }
  }
}

class MockKeyboardEvent extends window.Event {
  public constructor(type: string, init: KeyboardEventInit = {}) {
    super(type, init);
    for (const key of ['key', 'code', 'keyCode', 'which'] as const) {
      Object.defineProperty(this, key, { value: (init as any)[key], enumerable: true });
    }
  }
}

class MockPointerEvent extends MockMouseEvent {
  public readonly pointerId: number;
  public readonly pointerType: string;
  public readonly isPrimary: boolean;

  public constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? '';
    this.isPrimary = init.isPrimary ?? false;
  }
}

function installSyntheticEventConstructors(): void {
  vi.stubGlobal('KeyboardEvent', MockKeyboardEvent);
  vi.stubGlobal('MouseEvent', MockMouseEvent);
  vi.stubGlobal('PointerEvent', MockPointerEvent);
}

describe('web DOM drivers', () => {
  afterEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: originalElementsFromPoint,
    });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resolves browser units and flattens relative guest layouts', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
    vi.stubGlobal('getComputedStyle', () => ({ fontSize: '20px' }));

    expect(toAbsolutePx({ value: 10, unit: 'vw' }, 0)).toBe(100);
    expect(toAbsolutePx({ value: 10, unit: 'vh' }, 0)).toBe(50);
    expect(toAbsolutePx({ value: 10, unit: 'vmin' }, 0)).toBe(50);
    expect(toAbsolutePx({ value: 10, unit: 'vmax' }, 0)).toBe(100);
    expect(toAbsolutePx({ value: 2, unit: 'rem' }, 0)).toBe(40);
    expect(toAbsolutePx({ value: 50, unit: '%' }, 80)).toBe(40);
    expect(
      flattenToHostLayout(
        { left: '10%', top: '10%', width: '50%', height: '50%' },
        { left: 100, top: 50, right: 500, bottom: 250, width: 400, height: 200 },
      ),
    ).toMatchObject({ left: '140px', top: '70px', width: '200px', height: '100px' });
  });

  it('finds deep DOM targets, active shadow descendants, and resilient selectors', () => {
    const ignored = document.createElement('div');
    ignored.className = 'omnipad-prevent';
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('button');
    target.tabIndex = 0;
    shadow.append(target);
    document.body.append(ignored, host);
    setElementsFromPoint([ignored, host]);
    Object.defineProperty(shadow, 'elementsFromPoint', {
      configurable: true,
      value: () => [target],
    });

    expect(getDeepElement(1, 2)).toBe(target);
    target.focus();
    expect(getDeepActiveElement()).toBe(target);
    const special = document.createElement('div');
    special.id = 'game.canvas$1';
    document.body.append(special);
    expect(smartQuerySelector('#game.canvas$1')).toBe(special);
    expect(smartQuerySelector('[')).toBeNull();
  });

  it('safely controls pointer capture and filters bridge events', () => {
    const element = document.createElement('div');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    const hasPointerCapture = vi.fn(() => true);
    Object.assign(element, { setPointerCapture, releasePointerCapture, hasPointerCapture });
    const core = {
      activePointerId: null as number | null,
      onPointerDown: vi.fn(function (event: PointerEvent) {
        core.activePointerId = event.pointerId;
      }),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(function () {
        core.activePointerId = null;
      }),
      onPointerCancel: vi.fn(),
    };
    const bridge = createPointerBridge(core, { requireDirectHit: true });
    const base = {
      isTrusted: true,
      pointerId: 4,
      currentTarget: element,
      target: element,
      cancelable: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;

    safeSetCapture(element, 1);
    safeReleaseCapture(element, 1);
    bridge.onPointerDown(base);
    bridge.onPointerMove({ ...base, pointerId: 5 });
    bridge.onPointerMove(base);
    bridge.onPointerUp(base);
    bridge.onPointerDown({ ...base, isTrusted: false });
    bridge.onPointerDown({ ...base, target: document.createElement('span') });

    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(core.onPointerDown).toHaveBeenCalledOnce();
    expect(core.onPointerMove).toHaveBeenCalledOnce();
    expect(core.onPointerUp).toHaveBeenCalledOnce();
  });

  it('dispatches keyboard/pointer events locally and forwards iframe targets', () => {
    installSyntheticEventConstructors();
    const target = document.createElement('button');
    target.tabIndex = 0;
    document.body.append(target);
    setElementsFromPoint([target]);
    const events: string[] = [];
    target.addEventListener('pointerdown', () => events.push('pointerdown'));
    target.addEventListener('mousedown', () => events.push('mousedown'));
    window.addEventListener('keydown', (event) => events.push(`key:${event.key}`), { once: true });

    expect(dispatchKeyboardEventForward('keydown', { key: 'a', code: 'KeyA', keyCode: 65 })).toBe(
      true,
    );
    expect(
      dispatchPointerEventAtPosForward('pointerdown', 10, 20, {
        button: 0,
        buttons: 1,
        pressure: 0.5,
      }),
    ).toBe(true);
    expect(events).toEqual(['key:a', 'pointerdown', 'mousedown']);

    const iframe = document.createElement('iframe');
    const forwardPointer = vi.fn();
    const forwardFocus = vi.fn();
    setElementsFromPoint([iframe]);
    expect(
      dispatchPointerEventAtPosForward(
        'pointermove',
        30,
        40,
        { button: 0, buttons: 0, pressure: 0 },
        forwardPointer,
      ),
    ).toBe(true);
    expect(forwardPointer).toHaveBeenCalledWith(iframe, 'pointermove', 30, 40, expect.any(Object));
    expect(reclaimFocusAtPosForward(30, 40, forwardFocus)).toBe(true);
    expect(forwardFocus).toHaveBeenCalledWith(iframe, 30, 40);
  });

  it('exposes the high-level DOM actions for non-iframe targets', () => {
    installSyntheticEventConstructors();
    const target = document.createElement('button');
    document.body.append(target);
    setElementsFromPoint([target]);
    const mouseDown = vi.fn();
    target.addEventListener('mousedown', mouseDown);

    expect(dispatchKeyboardEvent('keyup', { key: 'a', code: 'KeyA', keyCode: 65 })).toBe(true);
    expect(
      dispatchPointerEventAtPos('pointerdown', 1, 2, { button: 0, buttons: 1, pressure: 0.5 }),
    ).toBe(true);
    expect(reclaimFocusAtPos(1, 2)).toBe(true);
    expect(mouseDown).toHaveBeenCalledOnce();
    expect(target.getAttribute('tabindex')).toBe('-1');
  });
});
