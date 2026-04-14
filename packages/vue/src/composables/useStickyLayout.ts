import { shallowRef, watch, onUnmounted, Ref, ComputedRef } from 'vue';
import { type ICoreEntity, type ISpatial, type IResettable, type BaseConfig } from '@omnipad/core';
import { StickyController, StickyProvider, createWebStickyProvider } from '@omnipad/web';

/**
 * A sub-composable to manage sticky layout logic.
 * Handles the connection between a logic entity and a physical DOM target.
 *
 * @param core - Ref of the logic instance (must implement ISpatial and IResettable).
 * @param config - Reactive config containing the layout.stickySelector.
 * @param onUpdate - Callback triggered when the layout needs to be re-synchronized (e.g., forcing a UI refresh).
 */
export function useStickyLayout<C extends BaseConfig>(
  core: ComputedRef<(ICoreEntity & ISpatial & IResettable) | undefined>,
  config: ComputedRef<C> | Ref<C>,
  onUpdate: () => void,
) {
  // 1. 内部状态 / Internal State
  const stickyProvider = shallowRef<StickyProvider<Element> | null>(null);

  // 2. 实例化控制器 / Instantiate the Orchestrator
  // 注意：此处不直接在 setup 实例化，而是等待 core.value 就绪后再由监听器处理
  let stickyController: StickyController<Element> | null = null;

  // 3. 监听吸附选择器变化 / Monitor selector changes
  watch(
    () => config.value?.layout?.stickySelector,
    (newSelector, _, onCleanup) => {
      // 必须确保核心实例已就绪 / Ensure the logic core is available
      if (!core.value) return;

      // 懒加载初始化控制器 / Lazy-initialize the controller
      if (!stickyController) {
        stickyController = new StickyController(core.value, onUpdate);
      }

      // 执行选择器切换策略 / Perform selector switching strategy
      const result = stickyController.handleSelectorChange(newSelector, stickyProvider.value, (s) =>
        createWebStickyProvider(s),
      );

      // 更新当前的 Provider 引用 / Update the current provider reference
      stickyProvider.value = result.provider;

      // 注册清理逻辑 / Register cleanup for watch-effect
      onCleanup(() => {
        stickyController?.onCleanUp();
      });
    },
    { immediate: true }, // 立即处理初始配置 / Handle initial config immediately
  );

  // 4. 组件卸载时的终极清理 / Final cleanup on unmount
  onUnmounted(() => {
    stickyController?.onCleanUp();
    stickyProvider.value = null;
  });

  return {
    /**
     * 当前正在追踪的物理目标提供者
     * 用于外部调用 .getRect() 获取实时坐标
     */
    stickyProvider,
  };
}
