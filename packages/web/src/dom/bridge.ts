import { IPointerHandler } from '@omnipad/core';
import { safeReleaseCapture, safeSetCapture } from './capture';

/**
 * Creates a standardized bridge between native DOM PointerEvents and Core abstract handlers.
 * Handles event prevention, stop propagation, pointer capture, and multi-touch filtering.
 *
 * @param coreHandler - The logic core instance that implements IPointerHandler.
 * @param getElement - A getter function to retrieve the DOM element for pointer capture.
 * @returns An object containing mapped event handlers for Vue/React template binding.
 */
export function createPointerBridge(
  coreHandler: IPointerHandler & { activePointerId?: number | null },
  options: {
    /** Respond only to direct clicks (without responding to events bubbled up from child elements) */
    requireDirectHit?: boolean;
  } = {},
) {
  return {
    /**
     * Entry point for a pointer interaction.
     * Establishes capture and initializes core logic.
     */
    onPointerDown(e: PointerEvent) {
      // 拒收合成事件，防止事件环路 / Prevent synthetic events to avoid feedback loops
      if (!e.isTrusted) return;

      // 如果开启了“仅限直接点击”，则进行校验 / If “Direct Click Only” is enabled, verification will be performed.
      if (options?.requireDirectHit && e.target !== e.currentTarget) return;

      // 如果当前已有指针在控制，则忽略后续的其他指针按下 / Ensure the widget only responds to one pointer at a time
      if (coreHandler.activePointerId != null) return;

      // 阻止默认行为与冒泡 / Block default behavior and propagation
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      // 获取捕获目标并执行锁定 / Resolve target element and set pointer capture
      const el = e.currentTarget;
      if (el) safeSetCapture(el, e.pointerId);

      // 转发至核心逻辑 / Forward to core logic
      coreHandler.onPointerDown(e);
    },

    /**
     * Continuous movement handling.
     * Throttling should be handled within the core implementation.
     */
    onPointerMove(e: PointerEvent) {
      if (!e.isTrusted) return;

      // 校验指针 ID 是否匹配，防止多指冲突 / Validate pointer ID to prevent multi-touch interference
      if (coreHandler.activePointerId != null && coreHandler.activePointerId !== e.pointerId)
        return;
      if (e.cancelable) e.preventDefault();

      coreHandler.onPointerMove(e);
    },

    /**
     * Successful interaction completion.
     * Filters by pointerId to ensure only the capturing finger triggers release.
     */
    onPointerUp(e: PointerEvent) {
      if (!e.isTrusted) return;
      if (coreHandler.activePointerId != null && coreHandler.activePointerId !== e.pointerId)
        return;
      if (e.cancelable) e.preventDefault();

      // 释放指针锁定 / Release pointer capture
      const el = e.currentTarget;
      if (el) safeReleaseCapture(el, e.pointerId);

      coreHandler.onPointerUp(e);
    },

    /**
     * System-level interaction cancellation (e.g., alert popups, browser gestures).
     */
    onPointerCancel(e: PointerEvent) {
      if (!e.isTrusted) return;
      if (coreHandler.activePointerId != null && coreHandler.activePointerId !== e.pointerId)
        return;

      const el = e.currentTarget;
      if (el) safeReleaseCapture(el, e.pointerId);

      coreHandler.onPointerCancel(e);
    },
  };
}
