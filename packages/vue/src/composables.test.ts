import { ButtonCore, type ButtonConfig, Registry } from '@omnipad/core';
import { OmniPad } from '@omnipad/core/const';
import { WindowManager } from '@omnipad/web';
import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { useCoreEntity } from './composables/useCoreEntity';
import { useSpatialObserver } from './composables/useSpatialObserver';
import { useStickyLayout } from './composables/useStickyLayout';
import { useWidgetConfig } from './composables/useWidgetConfig';

const buttonConfig = (id: string): ButtonConfig => ({
  id,
  baseType: OmniPad.Types.BUTTON,
  layout: { width: 10, height: 10 },
  label: 'initial',
});

afterEach(() => {
  document.body.replaceChildren();
  Registry.getInstance().clear();
  WindowManager.getInstance().destroy();
});

describe('vue composables', () => {
  it('merges widget configuration and reacts to prop updates', async () => {
    let result: ReturnType<typeof useWidgetConfig<ButtonConfig>> | undefined;
    const Host = defineComponent({
      props: ['widgetId', 'label', 'layout', 'treeNode', 'parentId'],
      setup(props) {
        result = useWidgetConfig<ButtonConfig>(OmniPad.Types.BUTTON, props, {
          label: 'default',
          layout: { height: 30, left: 1 },
        });
        return () => h('div');
      },
    });
    const wrapper = mount(Host, {
      props: {
        widgetId: 'vue-config-button',
        label: 'option',
        layout: { width: 50 },
        treeNode: {
          uid: 'tree-button',
          type: 'custom-button',
          config: {
            baseType: OmniPad.Types.BUTTON,
            parentId: 'tree-parent',
            label: 'tree',
            layout: { left: 10 },
          },
        },
      },
    });

    expect(result?.uid.value).toBe('vue-config-button');
    expect(result?.initialConfig.value).toMatchObject({
      id: 'vue-config-button',
      baseType: OmniPad.Types.BUTTON,
      parentId: 'tree-parent',
      label: 'option',
      layout: { left: 10, width: 50, height: 30 },
    });

    await wrapper.setProps({ label: 'changed', layout: { top: 20 } });
    expect(result?.reactiveConfig.value).toMatchObject({
      label: 'changed',
      parentId: 'tree-parent',
      layout: { top: 20 },
    });
    wrapper.unmount();
  });

  it('registers, synchronizes, and destroys Core entities across the Vue lifecycle', async () => {
    const external = ref<Partial<ButtonConfig>>({ label: 'first', layout: { width: 10 } });
    let result: ReturnType<typeof useCoreEntity<ButtonCore, unknown, ButtonConfig>> | undefined;
    const Host = defineComponent({
      setup() {
        result = useCoreEntity<ButtonCore, unknown, ButtonConfig>(
          () => new ButtonCore('vue-core-entity', buttonConfig('vue-core-entity')),
          computed(() => external.value),
        );
        return () => h('button', { ref: result?.elementRef });
      },
    });
    const wrapper = mount(Host);
    await nextTick();

    const core = result?.core.value;
    expect(Registry.getInstance().getEntity('vue-core-entity')).toBe(core);
    expect(result?.state.value).toMatchObject({ isPressed: false });
    expect(result?.domEvents.onPointerDown).toBeTypeOf('function');

    external.value = { label: 'second', layout: { width: 24 } };
    await nextTick();
    expect(core?.getConfig()).toMatchObject({ label: 'second', layout: { width: 24 } });

    wrapper.unmount();
    expect(Registry.getInstance().getEntity('vue-core-entity')).toBeUndefined();
  });

  it('binds spatial and sticky observers to their DOM/Core owners', async () => {
    const target = document.createElement('div');
    target.id = 'sticky-hook-target';
    target.getBoundingClientRect = () =>
      ({ left: 30, top: 40, right: 130, bottom: 90, width: 100, height: 50 }) as DOMRect;
    document.body.appendChild(target);

    const core = new ButtonCore('sticky-hook-core', {
      ...buttonConfig('sticky-hook-core'),
      layout: { stickySelector: '#sticky-hook-target', left: 10, top: 5, width: 20, height: 20 },
    });
    const config: Ref<ButtonConfig> = ref(core.getConfig() as ButtonConfig);
    let sticky: ReturnType<typeof useStickyLayout<ButtonConfig>> | undefined;
    const Host = defineComponent({
      setup() {
        const element = ref<HTMLElement | null>(null);
        sticky = useStickyLayout(
          computed(() => core),
          config,
          () => undefined,
        );
        useSpatialObserver(
          computed(() => core),
          element,
        );
        return () => h('div', { ref: element });
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    await nextTick();

    expect(sticky?.stickyProvider.value?.getRect()).toMatchObject({ left: 30, top: 40 });
    config.value = { ...config.value, layout: { width: 10, height: 10 } };
    await nextTick();
    expect(sticky?.stickyProvider.value).toBeNull();

    wrapper.unmount();
    core.destroy();
  });
});
