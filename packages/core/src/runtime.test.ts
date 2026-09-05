import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionEmitter } from './runtime/action';
import {
  bindEntityDelegates,
  filterNotDynamicChildren,
  getOverrideProps,
  mergeWidgetConfig,
  resolveDynamicWidget,
  validateWidgetNode,
} from './runtime/adapter';
import { getDispatcher, setDispatcherProvider } from './runtime/dispatch';
import { SimpleEmitter } from './runtime/emitter';
import { GestureRecognizer } from './runtime/gesture';
import {
  createRafThrottler,
  createTicker,
  delayFrames,
  setRafProvider,
} from './runtime/performance';
import { Registry, setGlobalSignalHandler } from './singletons/Registry';
import { CMP_TYPES } from './constants/basic';

const registryKey = Symbol.for('omnipad.registry.instance');

function resetRegistry(): void {
  const registry = (globalThis as Record<PropertyKey, unknown>)[registryKey] as
    | Registry
    | undefined;
  registry?.clear();
  delete (globalThis as Record<PropertyKey, unknown>)[registryKey];
  setGlobalSignalHandler(() => {});
}

describe('core runtime services', () => {
  afterEach(() => {
    resetRegistry();
    vi.useRealTimers();
    vi.restoreAllMocks();
    setRafProvider(
      (callback) => setTimeout(() => callback(Date.now()), 0),
      (handle) => clearTimeout(handle),
    );
  });

  it('isolates failing emitter listeners and honours unsubscribe and clear', () => {
    const emitter = new SimpleEmitter<number>();
    const healthy = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unsubscribe = emitter.subscribe(healthy);
    emitter.subscribe(() => {
      throw new Error('subscriber failure');
    });

    emitter.emit(1);
    expect(healthy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledOnce();

    unsubscribe();
    emitter.clear();
    emitter.emit(2);
    expect(healthy).toHaveBeenCalledOnce();
  });

  it('throttles work to one frame, ticks repeatedly, and waits for requested frames', async () => {
    const frames: Array<(time: number) => void> = [];
    const cancelled = vi.fn();
    setRafProvider((callback) => {
      frames.push(callback);
      return frames.length;
    }, cancelled);

    const callback = vi.fn();
    const throttled = createRafThrottler<string>(callback);
    throttled('first');
    throttled('latest');
    expect(frames).toHaveLength(1);
    frames.shift()?.(42);
    expect(callback).toHaveBeenCalledWith('latest', 42);

    const tick = vi.fn();
    const ticker = createTicker(tick);
    ticker.start();
    expect(tick).toHaveBeenCalledOnce();
    frames.shift()?.(43);
    expect(tick).toHaveBeenCalledTimes(2);
    ticker.stop();
    expect(cancelled).toHaveBeenCalledOnce();
    frames.splice(0);

    const delayed = delayFrames(2);
    frames.shift()?.(44);
    frames.shift()?.(45);
    await expect(delayed).resolves.toBeUndefined();
  });

  it('recognises taps, double-taps, drag holds, and movement cancellation', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000));
    const onTap = vi.fn();
    const onDoubleTap = vi.fn();
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const gesture = new GestureRecognizer({
      onTap,
      onDoubleTap,
      onDoubleTapHoldStart: onHoldStart,
      onDoubleTapHoldEnd: onHoldEnd,
    });

    gesture.onPointerDown(0, 0);
    vi.setSystemTime(new Date(1_050));
    gesture.onPointerUp();
    expect(onTap).toHaveBeenCalledOnce();

    vi.setSystemTime(new Date(1_100));
    gesture.onPointerDown(0, 0);
    vi.setSystemTime(new Date(1_150));
    gesture.onPointerUp();
    expect(onDoubleTap).toHaveBeenCalledOnce();
    expect(onTap).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date(2_000));
    gesture.onPointerDown(0, 0);
    gesture.onPointerMove(20, 0);
    vi.setSystemTime(new Date(2_050));
    gesture.onPointerUp();
    expect(onTap).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date(3_000));
    gesture.onPointerDown(0, 0);
    vi.setSystemTime(new Date(3_050));
    gesture.onPointerUp();
    vi.setSystemTime(new Date(3_100));
    gesture.onPointerDown(0, 0);
    vi.advanceTimersByTime(250);
    expect(onHoldStart).toHaveBeenCalledOnce();
    vi.setSystemTime(new Date(3_400));
    gesture.onPointerUp();
    expect(onHoldEnd).toHaveBeenCalledOnce();

    gesture.onPointerDown(0, 0);
    gesture.reset();
    expect(gesture.hasMoved).toBe(false);
  });

  it('merges adapter configuration and validates delegate, node, and dynamic-child behaviour', () => {
    const bindDelegate = vi.fn();
    bindEntityDelegates({ bindDelegate }, { valid: vi.fn(), ignored: 'nope' as any });
    expect(bindDelegate).toHaveBeenCalledOnce();
    expect(filterNotDynamicChildren([{ uid: 'a' }, { uid: 'b' }] as any, 'a')).toEqual([
      { uid: 'b' },
    ]);
    expect(getOverrideProps({ keep: 1, remove: undefined, skip: 2 }, new Set(['skip']))).toEqual({
      keep: 1,
    });
    expect(
      mergeWidgetConfig<any>(
        CMP_TYPES.BUTTON,
        'button-1',
        'parent-1',
        { layout: { left: '1%', top: '2%' }, label: 'default' },
        { layout: { top: '3%' }, label: 'tree' },
        { layout: { width: '20%' }, label: 'override' },
      ),
    ).toMatchObject({
      id: 'button-1',
      baseType: CMP_TYPES.BUTTON,
      parentId: 'parent-1',
      label: 'override',
      layout: { left: '1%', top: '3%', width: '20%' },
    });

    const node = {
      uid: 'x',
      type: CMP_TYPES.BUTTON,
      config: { baseType: CMP_TYPES.BUTTON },
    } as any;
    expect(validateWidgetNode(node, CMP_TYPES.BUTTON)).toBe(node);
    expect(
      validateWidgetNode({ uid: 'x', type: 'other', config: {} } as any, CMP_TYPES.BUTTON),
    ).toBeUndefined();
    expect(resolveDynamicWidget(['slot'], [node], 'x')).toEqual({
      nodeToRender: 'slot',
      isFromSlot: true,
    });
    expect(resolveDynamicWidget([], [node], 'x')).toEqual({
      nodeToRender: node,
      isFromSlot: false,
    });
  });

  it('injects dispatch providers and turns action mappings into lifecycle-safe signals', async () => {
    const dispatcher = {
      dispatchKeyboard: vi.fn(() => true),
      dispatchPointerAtPos: vi.fn(() => true),
      reclaimFocus: vi.fn(() => true),
    };
    setDispatcherProvider(dispatcher);
    expect(getDispatcher()).toBe(dispatcher);

    const receiver = {
      uid: 'target',
      destroy: vi.fn(),
      handleSignal: vi.fn(),
    } as any;
    Registry.getInstance().register(receiver);

    const keyboard = new ActionEmitter('target', 'Space');
    keyboard.press();
    keyboard.press();
    keyboard.release();
    expect(receiver.handleSignal).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'keydown',
        payload: expect.objectContaining({ code: 'Space' }),
      }),
    );
    expect(receiver.handleSignal).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'keyup' }),
    );

    const mouse = new ActionEmitter('target', {
      type: 'mouse',
      button: 9 as any,
      fixedPoint: { x: 20, y: 30 },
    });
    mouse.press();
    mouse.move({ delta: { x: 1, y: -2 } });
    mouse.release();
    expect(receiver.handleSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mousedown',
        payload: expect.objectContaining({ button: 0 }),
      }),
    );
    expect(receiver.handleSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mousemove',
        payload: expect.objectContaining({ delta: { x: 1, y: -2 } }),
      }),
    );
    expect(receiver.handleSignal).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }));

    const frames: Array<(time: number) => void> = [];
    setRafProvider(
      (callback) => {
        frames.push(callback);
        return frames.length;
      },
      () => {},
    );
    const tap = new ActionEmitter('target', 'Enter');
    const pendingTap = tap.tap(false);
    frames.shift()?.(1);
    frames.shift()?.(2);
    await pendingTap;
    expect(receiver.handleSignal).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'keydown' }),
    );
    expect(receiver.handleSignal).toHaveBeenCalledWith(expect.objectContaining({ type: 'keyup' }));
  });

  it('uses the global signal handler when no action target exists', () => {
    const globalHandler = vi.fn();
    setGlobalSignalHandler(globalHandler);

    const emitter = new ActionEmitter('missing', 'KeyA');
    emitter.press();

    expect(globalHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        targetStageId: '',
        type: 'keydown',
        payload: expect.objectContaining({ key: 'a' }),
      }),
    );
  });
});
