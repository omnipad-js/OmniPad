import { GamepadManager, Registry } from '@omnipad/core';
import { WindowManager } from '@omnipad/web';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppBackup from './App.bak.vue';
import App from './App.vue';
import ConfigConsole from './components/ConfigConsole.vue';
import CustomTrackpad from './components/CustomTrackpad.ts';
import CustomTrackpadVue from './components/CustomTrackpad.vue';
import DemoIntro from './components/DemoIntro.vue';
import HelloWorld from './components/HelloWorld.vue';
import IFramePlayer from './components/IFramePlayer.vue';
import RufflePlayer from './components/RufflePlayer.vue';

afterEach(() => {
  document.body.replaceChildren();
  Registry.getInstance().clear();
  GamepadManager.getInstance().stop();
  WindowManager.getInstance().destroy();
  vi.restoreAllMocks();
  delete (window as unknown as { RufflePlayer?: unknown }).RufflePlayer;
});

describe('Playground components', () => {
  it('edits, selects, loads, saves, and closes JSON profiles in the config console', async () => {
    const wrapper = mount(ConfigConsole, { props: { modelValue: '{"first":true}' } });
    const textarea = wrapper.find('textarea');

    await textarea.setValue('{"second":true}');
    await wrapper.find('.load-btn').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['{"second":true}']);
    expect(wrapper.emitted('load')).toHaveLength(1);

    await wrapper.find('select').setValue('01-button');
    expect((textarea.element as HTMLTextAreaElement).value).toContain('01-button');
    expect(wrapper.emitted('load')).toHaveLength(2);

    await wrapper.find('input[value="$left-pad"]').setValue(true);
    await wrapper.find('.save-btn').trigger('click');
    expect(wrapper.emitted('save')?.at(-1)).toEqual([['$left-pad']]);

    await wrapper.setProps({ modelValue: '{"external":true}' });
    expect((textarea.element as HTMLTextAreaElement).value).toBe('{"external":true}');
    await wrapper.find('.close-btn').trigger('click');
    expect(wrapper.emitted('close')?.at(-1)).toEqual([['$left-pad']]);
    wrapper.unmount();
  });

  it('renders static introduction/demo content and the Vite starter counter', async () => {
    const intro = mount(DemoIntro);
    const hello = mount(HelloWorld, { props: { msg: 'Hello OmniPad' } });

    expect(intro.text()).toContain('Welcome to OmniPad');
    expect(intro.text()).toContain('Cross-Frame IPC');
    expect(hello.find('h1').text()).toBe('Hello OmniPad');
    await hello.find('button').trigger('click');
    expect(hello.text()).toContain('count is 1');

    intro.unmount();
    hello.unmount();
  });

  it('loads an SWF URL into the guest iframe when the prop changes or it finishes loading', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const wrapper = mount(IFramePlayer, {
      props: { swfUrl: null, guestUrl: 'https://guest.example/guest.html' },
    });
    const iframe = wrapper.find('iframe');
    const postMessage = vi.fn();
    Object.defineProperty(iframe.element, 'contentWindow', {
      configurable: true,
      value: { postMessage },
    });

    expect(wrapper.findComponent(DemoIntro).exists()).toBe(true);
    await wrapper.setProps({ swfUrl: 'blob:demo.swf' });
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'BUSINESS_LOAD_SWF', url: 'blob:demo.swf' },
      window.location.origin,
    );
    await iframe.trigger('load');
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(iframe.attributes('src')).toBe('https://guest.example/guest.html');
    expect(wrapper.findComponent(DemoIntro).exists()).toBe(false);

    log.mockRestore();
    wrapper.unmount();
  });

  it('creates the Ruffle player, loads its initial SWF, and reacts to a replacement URL', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const player = document.createElement('div') as HTMLDivElement & {
      load: ReturnType<typeof vi.fn>;
    };
    player.load = vi.fn();
    const createPlayer = vi.fn(() => player);
    (window as unknown as { RufflePlayer: unknown }).RufflePlayer = {
      newest: () => ({ createPlayer }),
    };

    const wrapper = mount(RufflePlayer, {
      props: {
        swfUrl: 'first.swf',
        widgetId: 'ruffle-target',
        cursorEnabled: true,
        layout: { width: 100, height: 100 },
      },
    });
    await nextTick();

    expect(createPlayer).toHaveBeenCalledOnce();
    expect(wrapper.find('.player-overlay').element.contains(player)).toBe(true);
    expect(player.load).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'first.swf', allowScriptAccess: true }),
    );

    await wrapper.setProps({ swfUrl: 'second.swf' });
    expect(player.load).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'second.swf' }));

    log.mockRestore();
    wrapper.unmount();
  });

  it('uses the custom Trackpad renderers in both Vanilla and Vue deployments', async () => {
    const host = document.createElement('div');
    const vanilla = new CustomTrackpad(host, {
      widgetId: 'custom-vanilla-trackpad',
      label: 'VANILLA',
      layout: { width: 80, height: 40 },
    });
    vanilla.core.setState({ isActive: true, isPressed: true });

    expect(vanilla.el.classList.contains('fancy-tp')).toBe(true);
    expect(vanilla.el.querySelector('.glow-box')?.classList.contains('is-active')).toBe(true);
    expect(vanilla.el.querySelector('.custom-label')?.textContent).toBe('VANILLA');

    const vue = mount(CustomTrackpadVue, {
      props: {
        widgetId: 'custom-vue-trackpad',
        label: 'VUE',
        layout: { width: 80, height: 40 },
      },
    });
    await nextTick();
    expect(vue.find('.omnipad-trackpad').classes()).toContain('fancy-tp');
    expect(vue.find('.glow-box').exists()).toBe(true);
    expect(vue.find('.custom-label').text()).toBe('VUE');

    vanilla.destroy();
    vue.unmount();
  });

  it('mounts both current and legacy playground shells and toggles their config consoles', async () => {
    const current = mount(App);
    const backup = mount(AppBackup);
    const configButton = current.findAll('button').find((button) => button.text() === 'Config')!;
    const backupConfigButton = backup
      .findAll('button')
      .find((button) => button.text() === 'Config')!;

    expect(current.find('.playground-root').exists()).toBe(true);
    expect(backup.find('.playground-root').exists()).toBe(true);
    await configButton.trigger('pointerdown');
    await backupConfigButton.trigger('pointerdown');
    expect((current.find('.config-console').element as HTMLElement).style.display).not.toBe('none');
    expect((backup.find('.config-console').element as HTMLElement).style.display).not.toBe('none');

    current.unmount();
    backup.unmount();
  });
});
