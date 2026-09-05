import { afterEach, describe, expect, it, vi } from 'vitest';
import { getIframeOrigin, initIframeReceiver, OMNIPAD_IPC_SIGNATURE } from './ipc';

const originalElementsFromPoint = document.elementsFromPoint;

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
  public constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
  }
}

describe('iframe guest IPC receiver', () => {
  afterEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: originalElementsFromPoint,
    });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calculates iframe origins and receives authorised keyboard, pointer and focus messages', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('KeyboardEvent', MockKeyboardEvent);
    vi.stubGlobal('MouseEvent', MockMouseEvent);
    vi.stubGlobal('PointerEvent', MockPointerEvent);
    const target = document.createElement('button');
    target.tabIndex = 0;
    document.body.append(target);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [target],
    });
    const pointerDown = vi.fn();
    const mouseDown = vi.fn();
    const keyboard = vi.fn();
    target.addEventListener('pointerdown', pointerDown);
    target.addEventListener('mousedown', mouseDown);
    window.addEventListener('keydown', keyboard, { once: true });

    const iframe = document.createElement('iframe');
    iframe.src = '/nested';
    expect(getIframeOrigin(iframe)).toBe(window.location.origin);
    iframe.src = 'data:text/plain,hello';
    expect(getIframeOrigin(iframe)).toBe('*');

    initIframeReceiver({ allowedOrigins: [window.location.origin] });
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          signature: OMNIPAD_IPC_SIGNATURE,
          type: 'pointer',
          action: 'pointerdown',
          payload: { x: 10, y: 20, opts: { button: 0, buttons: 1, pressure: 0.5 } },
          depth: 1,
        },
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          signature: OMNIPAD_IPC_SIGNATURE,
          type: 'keyboard',
          action: 'keydown',
          payload: { key: 'a', code: 'KeyA', keyCode: 65 },
          depth: 1,
        },
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          signature: OMNIPAD_IPC_SIGNATURE,
          type: 'focus',
          action: 'reclaim',
          payload: { x: 10, y: 20 },
          depth: 1,
        },
      }),
    );

    expect(pointerDown).toHaveBeenCalledOnce();
    expect(mouseDown).toHaveBeenCalledOnce();
    expect(keyboard).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(target);

    const eventsBeforeRejectedMessages = pointerDown.mock.calls.length;
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://untrusted.example',
        data: {
          signature: OMNIPAD_IPC_SIGNATURE,
          type: 'pointer',
          action: 'pointerdown',
          payload: { x: 1, y: 1, opts: {} },
          depth: 1,
        },
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          signature: OMNIPAD_IPC_SIGNATURE,
          type: 'pointer',
          action: 'pointerdown',
          payload: { x: 1, y: 1, opts: {} },
          depth: 3,
        },
      }),
    );
    expect(pointerDown).toHaveBeenCalledTimes(eventsBeforeRejectedMessages);

    const nested = document.createElement('iframe');
    const postMessage = vi.fn();
    Object.defineProperty(nested, 'contentWindow', { configurable: true, value: { postMessage } });
    nested.src = '/nested';
    vi.spyOn(nested, 'getBoundingClientRect').mockReturnValue({
      left: 5,
      top: 7,
      right: 105,
      bottom: 107,
      width: 100,
      height: 100,
      x: 5,
      y: 7,
      toJSON: () => ({}),
    } as DOMRect);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [nested],
    });
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          signature: OMNIPAD_IPC_SIGNATURE,
          type: 'pointer',
          action: 'pointermove',
          payload: { x: 20, y: 30, opts: { button: 0 } },
          depth: 1,
        },
      }),
    );
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pointer',
        action: 'pointermove',
        payload: { x: 15, y: 23, e: { button: 0 } },
        depth: 2,
      }),
      window.location.origin,
    );
  });
});
