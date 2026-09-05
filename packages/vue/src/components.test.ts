import {
  ButtonCore,
  DPadCore,
  InputZoneCore,
  JoystickCore,
  Registry,
  TargetZoneCore,
  TrackpadCore,
} from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { WindowManager } from '@omnipad/web';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InputZone from './components/InputZone.vue';
import RootLayer from './components/RootLayer.vue';
import TargetZone from './components/TargetZone.vue';
import VirtualAxisBase from './components/VirtualAxisBase.vue';
import VirtualButton from './components/VirtualButton.vue';
import VirtualButtonBase from './components/VirtualButtonBase.vue';
import VirtualDPad from './components/VirtualDPad.vue';
import VirtualJoystick from './components/VirtualJoystick.vue';
import VirtualLayerBase from './components/VirtualLayerBase.vue';
import VirtualTrackpad from './components/VirtualTrackpad.vue';
import { registerComponent } from './utils/componentRegistry';

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

describe('Vue component rendering and Core integration', () => {
  it('renders the base button and axis primitives, including slots and style projection', () => {
    const button = mount(VirtualButtonBase, {
      props: { layout: { left: 10, top: 20, width: 40, height: 30 }, isActive: true, label: 'A' },
      slots: { base: '<i class="custom-base" />', default: '<b class="custom-content">C</b>' },
    });
    const axis = mount(VirtualAxisBase, {
      props: {
        layout: { width: 100, height: 80 },
        isActive: true,
        vector: { x: 1, y: -1 },
        showStick: true,
        baseSize: { x: 100, y: 80 },
      },
    });

    expect(button.classes()).toContain('omnipad-button-base');
    expect(button.find('.custom-base').exists()).toBe(true);
    expect(button.find('.custom-content').text()).toBe('C');
    expect(axis.classes()).toContain('is-active');
    expect(axis.find('.omnipad-axis-stick-container').attributes('style')).toContain(
      '--omnipad-axis-stick-container-x: 100px',
    );

    button.unmount();
    axis.unmount();
  });

  it('mounts button-like widgets, synchronizes props and exposes working dirty markers', async () => {
    const button = mount(VirtualButton, {
      props: {
        widgetId: 'vue-button',
        label: 'A',
        layout: { left: 10, top: 20, width: 50, height: 40 },
      },
    });
    const trackpad = mount(VirtualTrackpad, {
      props: { widgetId: 'vue-trackpad', label: 'PAD', layout: { width: 50, height: 30 } },
    });
    await nextTick();

    const buttonCore = Registry.getInstance().getEntity<ButtonCore>('vue-button')!;
    const trackpadCore = Registry.getInstance().getEntity<TrackpadCore>('vue-trackpad')!;
    buttonCore.setState({ isActive: true, isPressed: true });
    trackpadCore.setState({ isActive: true, isPressed: true });
    await nextTick();

    expect(button.find('.omnipad-default-button-label').text()).toBe('A');
    expect(button.find('.omnipad-default-button-base').classes()).toContain('is-active');
    expect(trackpad.find('.omnipad-default-button-base').classes()).toContain('is-active');

    const dirty = vi.spyOn(buttonCore, 'markRectDirty');
    (button.vm as unknown as { markRectDirty: () => void }).markRectDirty();
    expect(dirty).toHaveBeenCalledOnce();

    await button.setProps({ label: 'B', layout: { left: 5, top: 6, width: 20, height: 20 } });
    expect(button.find('.omnipad-default-button-label').text()).toBe('B');

    button.unmount();
    trackpad.unmount();
  });

  it('renders d-pad, joystick, and target state supplied by their Core entities', async () => {
    const dpad = mount(VirtualDPad, {
      props: { widgetId: 'vue-dpad', showStick: true, layout: { width: 80, height: 80 } },
    });
    const joystick = mount(VirtualJoystick, {
      props: { widgetId: 'vue-joystick', label: 'PUSH', layout: { width: 90, height: 90 } },
    });
    const target = mount(TargetZone, {
      props: {
        widgetId: 'vue-target',
        cursorEnabled: true,
        layout: { width: 100, height: 100 },
      },
    });
    await nextTick();

    (target.element as HTMLElement).getBoundingClientRect = () => rect(0, 0, 100, 100);
    Registry.getInstance().getEntity<TargetZoneCore>('vue-target')!.markRectDirty();
    Registry.getInstance()
      .getEntity<DPadCore>('vue-dpad')!
      .setState({
        isActive: true,
        vector: { x: 1, y: -1 },
      });
    Registry.getInstance()
      .getEntity<JoystickCore>('vue-joystick')!
      .setState({
        isActive: true,
        isPressed: true,
        vector: { x: -1, y: 1 },
      });
    Registry.getInstance()
      .getEntity<TargetZoneCore>('vue-target')!
      .setState({
        isVisible: true,
        isPointerDown: true,
        isFocusReturning: true,
        position: { x: 25, y: 75 },
      });
    await nextTick();

    expect(dpad.find('.dpad-arm.top').classes()).toContain('on');
    expect(dpad.find('.dpad-arm.right').classes()).toContain('on');
    expect(joystick.find('.omnipad-default-button-base').classes()).toContain('is-active');
    expect(target.find('.omnipad-default-focus-border-feedback').exists()).toBe(true);
    expect(target.find('.omnipad-virtual-cursor').attributes('style')).toContain(
      '--omnipad-virtual-cursor-x: 25px',
    );

    dpad.unmount();
    joystick.unmount();
    target.unmount();
  });

  it('does not let an absent Boolean prop overwrite a true tree-node configuration', async () => {
    const dpad = mount(VirtualDPad, {
      props: {
        treeNode: {
          uid: 'tree-dpad',
          type: OmniPad.Types.D_PAD,
          config: {
            baseType: OmniPad.Types.D_PAD,
            showStick: true,
            layout: { width: 80, height: 80 },
          },
        },
      },
    });
    const joystick = mount(VirtualJoystick, {
      props: {
        treeNode: {
          uid: 'tree-joystick',
          type: OmniPad.Types.JOYSTICK,
          config: {
            baseType: OmniPad.Types.JOYSTICK,
            cursorMode: true,
            layout: { width: 80, height: 80 },
          },
        },
      },
    });
    const target = mount(TargetZone, {
      props: {
        treeNode: {
          uid: 'tree-target',
          type: OmniPad.Types.TARGET_ZONE,
          config: {
            baseType: OmniPad.Types.TARGET_ZONE,
            cursorEnabled: true,
            layout: { width: 100, height: 100 },
          },
        },
      },
    });
    const zone = mount(InputZone, {
      props: {
        treeNode: {
          uid: 'tree-input-zone',
          type: OmniPad.Types.INPUT_ZONE,
          config: {
            baseType: OmniPad.Types.INPUT_ZONE,
            preventFocusLoss: true,
            layout: { width: 100, height: 100 },
          },
        },
      },
    });
    await nextTick();

    expect(dpad.find('.omnipad-axis-stick-container').exists()).toBe(true);
    expect(Registry.getInstance().getEntity<JoystickCore>('tree-joystick')!.getConfig()).toMatchObject(
      { cursorMode: true },
    );
    expect(target.find('.omnipad-virtual-cursor').exists()).toBe(true);
    expect(zone.find('.omnipad-input-zone-trigger').exists()).toBe(true);

    dpad.unmount();
    joystick.unmount();
    target.unmount();
    zone.unmount();
  });

  it('renders configured layers and dynamically forwards an InputZone interaction', async () => {
    registerComponent(OmniPad.Types.BUTTON, VirtualButton);
    const layer = mount(VirtualLayerBase, {
      props: {
        nodes: [
          {
            uid: 'unknown-child',
            type: 'not-registered',
            config: { baseType: 'not-registered' },
          },
        ],
      },
    });
    const root = mount(RootLayer, {
      props: {
        treeNode: {
          uid: 'vue-root',
          type: OmniPad.Types.ROOT_LAYER,
          config: { baseType: OmniPad.Types.ROOT_LAYER, layout: {} },
          children: [
            {
              uid: 'root-child-button',
              type: OmniPad.Types.BUTTON,
              config: { baseType: OmniPad.Types.BUTTON, layout: { width: 20, height: 20 } },
            },
          ],
        },
      },
    });
    const zone = mount(InputZone, {
      props: {
        treeNode: {
          uid: 'vue-input-zone',
          type: OmniPad.Types.INPUT_ZONE,
          config: {
            baseType: OmniPad.Types.INPUT_ZONE,
            dynamicWidgetId: 'dynamic-child-button',
            layout: { width: 200, height: 100 },
          },
          children: [
            {
              uid: 'dynamic-child-button',
              type: OmniPad.Types.BUTTON,
              config: { baseType: OmniPad.Types.BUTTON, layout: { width: 20, height: 20 } },
            },
          ],
        },
      },
    });
    await nextTick();
    await nextTick();

    expect(layer.text()).toContain('Unknown: not-registered');
    expect(root.find('#root-child-button').exists()).toBe(true);
    expect(zone.find('#dynamic-child-button').exists()).toBe(true);

    (zone.element as HTMLElement).getBoundingClientRect = () => rect(10, 20, 200, 100);
    const zoneCore = Registry.getInstance().getEntity<InputZoneCore>('vue-input-zone')!;
    const dynamicCore = Registry.getInstance().getEntity<ButtonCore>('dynamic-child-button')!;
    const dirty = vi.spyOn(dynamicCore, 'markRectDirty');
    zoneCore.onPointerDown({ pointerId: 4, clientX: 60, clientY: 45 } as PointerEvent);
    await nextTick();

    expect(dirty).toHaveBeenCalledOnce();
    expect(zone.find('.dynamic-widget-mount').attributes('style')).toContain('visibility: visible');
    dynamicCore.onPointerDown({ pointerId: 4 } as PointerEvent);
    await nextTick();
    expect(zone.find('.omnipad-default-button-base').classes()).toContain('is-active');

    layer.unmount();
    root.unmount();
    zone.unmount();
  });

  it('initializes and refreshes sticky layout when mounted through the Vue adapter', async () => {
    const target = document.createElement('canvas');
    target.id = 'vue-sticky-target';
    let targetRect = rect(100, 50, 200, 100);
    target.getBoundingClientRect = () => targetRect;
    document.body.appendChild(target);

    const button = mount(VirtualButton, {
      attachTo: document.body,
      props: {
        widgetId: 'vue-sticky-button',
        layout: {
          stickySelector: '#vue-sticky-target',
          left: 10,
          top: 20,
          width: 30,
          height: 40,
        },
      },
    });
    await nextTick();

    expect((button.element as HTMLElement).style.left).toBe('110px');
    targetRect = rect(180, 90, 200, 100);
    (
      WindowManager.getInstance() as unknown as { handleGlobalReset: () => void }
    ).handleGlobalReset();
    await nextTick();
    expect((button.element as HTMLElement).style.left).toBe('190px');

    button.unmount();
  });
});
