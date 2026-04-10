import { onMounted, onUnmounted, Ref } from 'vue';
import { type ICoreEntity, StickyProvider, setupSpatialLogic } from '@omnipad/core';
import { ElementObserver } from '@omnipad/core/dom';
import { distillRect } from '@omnipad/core/utils';

/**
 * Handles DOM-related observations for a core entity.
 *
 * @param core - The logic entity instance.
 * @param elementRef - Vue ref to the HTML element or component.
 * @param stickyProvider - Optional provider from useStickyLayout to link cache invalidation.
 */
export function useSpatialObserver(
  core: Ref<ICoreEntity | undefined>,
  elementRef: Ref<any>,
  stickyProvider?: Ref<StickyProvider<Element> | null>,
) {
  let cleanup: (() => void) | null = null;

  /**
   * Helper to extract real Element from Vue ref.
   * 辅助函数：从 Vue ref 中提取真实的 DOM 元素。
   */
  const getDomElement = (target: any): Element | null => {
    if (target instanceof Element) return target;
    if (target?.$el instanceof Element) return target.$el;
    return null;
  };

  onMounted(() => {
    const instance = core.value;
    const domEl = getDomElement(elementRef.value);

    if (instance && domEl) {
      // 调用纯逻辑 Runtime
      cleanup = setupSpatialLogic(
        instance,
        domEl,
        ElementObserver.getInstance(),
        (el) => distillRect(el.getBoundingClientRect()),
        stickyProvider?.value,
      );
    }
  });

  onUnmounted(() => {
    if (cleanup) cleanup();
  });
}
