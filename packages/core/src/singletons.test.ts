import { afterEach, describe, expect, it, vi } from 'vitest';
import { setRafProvider } from './runtime/performance';
import { GamepadManager, setGamepadProvider } from './singletons/GamepadManager';
import { Registry, setGlobalSignalHandler } from './singletons/Registry';

const registryKey = Symbol.for('omnipad.registry.instance');
const gamepadKey = Symbol.for('omnipad.gamepad_manager.instance');

function resetSingletons(): void {
  const registry = (globalThis as Record<PropertyKey, unknown>)[registryKey] as
    | Registry
    | undefined;
  registry?.clear();
  delete (globalThis as Record<PropertyKey, unknown>)[registryKey];
  delete (globalThis as Record<PropertyKey, unknown>)[gamepadKey];
  setGamepadProvider(() => []);
  setGlobalSignalHandler(() => {});
}

function entity(uid: string, parentId?: string) {
  return {
    uid,
    destroy: vi.fn(),
    reset: vi.fn(),
    markRectDirty: vi.fn(),
    getConfig: () => ({ parentId }),
  } as any;
}

describe('Registry and GamepadManager', () => {
  afterEach(() => {
    resetSingletons();
    vi.restoreAllMocks();
    setRafProvider(
      (callback) => setTimeout(() => callback(Date.now()), 0),
      (handle) => clearTimeout(handle),
    );
  });

  it('indexes trees, routes signals, resets and tears down registered entities', () => {
    const root = entity('root');
    const child = entity('child', 'root');
    const grandchild = entity('grandchild', 'child');
    const receiver = { ...entity('receiver'), handleSignal: vi.fn() };
    const registry = Registry.getInstance();
    [root, child, grandchild, receiver].forEach((item) => registry.register(item));

    expect(registry.getEntitiesByRoot('root').map((item) => item.uid)).toEqual([
      'root',
      'child',
      'grandchild',
    ]);
    registry.broadcastSignal({ targetStageId: 'receiver', type: 'keydown', payload: {} });
    expect(receiver.handleSignal).toHaveBeenCalledOnce();

    const globalHandler = vi.fn();
    setGlobalSignalHandler(globalHandler);
    registry.broadcastSignal({ targetStageId: 'missing', type: 'keyup', payload: {} });
    expect(globalHandler).toHaveBeenCalledOnce();
    registry.resetAll();
    registry.markAllRectDirty();
    expect(child.reset).toHaveBeenCalledOnce();
    expect(grandchild.markRectDirty).toHaveBeenCalledOnce();

    registry.destroyByRoot('root');
    expect(grandchild.destroy.mock.invocationCallOrder[0]).toBeLessThan(
      child.destroy.mock.invocationCallOrder[0],
    );
    expect(child.destroy.mock.invocationCallOrder[0]).toBeLessThan(
      root.destroy.mock.invocationCallOrder[0],
    );
  });

  it('polls gamepad edges, d-pad and axes while ignoring entities owned by touch input', () => {
    const frames: Array<(time: number) => void> = [];
    setRafProvider(
      (callback) => {
        frames.push(callback);
        return frames.length;
      },
      () => {},
    );
    const button = {
      ...entity('button'),
      activePointerId: null,
      triggerDown: vi.fn(),
      triggerUp: vi.fn(),
    };
    const dpad = { ...entity('dpad'), activePointerId: null, triggerVector: vi.fn() };
    const left = { ...entity('left'), activePointerId: null, triggerVector: vi.fn() };
    const right = { ...entity('right'), activePointerId: 4, triggerVector: vi.fn() };
    [button, dpad, left, right].forEach((item) => Registry.getInstance().register(item));

    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    const pad = { connected: true, buttons, axes: [0.4, -0.6, 0.8, 0.1] };
    setGamepadProvider(() => [pad]);
    const manager = GamepadManager.getInstance();
    manager.setConfig([
      {
        buttons: { A: 'button' },
        dpad: 'dpad',
        leftStick: 'left',
        rightStick: 'right',
        deadzone: 0.2,
      },
    ]);
    manager.start();
    buttons[0].pressed = true;
    buttons[12].pressed = true;
    frames.shift()?.(1);
    buttons[0].pressed = false;
    frames.shift()?.(2);
    manager.stop();

    expect(button.triggerDown).toHaveBeenCalledOnce();
    expect(button.triggerUp).toHaveBeenCalledOnce();
    expect(dpad.triggerVector).toHaveBeenCalledWith(0, -1);
    expect(left.triggerVector).toHaveBeenCalledWith(0.4, -0.6);
    expect(right.triggerVector).not.toHaveBeenCalled();
    expect(manager.getConfig()).toHaveLength(1);
  });
});
