import { afterEach, describe, expect, it, vi } from 'vitest';
import { WindowManager } from './WindowManager';

const singletonKey = Symbol.for('omnipad.window_manager.instance');

describe('WindowManager layout invalidation', () => {
  afterEach(() => {
    const manager = (globalThis as Record<PropertyKey, unknown>)[singletonKey] as WindowManager | undefined;
    manager?.destroy();
    delete (globalThis as Record<PropertyKey, unknown>)[singletonKey];
  });

  it('notifies adapters after global rect caches are invalidated', () => {
    const listener = vi.fn();
    const manager = WindowManager.getInstance();
    const unsubscribe = manager.subscribeLayoutInvalidation(listener);

    (manager as unknown as { handleGlobalReset: () => void }).handleGlobalReset();

    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
