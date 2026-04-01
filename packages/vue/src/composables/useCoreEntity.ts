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
  type LayoutBox,
} from '@omnipad/core';
import { getObjectDiff } from '@omnipad/core/utils';
import { WindowManager, createPointerBridge, flattenToHostLayout } from '@omnipad/core/dom';
import { useStickyLayout } from './useStickyLayout';
import { createManualTrigger } from '../utils/createManualTrigger';
import { useSpatialObserver } from './useSpatialObserver';

/**
 * Bridges a Vue component with its corresponding Headless Core logic entity.
 *
 * This hook automates:
 * 1. Core instantiation and global registration.
 * 2. State synchronization between Core and Vue's reactivity system.
 * 3. Spatial rect reporting for precise coordinate mapping.
 * 4. Standardized Pointer Event bridging (PointerCapture, stopping propagation, etc).
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

  // 存储吸附目标的物理信息提供者 / Stores the physical information provider for the sticky target
  const layoutUpdateTicker = createManualTrigger();

  // 集成吸附模式模块
  const { stickyProvider } = useStickyLayout(
    core as any,
    effectiveConfig as any,
    layoutUpdateTicker.notify,
  );

  // 集成空间观察模块
  useSpatialObserver(core as any, elementRef, stickyProvider);

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

  // 根据有效配置的布局设定计算获得最终有效的布局
  const effectiveLayout = computed<LayoutBox>(() => {
    const rawLayout = effectiveConfig.value?.layout as LayoutBox;

    // 如果没有配置吸附，直接返回
    if (!stickyProvider.value || !layoutUpdateTicker.depend()) return rawLayout;

    // 执行换算，将相对于吸附目标元素的布局拍平成相对共同父级（视口）的布局
    const targetRect = stickyProvider.value.getRect();
    return targetRect ? flattenToHostLayout(rawLayout, targetRect) : rawLayout;
  });

  return {
    core,
    state: readonly(state),
    domEvents,
    effectiveConfig: readonly(effectiveConfig),
    effectiveLayout,
    elementRef,
    bindDelegates,
  };
}
