import { Registry } from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { WindowManager } from '@omnipad/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VirtualButton } from './button';
import { registerComponent } from './component-registry';
import { VirtualDPad } from './dpad';
import { InputZone } from './input-zone';
import { VirtualJoystick } from './joystick';
import { RootLayer } from './root-layer';
import { TargetZone } from './target-zone';
import { VirtualTrackpad } from './trackpad';

const rect = (left: number, top: number, width: number, height: number) =>
  ({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  }) as DOMRect;

afterEach(() => {
  document.body.replaceChildren();
  Registry.getInstance().clear();
  WindowManager.getInstance().destroy();
});

describe('vanilla widgets', () => {
  it('mounts button-like controls and reflects direct Core state changes', () => {
    const host = document.createElement('div');
    const button = new VirtualButton(host, {
      widgetId: 'button-one',
      label: 'A',
      cssClass: 'custom-button',
      layout: { left: 10, top: 20, width: 50, height: 40 },
    });
    const trackpad = new VirtualTrackpad(host, {
      widgetId: 'trackpad-one',
      label: 'PAD',
      layout: { left: 1, top: 2, width: 60, height: 30 },
    });

    expect(host.querySelector('#button-one')).toBe(button.el);
    expect(button.el.classList.contains('custom-button')).toBe(true);
    expect(button.el.querySelector('.omnipad-default-button-label')?.textContent).toBe('A');
    expect(trackpad.el.querySelector('.omnipad-default-button-label')?.textContent).toBe('PAD');

    button.core.onPointerDown({ pointerId: 7 } as PointerEvent);
    expect(
      button.el.querySelector('.omnipad-default-button-base')?.classList.contains('is-active'),
    ).toBe(true);
    button.core.onPointerUp({ pointerId: 7 } as PointerEvent);
    expect(
      button.el.querySelector('.omnipad-default-button-base')?.classList.contains('is-active'),
    ).toBe(false);

    button.destroy();
    trackpad.destroy();
    expect(host.childElementCount).toBe(0);
  });

  it('renders axis, target, and layered widgets from their Core state', () => {
    registerComponent(OmniPad.Types.BUTTON, VirtualButton);
    const host = document.createElement('div');
    const dpad = new VirtualDPad(host, {
      widgetId: 'dpad-one',
      showStick: true,
      layout: { width: 80, height: 80 },
    });
    const joystick = new VirtualJoystick(host, {
      widgetId: 'joystick-one',
      label: 'PUSH',
      layout: { width: 90, height: 90 },
    });
    const target = new TargetZone(host, {
      widgetId: 'target-one',
      cursorEnabled: true,
      layout: { width: 100, height: 100 },
    });
    const root = new RootLayer(host, {
      widgetId: 'root-one',
      children: [
        {
          uid: 'child-button',
          type: OmniPad.Types.BUTTON,
          config: { baseType: OmniPad.Types.BUTTON, layout: { width: 20, height: 20 } },
        },
      ],
    });

    target.el.getBoundingClientRect = () => rect(0, 0, 100, 100);

    dpad.core.setState({ isActive: true, vector: { x: 1, y: -1 } });
    joystick.core.setState({ isActive: true, isPressed: true, vector: { x: -1, y: 1 } });
    target.core.setState({
      isVisible: true,
      isPointerDown: true,
      isFocusReturning: true,
      position: { x: 25, y: 75 },
    });

    expect(dpad.el.querySelector('.dpad-arm.top')?.classList.contains('on')).toBe(true);
    expect(dpad.el.querySelector('.dpad-arm.right')?.classList.contains('on')).toBe(true);
    expect(
      joystick.el.querySelector('.omnipad-default-button-base')?.classList.contains('is-active'),
    ).toBe(true);
    expect(target.el.querySelector('.omnipad-virtual-cursor')?.getAttribute('style')).toContain(
      '--omnipad-virtual-cursor-x: 25px',
    );
    expect(target.el.querySelector('.omnipad-default-focus-border-feedback')).not.toBeNull();
    expect(root.el.querySelector('#child-button')).not.toBeNull();

    dpad.destroy();
    joystick.destroy();
    target.destroy();
    root.destroy();
  });

  it('wires an InputZone dynamic widget and cleans it up', () => {
    const host = document.createElement('div');
    const dynamicEl = document.createElement('div');
    const dynamic = {
      uid: 'dynamic-control',
      el: dynamicEl,
      destroy: vi.fn(() => dynamicEl.remove()),
      markRectDirty: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerCancel: vi.fn(),
    };
    const zone = new InputZone(host, {
      widgetId: 'input-zone',
      layout: { width: 200, height: 100 },
      dynamicWidget: (mount) => {
        mount.appendChild(dynamicEl);
        return dynamic;
      },
    });
    zone.el.getBoundingClientRect = () => rect(10, 20, 200, 100);

    zone.core.onPointerDown({ pointerId: 2, clientX: 60, clientY: 45 } as PointerEvent);
    zone.core.onPointerMove({ pointerId: 2 } as PointerEvent);
    zone.core.onPointerUp({ pointerId: 2 } as PointerEvent);

    expect(dynamic.markRectDirty).toHaveBeenCalledOnce();
    expect(dynamic.onPointerDown).toHaveBeenCalledOnce();
    expect(dynamic.onPointerMove).toHaveBeenCalledOnce();
    expect(dynamic.onPointerUp).toHaveBeenCalledOnce();
    expect(
      (zone.el.querySelector('.dynamic-widget-mount') as HTMLElement | null)?.style.visibility,
    ).toBe('hidden');

    zone.destroy();
    expect(dynamic.destroy).toHaveBeenCalledOnce();
  });

  it('applies standalone sticky layout immediately and refreshes it after a global geometry reset', () => {
    const target = document.createElement('canvas');
    target.id = 'sticky-target';
    let targetRect = rect(100, 50, 200, 100);
    target.getBoundingClientRect = () => targetRect;
    document.body.appendChild(target);

    const host = document.createElement('div');
    document.body.appendChild(host);
    const button = new VirtualButton(host, {
      widgetId: 'sticky-button',
      layout: {
        stickySelector: '#sticky-target',
        left: 10,
        top: 20,
        width: 30,
        height: 40,
      },
    });

    expect(button.el.style.position).toBe('fixed');
    expect(button.el.style.left).toBe('110px');
    expect(button.el.style.top).toBe('70px');

    targetRect = rect(180, 90, 200, 100);
    (
      WindowManager.getInstance() as unknown as { handleGlobalReset: () => void }
    ).handleGlobalReset();

    expect(button.el.style.left).toBe('190px');
    expect(button.el.style.top).toBe('110px');
    button.destroy();
  });
});
