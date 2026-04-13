import { AbstractRect, IResettable, ISpatial } from '@omnipad/core';
import { createCachedProvider, distillRect } from '@omnipad/core/utils';
import { smartQuerySelector } from './query';
import { StickyProvider } from '../ts/spatial';
import { ElementObserver } from '../managers/ElementObserver';

/**
 * Creates a StickyProvider pre-configured for the Web environment.
 */
export const createWebStickyProvider = (selector: string) => {
  return new StickyProvider<Element>(
    selector,
    (id) => smartQuerySelector(id) as Element, // finder
    (el) => {
      // rectProvider
      const r = (el as Element).getBoundingClientRect();
      return distillRect(r);
    },
    (el) => el.isConnected, // presenceChecker
  );
};

/**
 * Orchestrates environment-agnostic spatial and visibility logic for an entity.
 *
 * @template T - The type of the physical element (e.g., HTMLElement, Element).
 * @param entity - The logic core entity instance (must implement ICoreEntity).
 * @param element - The physical element target to be observed.
 * @param getRect - An environment-specific function to retrieve the element's current Rect.
 * @param stickyProvider - Optional. If provided, its cache will be invalidated alongside the entity's.
 *
 * @returns A cleanup function to disconnect all registered observers.
 */
export function setupSpatialLogic<T extends Element>(
  entity: any,
  element: T,
  getRect: (el: T) => AbstractRect,
  stickyProvider?: StickyProvider<T> | null,
) {
  if (!entity.uid) return () => {};
  const uid = entity.uid;
  const observer = ElementObserver.getInstance();

  // --- 1. Spatial Logic (Rect & Resize) ---
  if ('bindRectProvider' in entity) {
    const spatialCore = entity as unknown as ISpatial;

    // 创建带缓存的提供者 / Create cached provider
    const cached = createCachedProvider(() => getRect(element));

    // 绑定获取与清理回调 / Bind getter and invalidation callback
    spatialCore.bindRectProvider(cached.get, () => {
      cached.markDirty();
      // 联动清理吸附目标的缓存 / Link invalidation to sticky provider
      if (stickyProvider) {
        stickyProvider.markDirty();
      }
    });

    // 注册尺寸监听 / Register ResizeObserver
    observer.observeResize(uid, element, () => {
      spatialCore.markRectDirty();
    });
  }

  // --- 2. Visibility Logic (Intersection) ---
  if ('reset' in entity) {
    const resettableCore = entity as unknown as IResettable;

    observer.observeIntersect(uid, element, (isVisible) => {
      // 丢失可见性时自动重置信号 (安全阀) / Auto-reset on visibility loss
      if (!isVisible) {
        resettableCore.reset();
      }
    });
  }

  // 返回清理函数 (用于注销所有监听) / Return cleanup function
  return () => {
    observer.disconnect(uid);
  };
}
