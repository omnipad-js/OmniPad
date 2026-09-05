import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElementObserver } from './ElementObserver';

class MockResizeObserver {
  public static instance: MockResizeObserver | undefined;

  public constructor(private callback: ResizeObserverCallback) {
    MockResizeObserver.instance = this;
  }

  public observe(): void {}
  public unobserve(): void {}

  public trigger(target: Element): void {
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

class MockIntersectionObserver {
  public observe(): void {}
  public unobserve(): void {}
}

const singletonKey = Symbol.for('omnipad.element_observer.instance');

function createRect(left: number, top: number): DOMRect {
  return {
    left,
    top,
    right: left + 100,
    bottom: top + 50,
    width: 100,
    height: 50,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('ElementObserver position tracking', () => {
  let scheduledFrame: FrameRequestCallback | undefined;
  let nextFrameId = 1;

  beforeEach(() => {
    delete (globalThis as Record<PropertyKey, unknown>)[singletonKey];
    MockResizeObserver.instance = undefined;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      scheduledFrame = callback;
      return nextFrameId++;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    delete (globalThis as Record<PropertyKey, unknown>)[singletonKey];
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('notifies every sticky widget when their shared target moves without resizing', () => {
    const target = document.createElement('div');
    let left = 20;
    let top = 30;
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => createRect(left, top));

    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const observer = ElementObserver.getInstance();
    observer.observePosition('sticky-target-1', target, firstCallback);
    observer.observePosition('sticky-target-2', target, secondCallback);

    scheduledFrame?.(0);
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).not.toHaveBeenCalled();

    left = 120;
    top = 80;
    scheduledFrame?.(16);
    expect(firstCallback).toHaveBeenCalledOnce();
    expect(secondCallback).toHaveBeenCalledOnce();

    observer.disconnect('sticky-target-1');
    left = 220;
    scheduledFrame?.(32);
    expect(firstCallback).toHaveBeenCalledOnce();
    expect(secondCallback).toHaveBeenCalledTimes(2);

    observer.disconnect('sticky-target-2');
  });

  it('keeps every resize callback registered for a shared target', () => {
    vi.useFakeTimers();
    const target = document.createElement('div');
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const observer = ElementObserver.getInstance();

    observer.observeResize('sticky-target-1', target, firstCallback);
    observer.observeResize('sticky-target-2', target, secondCallback);
    MockResizeObserver.instance?.trigger(target);
    vi.runAllTimers();

    expect(firstCallback).toHaveBeenCalledOnce();
    expect(secondCallback).toHaveBeenCalledOnce();

    observer.disconnect('sticky-target-1');
    MockResizeObserver.instance?.trigger(target);
    vi.runAllTimers();

    expect(firstCallback).toHaveBeenCalledOnce();
    expect(secondCallback).toHaveBeenCalledTimes(2);
    observer.disconnect('sticky-target-2');
  });
});
