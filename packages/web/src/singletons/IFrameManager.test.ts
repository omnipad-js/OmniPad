import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElementObserver } from './ElementObserver';
import { IframeManager } from './IFrameManager';

class MockResizeObserver {
  public observe = vi.fn();
  public unobserve = vi.fn();

  public constructor(_callback: ResizeObserverCallback) {}
}

class MockIntersectionObserver {
  public observe = vi.fn();
  public unobserve = vi.fn();

  public constructor(_callback: IntersectionObserverCallback) {}
}

const iframeManagerKey = Symbol.for('omnipad.iframe_manager.instance');
const elementObserverKey = Symbol.for('omnipad.element_observer.instance');

function makeIframe(src: string, left = 100, top = 50) {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  const postMessage = vi.fn();
  Object.defineProperty(iframe, 'contentWindow', { configurable: true, value: { postMessage } });
  vi.spyOn(iframe, 'getBoundingClientRect').mockReturnValue({
    left,
    top,
    right: left + 300,
    bottom: top + 200,
    width: 300,
    height: 200,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
  document.body.append(iframe);
  return { iframe, postMessage };
}

describe('IframeManager', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    document.body.replaceChildren();
  });

  afterEach(() => {
    (globalThis as Record<PropertyKey, unknown>)[iframeManagerKey] &&
      (IframeManager.getInstance() as any).clearAll();
    delete (globalThis as Record<PropertyKey, unknown>)[iframeManagerKey];
    delete (globalThis as Record<PropertyKey, unknown>)[elementObserverKey];
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('validates origins and rejects unsafe origin declarations', () => {
    const manager = IframeManager.getInstance();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => manager.addTrustedOrigin('ftp://invalid.example')).toThrow('valid HTTP(S) URL');
    expect(() => manager.addTrustedOrigin('*')).toThrow('valid HTTP(S) URL');
  });

  it('forwards pointer, keyboard and focus messages with iframe-local coordinates', () => {
    const { iframe, postMessage } = makeIframe(`${window.location.origin}/game`);
    const manager = IframeManager.getInstance();

    manager.forwardPointerEvent(iframe, 'pointerdown', 160, 90, { button: 0 });
    manager.forwardKeyboardEvent(iframe, 'keydown', { key: 'a', code: 'KeyA' });
    manager.forwardFocusReclaim(iframe, 130, 75);

    expect(postMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        signature: '__OMNIPAD_IPC_V1__',
        type: 'pointer',
        action: 'pointerdown',
        payload: { x: 60, y: 40, opts: { button: 0 } },
        depth: 1,
      }),
      window.location.origin,
    );
    expect(postMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'keyboard',
        action: 'keydown',
        payload: { key: 'a', code: 'KeyA' },
      }),
      window.location.origin,
    );
    expect(postMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: 'focus', payload: { x: 30, y: 25 } }),
      window.location.origin,
    );
  });

  it('honours trusted origins, refreshes cached rects, and clears detached frames', () => {
    const trusted = makeIframe('https://trusted.example/game', 10, 20);
    const denied = makeIframe('https://denied.example/game', 10, 20);
    const manager = IframeManager.getInstance();
    manager.addTrustedOrigin('https://trusted.example');

    manager.forwardPointerEvent(denied.iframe, 'pointermove', 30, 40, {});
    manager.forwardPointerEvent(trusted.iframe, 'pointermove', 30, 40, {});
    expect(denied.postMessage).not.toHaveBeenCalled();
    expect(trusted.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ x: 20, y: 20 }) }),
      'https://trusted.example',
    );

    vi.spyOn(trusted.iframe, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 30,
      right: 320,
      bottom: 230,
      width: 300,
      height: 200,
      x: 20,
      y: 30,
      toJSON: () => ({}),
    } as DOMRect);
    manager.markAllRectDirty();
    manager.forwardFocusReclaim(trusted.iframe, 35, 45);
    expect(trusted.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ payload: { x: 15, y: 15 } }),
      'https://trusted.example',
    );

    trusted.iframe.remove();
    manager.markAllRectDirty();
    manager.clearAll();
    expect((ElementObserver.getInstance() as any)._roRegistry.size).toBe(0);
  });
});
