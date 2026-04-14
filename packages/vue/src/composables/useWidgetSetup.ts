import { computed } from 'vue';
import { type ICoreEntity, type BaseConfig, type EntityType, type LayoutBox } from '@omnipad/core';
import { getCoreClass } from '../utils/getCoreClasses';
import { useWidgetConfig } from './useWidgetConfig';
import { useCoreEntity } from './useCoreEntity';
import { useStickyLayout } from './useStickyLayout';
import { createManualTrigger } from '../utils/createManualTrigger';
import { flattenToHostLayout } from '@omnipad/web';
import { useSpatialObserver } from './useSpatialObserver';

/**
 * A facade hook which bridges a Vue component with its corresponding Headless Core logic entity.
 *
 * @template T - The Core class type (e.g., JoystickCore).
 * @template S - The State interface type (e.g., JoystickState).
 * @template C - The Config interface type (e.g., JoystickConfig).
 * @param requiredType - The fallback component type if not specified in config.
 * @param props - The raw properties passed to the Vue component.
 */
export function useWidgetSetup<T extends ICoreEntity, S, C extends BaseConfig>(
  requiredType: EntityType,
  props: Record<string, any>,
  options: {
    defaultProps?: Record<string, any>;
    domEventOptions?: Record<string, any>;
    extraSkipProps?: string[];
    initialDelegates?: Record<string, any>;
  } = {},
) {
  // 1. [配置层] 解析 UID 和 initial/reactive 配置
  const { uid, initialConfig, reactiveConfig } = useWidgetConfig<C>(
    requiredType,
    props,
    options.defaultProps,
    options.extraSkipProps,
  );

  // 2. [逻辑层] 根据类型实例化 Core 并处理生命周期绑定
  // 内部会处理 Registry 注册、状态订阅和基础 DOM 观察
  const { core, state, effectiveConfig, elementRef, domEvents, bindDelegates } = useCoreEntity<
    T,
    S,
    C
  >(
    () => {
      const CoreClass = getCoreClass(requiredType);
      return new CoreClass(uid.value, initialConfig.value, props.treeNode?.type);
    },
    reactiveConfig,
    options.domEventOptions,
    options.initialDelegates,
  );

  // 3. [布局层] 解析 Layout 来生成 UI 并绑定空间观察器
  // 初始化吸附驱动器
  const layoutUpdateTicker = createManualTrigger();
  const { stickyProvider } = useStickyLayout(
    core as any,
    effectiveConfig as any,
    layoutUpdateTicker.notify,
  );

  // 集成空间观察模块
  useSpatialObserver(core as any, elementRef, stickyProvider);

  // 计算最终生效的 LayoutBox
  const effectiveLayout = computed<LayoutBox>(() => {
    // 建立对吸附心跳的响应式依赖 / Establish reactive dependency on sticky ticker
    layoutUpdateTicker.depend();

    const rawLayout = effectiveConfig.value?.layout as LayoutBox;

    // 逻辑：如果存在有效的吸附目标且已捕获到 Rect，执行坐标换算
    if (stickyProvider.value) {
      const targetRect = stickyProvider.value.getRect();
      if (targetRect) {
        return flattenToHostLayout(rawLayout, targetRect);
      }
    }

    // 降级：返回原始配置布局
    return rawLayout;
  });

  return {
    uid,
    core,
    state,
    effectiveConfig,
    effectiveLayout, // 给 UI 组件绑定样式用
    elementRef, // 给 UI 组件绑定 ref 用
    domEvents, // 给 UI 组件绑定事件用
    bindDelegates, // 运行时注入方法
  };
}
