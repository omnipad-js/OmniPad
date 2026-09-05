import { afterEach, describe, expect, it, vi } from 'vitest';
import { Registry, setRafProvider } from '@omnipad/core';
import { WindowManager } from './WindowManager';

const singletonKey = Symbol.for('omnipad.window_manager.instance');
const registryKey = Symbol.for('omnipad.registry.instance');

describe('WindowManager layout invalidation', () => {
  afterEach(() => {
    const manager = (globalThis as Record<PropertyKey, unknown>)[singletonKey] as
      | WindowManager
      | undefined;
    manager?.destroy();
    delete (globalThis as Record<PropertyKey, unknown>)[singletonKey];
    const registry = (globalThis as Record<PropertyKey, unknown>)[registryKey] as
      | Registry
      | undefined;
    registry?.clear();
    delete (globalThis as Record<PropertyKey, unknown>)[registryKey];
    setRafProvider(
      (callback) => setTimeout(() => callback(Date.now()), 0),
      (handle) => clearTimeout(handle),
    );
    vi.restoreAllMocks();
  });

  it('notifies adapters after global rect caches are invalidated', () => {
    const listener = vi.fn();
    const manager = WindowManager.getInstance();
    const unsubscribe = manager.subscribeLayoutInvalidation(listener);

    (manager as unknown as { handleGlobalReset: () => void }).handleGlobalReset();

    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('reacts to resize, scroll, blur and hidden-page events without duplicate listeners', () => {
    const frames: Array<(time: number) => void> = [];
    setRafProvider(
      (callback) => {
        frames.push(callback);
        return frames.length;
      },
      () => {},
    );
    const entity = {
      uid: 'entity',
      destroy: vi.fn(),
      reset: vi.fn(),
      markRectDirty: vi.fn(),
    } as any;
    Registry.getInstance().register(entity);
    const manager = WindowManager.getInstance();
    manager.init();
    manager.init();

    window.dispatchEvent(new Event('resize'));
    expect(entity.reset).not.toHaveBeenCalled();
    frames.shift()?.(1);
    expect(entity.reset).toHaveBeenCalledOnce();
    expect(entity.markRectDirty).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event('scroll'));
    frames.shift()?.(2);
    window.dispatchEvent(new Event('blur'));
    expect(entity.reset).toHaveBeenCalledTimes(3);

    const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(entity.reset).toHaveBeenCalledTimes(4);
    if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
  });

  it('toggles fullscreen with a safety reset and reports failures without throwing', async () => {
    const manager = WindowManager.getInstance();
    const target = document.createElement('div');
    const requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: target });
    });
    const exitFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    });
    Object.defineProperty(target, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });

    await manager.toggleFullscreen(target);
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(manager.isFullscreen()).toBe(true);
    await manager.toggleFullscreen(target);
    expect(exitFullscreen).toHaveBeenCalledOnce();
    expect(manager.isFullscreen()).toBe(false);

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(target, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(async () => Promise.reject(new Error('blocked'))),
    });
    await manager.toggleFullscreen(target);
    expect(error).toHaveBeenCalled();
  });
});
