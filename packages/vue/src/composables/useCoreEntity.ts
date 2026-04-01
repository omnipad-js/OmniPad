import { ref, onMounted, onUnmounted, ComputedRef, readonly, watch, computed } from 'vue';
import {
  bindEntityDelegates,
  Registry,
  type AnyFunction,
  type BaseConfig,
  type IConfigurable,
  type ICoreEntity,
  type IPointerHandler,
  type IStateful,
} from '@omnipad/core';
import { getObjectDiff } from '@omnipad/core/utils';
import { WindowManager, createPointerBridge } from '@omnipad/core/dom';

/**
 * Bridges a Vue component with its corresponding Headless Core logic entity.
 *
 * @template T - The Core class type (e.g., JoystickCore).
 * @template S - The State interface type (e.g., JoystickState).
 * @param createCore - A factory function that returns a new instance of the Core class.
 * @param domEventOptions - Options for Pointer Event bridge.
 * @param initialDelegates - Optional registry of callbacks to inject into the core at startup.
 * @returns Ref objects for the core instance, reactive state, DOM element, and bridge helpers.
 */
export function useCoreEntity<T extends ICoreEntity, S, C extends BaseConfig>(
  createCore: () => T,
  externalConfig: ComputedRef<Partial<C>>,
  domEventOptions: Record<string, any> = {},
  initialDelegates?: Record<string, AnyFunction>,
) {
  const instance = createCore();

  const core = computed<T>(() => instance);
  const state = ref<S>();
  const effectiveConfig = ref<C>();
  const elementRef = ref<any>(null);

  // 监听外部 Props 配置变化
  let lastExternalConfig = { ...externalConfig.value };
  watch(
    externalConfig,
    (newVal) => {
      if (!core.value) return;

      // 1. 找出到底是哪些属性在 Vue 层变了（增量更新）
      const diff = getObjectDiff(lastExternalConfig, newVal);

      if (Object.keys(diff).length > 0) {
        // 2. 只把变动的部分推送给 Core
        (core.value as unknown as IConfigurable<C>).updateConfig(diff as C);
      }

      // 3. 更新快照，为下一次对比做准备
      lastExternalConfig = { ...externalConfig.value };
    },
    { deep: true },
  );

  // 运行时注入依赖的入口函数
  const bindDelegates = (delegates: Record<string, AnyFunction>) => {
    bindEntityDelegates(core.value, delegates);
  };

  onMounted(() => {
    // 注册到全局单例
    Registry.getInstance().register(instance);

    // 订阅逻辑层状态与配置变化
    if ('subscribeState' in instance) {
      (instance as unknown as IStateful<S>).subscribeState(
        (newState: S) => (state.value = newState),
      );
    }
    if ('subscribeConfig' in instance) {
      (instance as unknown as IConfigurable<C>).subscribeConfig(
        (newConfig: C) => (effectiveConfig.value = newConfig),
      );
    }

    // 初始时绑定的依赖方法
    if (initialDelegates) {
      bindDelegates(initialDelegates);
    }

    // 只要有任何一个组件被挂载到页面上，自动启动全局视口监听
    // 内部的 _isListening 会保证它只绑定一次原生事件
    WindowManager.getInstance().init();
  });

  onUnmounted(() => {
    // 销毁 Core
    if (core.value) {
      core.value.destroy(); // 内部会处理 Registry.unregister
    }
  });

  // 自动生成标准化 DOM 事件，在组件层根据需要绑定
  const domEvents: Record<string, any> =
    'onPointerDown' in instance
      ? createPointerBridge(instance as unknown as IPointerHandler, domEventOptions)
      : {};

  return {
    core,
    state: readonly(state),
    domEvents,
    effectiveConfig: readonly(effectiveConfig),
    elementRef,
    bindDelegates,
  };
}
