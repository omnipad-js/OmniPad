<script setup lang="ts">
import { computed, nextTick, ref, useSlots, VNode, watch } from 'vue';
import {
  InputZoneCore,
  OmniPad,
  type ConfigTreeNode,
  type InputZoneConfig,
  type InputZoneState,
  type LayoutBox,
  filterNotDynamicChildren,
  resolveDynamicWidget,
} from '@omnipad/core';
import { projectPercentToBox, resolveLayoutStyle, supportsContainerQueries } from '@omnipad/web';
import { getComponent } from '../utils/componentRegistry';
import VirtualLayerBase from './VirtualLayerBase.vue';
import { useWidgetSetup } from '../composables/useWidgetSetup';

interface InputZoneProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this zone. Used for profile serialization. */
  widgetId?: string;

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;

  /** If true, prevents the browser focus from leaving the game area when touching this zone. */
  preventFocusLoss?: {
    type: boolean;
    default: undefined; // 防止自动赋值为 false
  };
}
const props = defineProps<InputZoneProps>();

const slots = useSlots() as {
  default?: () => VNode[];
  dynamicWidget?: () => VNode[];
};
const dynamicWidgetRef = ref<any>(null);

const { uid, core, state, domEvents, effectiveConfig, effectiveLayout, elementRef, bindDelegates } =
  useWidgetSetup<InputZoneCore, InputZoneState, InputZoneConfig>(OmniPad.Types.INPUT_ZONE, props, {
    domEventOptions: {
      requireDirectHit: true,
    },
  });

const fixedChildren = computed<ConfigTreeNode[]>(() => {
  return filterNotDynamicChildren(
    props.treeNode?.children,
    props.treeNode?.config?.dynamicWidgetId,
  );
});

// 唯一性校验与 VNode 过滤逻辑
const dynamicControlInfo = computed<{
  nodeToRender: VNode | ConfigTreeNode | null;
  isFromSlot: boolean;
}>(() => {
  const slotNodes = slots.dynamicWidget?.() || [];

  // 过滤掉注释和纯文本，只留下真正的组件或 HTML 元素
  const validSlotNodes = slotNodes.filter((node) => {
    if (node.type === Comment || node.type === Text) return false;
    // 如果是 Fragment (比如使用 v-for 生成的)，需要视情况处理，这里简化为只取顶层直接子件
    return true;
  });

  return resolveDynamicWidget(
    validSlotNodes,
    props.treeNode?.children,
    props.treeNode?.config?.dynamicWidgetId,
  );
});

// --- 根据 Config 渲染的组件 ---
const renderDynamicWidget = computed(() => {
  const node = dynamicControlInfo.value.nodeToRender as ConfigTreeNode;
  return getComponent(node.config?.baseType || node.type);
});

// --- 同步动态组件 ID 给 Core ---
watch(
  dynamicWidgetRef,
  (newWidgetInstance) => {
    nextTick(() => {
      if (newWidgetInstance && newWidgetInstance?.uid) {
        // 将表现层确定的唯一动态组件 UID 同步回 Core 的配置快照中
        core.value?.updateConfig({
          dynamicWidgetId: newWidgetInstance.uid,
        });
        // 将动态组件的事件绑定到输入分区
        bindDelegates({
          dynamicWidgetPointerDown: (e) => {
            // 触发之前给动态控件的 Rect 上脏标记，后续逻辑获取新的 Rect
            newWidgetInstance.markRectDirty?.();
            newWidgetInstance.onPointerDown?.(e);
          },
          dynamicWidgetPointerMove: newWidgetInstance.onPointerMove,
          dynamicWidgetPointerUp: newWidgetInstance.onPointerUp,
          dynamicWidgetPointerCancel: newWidgetInstance.onPointerCancel,
        });
      }
    });
  },
  { immediate: true },
);

// 样式计算
const containerStyle = computed(() => {
  return effectiveLayout.value ? resolveLayoutStyle(effectiveLayout.value) : {};
});

// Whether browser supports Container Queries
const canUseNativeCQ = supportsContainerQueries();

const dynamicWrapperStyle = computed(() => {
  if (!state.value) return { display: 'none' };
  if (!state.value?.isDynamicActive) return { visibility: 'hidden' as const, opacity: 0 };

  const pos = state?.value?.dynamicPosition;
  const getSize = () => {
    const size = core?.value?.rect;
    return { x: size?.width || 0, y: size?.height || 0 };
  };
  const res = projectPercentToBox(pos, getSize, canUseNativeCQ);

  return {
    zIndex: 100,
    '--dynamic-widget-mount-x': res.x,
    '--dynamic-widget-mount-y': res.y,
    visibility: 'visible' as const,
    opacity: 1,
    pointerEvents: 'auto' as const,
  };
});

const onPointerDown = (e: PointerEvent) => domEvents?.onPointerDown?.(e);
const onPointerMove = (e: PointerEvent) => domEvents?.onPointerMove?.(e);
const onPointerUp = (e: PointerEvent) => domEvents?.onPointerUp?.(e);
const onPointerCancel = (e: PointerEvent) => domEvents?.onPointerCancel?.(e);
</script>

<template>
  <div
    :id="uid"
    ref="elementRef"
    class="omnipad-input-zone omnipad-prevent"
    :class="effectiveConfig?.cssClass"
    :style="containerStyle"
  >
    <!-- 基础层：VirtualLayerBase 处理静态 Children -->
    <VirtualLayerBase :nodes="fixedChildren">
      <slot />
    </VirtualLayerBase>

    <div
      v-if="dynamicControlInfo.nodeToRender || core?.isInterceptorRequired"
      class="omnipad-input-zone-trigger omnipad-prevent"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @lostpointercapture="onPointerCancel"
    >
      <!-- 动态控件层：通过计算出的 nodeToRender 进行唯一渲染 -->
      <div class="dynamic-widget-mount" :style="dynamicWrapperStyle">
        <!-- 情况 A: 渲染来自插槽的 VNode -->
        <template v-if="dynamicControlInfo.isFromSlot">
          <!-- 
          [关键点]：直接渲染 VNode 并绑定 Ref。
          即使 slot 传入了 3 个组件，这里通过 dynamicControlInfo.nodeToRender 
          也只会渲染数组中的第一个。
        -->
          <component
            :is="dynamicControlInfo.nodeToRender"
            :ref="(el: any) => (dynamicWidgetRef = el)"
          />
        </template>

        <!-- 情况 B: 根据 Config 渲染 -->
        <template v-else-if="dynamicControlInfo.nodeToRender">
          <component
            :is="renderDynamicWidget"
            :ref="(el: any) => (dynamicWidgetRef = el)"
            :tree-node="dynamicControlInfo.nodeToRender"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.omnipad-input-zone {
  position: relative;
  pointer-events: none;

  /* for Container Queries */
  container-type: size;
}

.omnipad-input-zone-trigger {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: transparent;
  touch-action: none;
}

.dynamic-widget-mount {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  will-change: transform;

  transform: translate3d(var(--dynamic-widget-mount-x, 0px), var(--dynamic-widget-mount-y, 0px), 0);

  --dynamic-widget-mount-x: 0px;
  --dynamic-widget-mount-y: 0px;
}
</style>
