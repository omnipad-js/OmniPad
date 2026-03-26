import { ref, onMounted, onUnmounted, shallowRef, ComputedRef, readonly, watch } from 'vue';
import {
  IConfigurable,
  IResettable,
  ElementObserver,
  Registry,
  WindowManager,
  type AnyFunction,
  type BaseConfig,
  type ICoreEntity,
  type IDependencyBindable,
  type IPointerHandler,
  type ISpatial,
  type LayoutBox,
} from '@omnipad/core';
import { createCachedProvider, createPointerBridge, getObjectDiff } from '@omnipad/core/utils';

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
  const uid = instance.uid;

  const core = shallowRef<T>();
  const state = ref<S>();
  const effectiveConfig = ref<C>();
  const effectiveLayout = ref<LayoutBox>();
  const elementRef = ref<any>(null);

  // 统一处理状态和配置订阅
  const syncState = (newState: S) => {
    state.value = newState;
  };
  const syncConfig = (newConfig: C) => {
    effectiveConfig.value = newConfig;

    // 更新实际 LayoutBox
    if (effectiveConfig.value) {
      effectiveLayout.value = effectiveConfig.value?.layout;
    }
  };

  const bindDelegates = (delegates: Record<string, AnyFunction>) => {
    if (!core.value) return;

    const bindable = core.value as unknown as IDependencyBindable;
    if (typeof bindable.bindDelegate === 'function') {
      Object.entries(delegates).forEach(([key, fn]) => {
        bindable.bindDelegate(key, fn);
      });
    }
  };

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
        (core.value as unknown as IConfigurable<C>).updateConfig(diff as unknown as C);
      }

      // 3. 更新快照，为下一次对比做准备
      lastExternalConfig = { ...externalConfig.value };
    },
    { deep: true },
  );

  onMounted(() => {
    core.value = instance;

    // 注册到全局单例
    Registry.getInstance().register(instance);

    // 订阅逻辑层状态与配置变化
    if ('subscribeState' in instance) {
      (instance as any).subscribeState(syncState);
    }
    if ('subscribeConfig' in instance) {
      (instance as any).subscribeConfig(syncConfig);
    }

    // 初始时绑定的依赖方法
    if (initialDelegates) {
      bindDelegates(initialDelegates);
    }

    // 提取真实的 DOM 元素
    let domEl: Element | null = null;

    if (elementRef.value) {
      if (elementRef.value instanceof Element) {
        // 场景 A: ref 绑定在原生 HTML 标签上 (如 <div>)
        domEl = elementRef.value;
      } else if (elementRef.value.$el instanceof Element) {
        // 场景 B: ref 绑定在 Vue 组件上
        // 组件的根 DOM 节点存储在 .$el 属性中
        domEl = elementRef.value.$el;
      }
    }

    // 尺寸监听 (ISpatial 接口对接)
    if (domEl instanceof Element) {
      const observer = ElementObserver.getInstance();

      if ('bindRectProvider' in instance) {
        const spatialCore = instance as unknown as ISpatial;

        // A. 创建缓存闭包
        const cached = createCachedProvider(() => {
          const r = domEl!.getBoundingClientRect();
          return r;
        });

        // B. 注入逻辑层
        // 传入获取方法 cached.get 和 适配层清理缓存的方法 cached.markDirty
        spatialCore.bindRectProvider(cached.get, cached.markDirty);

        // C. 监听“自身”尺寸变化 (RO)
        observer.observeResize(uid, domEl, () => {
          spatialCore.markRectDirty();
        });
      }

      // 注册可见性观察 (IO)
      observer.observeIntersect(uid, domEl, (isVisible) => {
        if (!isVisible) {
          (instance as unknown as IResettable).reset();
        }
      });
    }

    // 只要有任何一个组件被挂载到页面上，自动启动全局视口监听
    // 内部的 _isListening 会保证它只绑定一次原生事件
    WindowManager.getInstance().init();
  });

  onUnmounted(() => {
    // 销毁观察器防止内存泄漏
    ElementObserver.getInstance().disconnect(uid);
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
    core: readonly(core),
    state: readonly(state),
    domEvents,
    effectiveConfig: readonly(effectiveConfig),
    effectiveLayout: readonly(effectiveLayout),
    elementRef,
    bindDelegates,
  };
}
