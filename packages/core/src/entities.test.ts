import { afterEach, describe, expect, it, vi } from 'vitest';
import { ButtonCore } from './entities/ButtonCore';
import { DPadCore } from './entities/DPadCore';
import { InputZoneCore } from './entities/InputZoneCore';
import { JoystickCore } from './entities/JoystickCore';
import { RootLayerCore } from './entities/RootLayerCore';
import { TargetZoneCore } from './entities/TargetZoneCore';
import { TrackpadCore } from './entities/TrackpadCore';
import { BaseEntity } from './entities/BaseEntity';
import { CMP_TYPES } from './constants/basic';
import { setRafProvider } from './runtime/performance';
import { Registry } from './singletons/Registry';
import type {
  AbstractPointerEvent,
  AbstractRect,
  BaseConfig,
  ButtonConfig,
  DPadConfig,
  InputZoneConfig,
  JoystickConfig,
  TargetZoneConfig,
  TrackpadConfig,
} from './types';

const registryKey = Symbol.for('omnipad.registry.instance');
const rect: AbstractRect = { left: 10, top: 20, right: 110, bottom: 120, width: 100, height: 100 };

function pointer(pointerId = 1, clientX = 60, clientY = 70, button = 0): AbstractPointerEvent {
  return { pointerId, clientX, clientY, button };
}

function resetRegistry(): void {
  const registry = (globalThis as Record<PropertyKey, unknown>)[registryKey] as
    | Registry
    | undefined;
  registry?.clear();
  delete (globalThis as Record<PropertyKey, unknown>)[registryKey];
}

function registerCollector(uid = 'stage') {
  const collector = { uid, destroy: vi.fn(), handleSignal: vi.fn() } as any;
  Registry.getInstance().register(collector);
  return collector;
}

class TestEntity extends BaseEntity<BaseConfig, { count: number }> {
  public resets = 0;

  public constructor() {
    super('test-entity', 'test', { baseType: 'test', layout: {} }, { count: 0 });
  }

  public reset(): void {
    this.resets += 1;
  }
}

describe('core entities', () => {
  afterEach(() => {
    resetRegistry();
    vi.useRealTimers();
    vi.restoreAllMocks();
    setRafProvider(
      (callback) => setTimeout(() => callback(Date.now()), 0),
      (handle) => clearTimeout(handle),
    );
  });

  it('keeps base-entity configuration/state subscriptions, rect caches, and lifecycle coherent', () => {
    const entity = new TestEntity();
    const configs = vi.fn();
    const states = vi.fn();
    const dirty = vi.fn();
    const unsubscribeConfig = entity.subscribeConfig(configs);
    const unsubscribeState = entity.subscribeState(states);

    entity.updateConfig({ layout: { left: '10px' } });
    entity.setState({ count: 2 });
    entity.bindRectProvider(() => rect, dirty);
    entity.markRectDirty();
    Registry.getInstance().register(entity);
    entity.destroy();

    expect(configs).toHaveBeenLastCalledWith(expect.objectContaining({ layout: { left: '10px' } }));
    expect(states).toHaveBeenLastCalledWith({ count: 2 });
    expect(entity.rect).toEqual(rect);
    expect(dirty).toHaveBeenCalledOnce();
    expect(entity.resets).toBe(1);
    expect(Registry.getInstance().getEntity(entity.uid)).toBeUndefined();
    unsubscribeConfig();
    unsubscribeState();
  });

  it('drives button pointer and programmatic lifecycles through ActionEmitter', () => {
    const collector = registerCollector();
    const button = new ButtonCore('button', {
      baseType: CMP_TYPES.BUTTON,
      layout: {},
      targetStageId: 'stage',
      mapping: 'KeyA',
    } as ButtonConfig);

    button.onPointerDown(pointer(7));
    button.onPointerUp(pointer(8));
    expect(button.getState()).toMatchObject({ isActive: true, pointerId: 7 });
    button.onPointerUp(pointer(7));
    button.triggerDown();
    button.triggerUp();

    expect(collector.handleSignal.mock.calls.map(([signal]: any[]) => signal.type)).toEqual([
      'keydown',
      'keyup',
      'keydown',
      'keyup',
    ]);
    expect(button.getState()).toMatchObject({ isActive: false, isPressed: false, pointerId: null });
  });

  it('maps d-pad geometry and programmatic vectors to digital signals', () => {
    const collector = registerCollector();
    const dpad = new DPadCore('dpad', {
      baseType: CMP_TYPES.D_PAD,
      layout: {},
      targetStageId: 'stage',
      threshold: 0.15,
      mapping: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' },
    } as DPadConfig);
    const dirty = vi.fn();
    dpad.bindRectProvider(() => rect, dirty);

    dpad.onPointerDown(pointer(1, 100, 70));
    dpad.onPointerMove(pointer(1, 60, 20));
    dpad.onPointerUp(pointer(1));
    dpad.onPointerDown(pointer(2, 500, 500));
    dpad.triggerVector(-1, 0);

    const types = collector.handleSignal.mock.calls.map(([signal]: any[]) => signal.type);
    expect(types).toContain('keydown');
    expect(types).toContain('keyup');
    expect(dpad.getState().vector.x).toBeLessThan(0);
    expect(dirty).toHaveBeenCalledOnce();
  });

  it('moves a trackpad relatively while preserving pointer ownership', () => {
    const collector = registerCollector();
    const trackpad = new TrackpadCore('trackpad', {
      baseType: CMP_TYPES.TRACKPAD,
      layout: {},
      targetStageId: 'stage',
      mapping: 'Mouse',
      sensitivity: 2,
    } as TrackpadConfig);
    trackpad.bindRectProvider(() => rect);

    trackpad.onPointerDown(pointer(3, 20, 30));
    trackpad.onPointerMove(pointer(4, 40, 50));
    trackpad.onPointerMove(pointer(3, 40, 50));
    trackpad.onPointerCancel();

    expect(collector.handleSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mousemove',
        payload: expect.objectContaining({ delta: { x: 40, y: 40 } }),
      }),
    );
    expect(trackpad.getState()).toMatchObject({ isActive: false, pointerId: null });
  });

  it('feeds InputZone delegates and calculates dynamic widget coordinates', () => {
    const input = new InputZoneCore('input', {
      baseType: CMP_TYPES.INPUT_ZONE,
      layout: {},
      dynamicWidgetId: 'floating',
      preventFocusLoss: true,
    } as InputZoneConfig);
    const delegates = {
      dynamicWidgetPointerDown: vi.fn(),
      dynamicWidgetPointerMove: vi.fn(),
      dynamicWidgetPointerUp: vi.fn(),
      dynamicWidgetPointerCancel: vi.fn(),
    };
    Object.entries(delegates).forEach(([key, callback]) => input.bindDelegate(key, callback));
    input.bindRectProvider(() => rect);

    input.onPointerDown(pointer(9, 35, 45));
    input.onPointerMove(pointer(9, 40, 50));
    input.onPointerUp(pointer(9));
    input.onPointerCancel(pointer(9));

    expect(input.getState()).toMatchObject({
      isDynamicActive: false,
      dynamicPointerId: null,
      dynamicPosition: { x: 25, y: 25 },
    });
    expect(delegates.dynamicWidgetPointerDown).toHaveBeenCalledOnce();
    expect(delegates.dynamicWidgetPointerMove).toHaveBeenCalledOnce();
    expect(delegates.dynamicWidgetPointerUp).toHaveBeenCalledOnce();
    expect(delegates.dynamicWidgetPointerCancel).toHaveBeenCalledOnce();
    expect(input.isInterceptorRequired).toBe(true);
  });

  it('handles joystick vectors, stick clicks, and cursor-mode frame output', () => {
    const collector = registerCollector();
    const frames: Array<(time: number) => void> = [];
    setRafProvider(
      (callback) => {
        frames.push(callback);
        return frames.length;
      },
      () => {},
    );
    const joystick = new JoystickCore('joystick', {
      baseType: CMP_TYPES.JOYSTICK,
      layout: {},
      targetStageId: 'stage',
      threshold: 0.1,
      cursorMode: true,
      cursorSensitivity: 2,
      mapping: { right: 'KeyD', stick: 'Enter' },
    } as JoystickConfig);

    joystick.triggerVector(1, 0);
    frames.shift()?.(1);
    joystick.triggerDown();
    joystick.triggerUp();
    joystick.triggerVector(0, 0);

    expect(collector.handleSignal.mock.calls.map(([signal]: any[]) => signal.type)).toEqual(
      expect.arrayContaining(['keydown', 'mousemove', 'keyup']),
    );
    expect(joystick.getState()).toMatchObject({ isActive: false, isPressed: false });
  });

  it('converts TargetZone signals to keyboard, pointer, focus and cursor state operations', () => {
    vi.useFakeTimers();
    const zone = new TargetZoneCore('zone', {
      baseType: CMP_TYPES.TARGET_ZONE,
      layout: {},
      cursorEnabled: true,
      cursorAutoDelay: 50,
    } as TargetZoneConfig);
    const dispatchKeyboardEvent = vi.fn(() => true);
    const dispatchPointerEventAtPos = vi.fn(() => true);
    const reclaimFocusAtPos = vi.fn(() => true);
    zone.bindDelegate('dispatchKeyboardEvent', dispatchKeyboardEvent);
    zone.bindDelegate('dispatchPointerEventAtPos', dispatchPointerEventAtPos);
    zone.bindDelegate('reclaimFocusAtPos', reclaimFocusAtPos);
    zone.bindRectProvider(() => rect);

    zone.handleSignal({ targetStageId: 'zone', type: 'keydown', payload: { key: 'a' } });
    zone.handleSignal({
      targetStageId: 'zone',
      type: 'mousedown',
      payload: { point: { x: 50, y: 50 } },
    });
    zone.handleSignal({
      targetStageId: 'zone',
      type: 'mouseup',
      payload: { point: { x: 50, y: 50 } },
    });
    zone.handleSignal({
      targetStageId: 'zone',
      type: 'mousemove',
      payload: { delta: { x: 10, y: -10 } },
    });
    vi.runAllTimers();

    expect(dispatchKeyboardEvent).toHaveBeenCalledWith('keydown', { key: 'a' });
    expect(dispatchPointerEventAtPos).toHaveBeenCalledWith(
      'pointerdown',
      60,
      70,
      expect.objectContaining({ button: 0, buttons: 1, pressure: 0.5 }),
    );
    expect(reclaimFocusAtPos).toHaveBeenCalled();
    expect(zone.getState()).toMatchObject({ isVisible: false, isPointerDown: false });
  });

  it('exposes a resettable root-layer core with the expected identity', () => {
    const root = new RootLayerCore('root', { baseType: CMP_TYPES.ROOT_LAYER, layout: {} });
    root.reset();
    expect(root.type).toBe(CMP_TYPES.ROOT_LAYER);
    expect(root.getState()).toEqual({ isHighlighted: false });
  });
});
