import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StickyProvider } from '../ts/spatial';
import { ElementObserver } from '../singletons/ElementObserver';
import { StickyController } from './spatial';

class MockResizeObserver {
  public constructor(_callback: ResizeObserverCallback) {}

  public observe(): void {}
  public unobserve(): void {}
}

class MockIntersectionObserver {
  public observe(): void {}
  public unobserve(): void {}
}

class MockMutationObserver {
  public static instances: MockMutationObserver[] = [];
  public readonly observe = vi.fn();
  public readonly disconnect = vi.fn();

  public constructor(private readonly callback: MutationCallback) {
    MockMutationObserver.instances.push(this);
  }

  public trigger(): void {
    this.callback([], this as unknown as MutationObserver);
  }
}

const singletonKey = Symbol.for('omnipad.element_observer.instance');
const nativeMutationObserver = globalThis.MutationObserver;

function createProvider(selector: string): StickyProvider<Element> {
  return new StickyProvider(
    selector,
    (value) => document.querySelector(value) as Element,
    () => null,
    (element) => element.isConnected,
  );
}

function createController(onUpdate: () => void): StickyController<Element> {
  return new StickyController(
    {
      uid: 'sticky-widget',
      markRectDirty: vi.fn(),
      reset: vi.fn(),
    } as any,
    onUpdate,
  );
}

describe('StickyController delayed target discovery', () => {
  let scheduledFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    delete (globalThis as Record<PropertyKey, unknown>)[singletonKey];
    MockMutationObserver.instances = [];
    document.body.replaceChildren();
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal('MutationObserver', MockMutationObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      scheduledFrame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    ElementObserver.getInstance().disconnect('sticky-widget-sticky');
    delete (globalThis as Record<PropertyKey, unknown>)[singletonKey];
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('binds a selector target that appears after the profile is restored', () => {
    const onUpdate = vi.fn();
    const controller = createController(onUpdate);
    const result = controller.handleSelectorChange('[data-sticky-target]', null, createProvider);
    const discovery = MockMutationObserver.instances[0];

    expect(result.provider).not.toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(discovery.observe).toHaveBeenCalledOnce();

    const target = document.createElement('canvas');
    target.dataset.stickyTarget = '';
    document.body.append(target);
    discovery.trigger();

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(result.provider?.getTarget()).toBe(target);
    expect(discovery.disconnect).toHaveBeenCalledOnce();

    controller.onCleanUp();
  });

  it('reacts to an actual DOM mutation without applying the config again', async () => {
    vi.stubGlobal('MutationObserver', nativeMutationObserver);

    const onUpdate = vi.fn();
    const controller = createController(onUpdate);
    const result = controller.handleSelectorChange('[data-sticky-target]', null, createProvider);

    const target = document.createElement('canvas');
    target.dataset.stickyTarget = '';
    document.body.append(target);

    await vi.waitFor(() => {
      expect(onUpdate).toHaveBeenCalledOnce();
    });

    expect(result.provider?.getTarget()).toBe(target);
    controller.onCleanUp();
  });

  it('rebinds when a framework replaces the selected element', () => {
    const firstTarget = document.createElement('canvas');
    firstTarget.dataset.stickyTarget = '';
    document.body.append(firstTarget);

    const onUpdate = vi.fn();
    const controller = createController(onUpdate);
    const result = controller.handleSelectorChange('[data-sticky-target]', null, createProvider);

    const replacement = document.createElement('canvas');
    replacement.dataset.stickyTarget = '';
    firstTarget.replaceWith(replacement);
    scheduledFrame?.(0);

    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(result.provider?.getTarget()).toBe(replacement);

    controller.onCleanUp();
  });
});
