import { computed, defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { getCoreClass } from './utils/getCoreClasses';
import { createManualTrigger } from './utils/createManualTrigger';
import {
  getComponent,
  getComponentSafe,
  hasRegisteredComponent,
  registerComponent,
} from './utils/componentRegistry';
import { OmniPad } from '@omnipad/core/const';

describe('vue adapter utilities', () => {
  it('maintains a component registry with an unknown fallback', () => {
    const Component = defineComponent({ render: () => h('span', 'registered') });
    registerComponent('test-vue-widget', Component);

    expect(hasRegisteredComponent('test-vue-widget')).toBe(true);
    expect(getComponentSafe('test-vue-widget')).toBe(Component);
    expect(getComponentSafe('missing-vue-widget')).toBeNull();

    const unknown = mount(getComponent('missing-vue-widget'));
    expect(unknown.text()).toContain('Unknown: missing-vue-widget');
    unknown.unmount();
  });

  it('maps supported types to Core classes and rejects unsupported types', () => {
    expect(getCoreClass(OmniPad.Types.BUTTON).name).toBe('ButtonCore');
    expect(getCoreClass(OmniPad.Types.TARGET_ZONE).name).toBe('TargetZoneCore');
    expect(() => getCoreClass('not-a-widget')).toThrow('No core logic defined');
  });

  it('notifies computed consumers through the manual trigger', async () => {
    const trigger = createManualTrigger();
    let runs = 0;
    const value = computed(() => {
      trigger.depend();
      runs += 1;
      return runs;
    });
    const Host = defineComponent({
      setup: () => () => h('div', String(value.value)),
    });
    const wrapper = mount(Host);

    expect(wrapper.text()).toBe('1');
    trigger.notify();
    await nextTick();
    expect(wrapper.text()).toBe('2');
    wrapper.unmount();
  });
});
