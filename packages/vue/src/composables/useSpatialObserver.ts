import { onMounted, onUnmounted, Ref } from 'vue';
import { type ICoreEntity, type ISpatial, type IResettable, StickyProvider } from '@omnipad/core';
import { ElementObserver } from '@omnipad/core/dom';
import { createCachedProvider } from '@omnipad/core/utils';

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
  const observer = ElementObserver.getInstance();

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
    if (!instance) return;

    const domEl = getDomElement(elementRef.value);
    if (!(domEl instanceof Element)) return;

    // --- Spatial Awareness (Rect) / 空间感知 (尺寸与坐标) ---
    if ('bindRectProvider' in instance) {
      const spatialCore = instance as unknown as ISpatial;

      // 创建带缓存的 Rect 提供者 / Create a cached Rect provider
      const cached = createCachedProvider(() => domEl.getBoundingClientRect());

      // 绑定到逻辑层 / Bind to the logic layer
      spatialCore.bindRectProvider(cached.get, () => {
        // 逻辑层要求清理缓存时触发 / Triggered when logic layer requests a cache clear
        cached.markDirty();
        // 如果关联了吸附目标，联动清理 / If associated with a sticky target, clear it too
        if (stickyProvider?.value) {
          stickyProvider.value.markDirty();
        }
      });

      // 注册尺寸变化监听 / Register ResizeObserver
      observer.observeResize(instance.uid, domEl, () => {
        spatialCore.markRectDirty();
      });
    }

    // --- Visibility Awareness (Intersection) / 可见性感知 ---
    if ('reset' in instance) {
      const resettableCore = instance as unknown as IResettable;

      // 注册可见性监听，丢失可见性时自动重置信号 / Register IO, auto-reset signals when visibility is lost
      observer.observeIntersect(instance.uid, domEl, (isVisible) => {
        if (!isVisible) {
          resettableCore.reset();
        }
      });
    }
  });

  onUnmounted(() => {
    if (core.value) {
      // 销毁时移除所有在该 UID 下注册的观察者 / Disconnect all observers under this UID
      observer.disconnect(core.value.uid);
    }
  });
}
