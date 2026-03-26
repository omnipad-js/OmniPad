<script setup lang="ts">
import { computed } from 'vue';
import {
  TargetZoneCore,
  CMP_TYPES,
  type ConfigTreeNode,
  type CursorState,
  type LayoutBox,
  type TargetZoneConfig,
} from '@omnipad/core';
import {
  resolveLayoutStyle,
  remap,
  supportsContainerQueries,
  dispatchKeyboardEvent,
  dispatchPointerEventAtPos,
  reclaimFocusAtPos,
} from '@omnipad/core/utils';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';

interface TargetZoneProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this zone. Used for profile serialization. */
  widgetId?: string;

  /** Whether to render a visual virtual cursor. */
  cursorEnabled?: boolean;

  /** Delay in milliseconds before the virtual cursor auto-hides after inactivity (0 to disable). */
  cursorAutoDelay?: number;

  /** Spatial layout configuration. Usually set to cover the entire game container. */
  layout?: LayoutBox;
}
const props = defineProps<TargetZoneProps>();
const defaultProps = {
  cursorAutoDelay: 2500,
};

// 整合配置
const { uid, config, customClasses } = useWidgetConfig<TargetZoneConfig>(
  CMP_TYPES.TARGET_ZONE,
  props,
  defaultProps,
);
const { core, state, domEvents, effectiveLayout, elementRef } = useCoreEntity<
  TargetZoneCore,
  CursorState
>(
  () => new TargetZoneCore(uid.value, config.value, props.treeNode?.type),
  config,
  {},
  {
    dispatchKeyboardEvent: dispatchKeyboardEvent,
    dispatchPointerEventAtPos: dispatchPointerEventAtPos,
    reclaimFocusAtPos: reclaimFocusAtPos,
  },
);

const containerStyle = computed(() => resolveLayoutStyle(effectiveLayout.value));

// Whether browser supports Container Queries
const canUseNativeCQ = supportsContainerQueries();

// 光标位置样式
const cursorStyle = computed(() => {
  if (!state.value) return { display: 'none' };
  let cursorX, cursorY;
  const pos = state?.value?.position;
  if (canUseNativeCQ) {
    cursorX = `${pos.x}cqw`;
    cursorY = `${pos.y}cqh`;
  } else {
    const rect = core?.value?.rect;
    cursorX = `${remap(pos?.x || 0, 0, 100, 0, rect?.width || 0)}px`;
    cursorY = `${remap(pos?.y || 0, 0, 100, 0, rect?.height || 0)}px`;
  }
  return {
    '--omnipad-virtual-cursor-x': cursorX,
    '--omnipad-virtual-cursor-y': cursorY,
    opacity: state.value.isVisible ? 1 : 0,
  };
});

const onPointerDown = (e: PointerEvent) => domEvents.value?.onPointerDown(e);
const onPointerMove = (e: PointerEvent) => domEvents.value?.onPointerMove(e);
const onPointerUp = (e: PointerEvent) => domEvents.value?.onPointerUp(e);
const onPointerCancel = (e: PointerEvent) => domEvents.value?.onPointerCancel(e);
</script>

<template>
  <div
    :id="uid"
    ref="elementRef"
    class="omnipad-target-zone omnipad-prevent"
    :class="customClasses"
    :style="containerStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  >
    <!-- Slot: 自定义焦点回归反馈 -->
    <slot
      name="focus-feedback"
      :state="state"
      :is-returning="state?.isFocusReturning"
      :cursor-pos="state?.position"
    >
      <Transition name="omnipad-default-focus-fade">
        <!-- 默认反馈：一个与容器同大的边框层 -->
        <div v-if="state?.isFocusReturning" class="omnipad-default-focus-border-feedback"></div>
      </Transition>
    </slot>
    <!-- Slot: 自定义虚拟光标渲染 -->
    <div v-if="config.cursorEnabled" class="omnipad-virtual-cursor" :style="cursorStyle">
      <slot
        name="cursor"
        :state="state"
        :is-down="state?.isPointerDown"
        :is-returning="state?.isFocusReturning"
        :cursor-pos="state?.position"
      >
        <!-- 默认红色准星 -->
        <div class="omnipad-default-cursor-dot" :class="{ 'is-down': state?.isPointerDown }"></div>
      </slot>
    </div>
    <!-- Slot: 自定义虚拟光标跟随物渲染 -->
    <div v-if="config.cursorEnabled" class="omnipad-virtual-cursor" :style="cursorStyle">
      <slot
        name="with-cursor"
        :state="state"
        :is-down="state?.isPointerDown"
        :is-returning="state?.isFocusReturning"
        :cursor-pos="state?.position"
      >
      </slot>
    </div>
    <!-- Slot: 其他定制化内容 -->
    <slot
      :state="state"
      :is-down="state?.isPointerDown"
      :is-returning="state?.isFocusReturning"
      :cursor-pos="state?.position"
    ></slot>
  </div>
</template>

<style scoped>
.omnipad-target-zone {
  position: relative;
  pointer-events: auto;
  overflow: hidden;

  /* for Container Queries */
  container-type: size;
}

.omnipad-virtual-cursor {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--omnipad-default-cursor-width);
  height: var(--omnipad-default-cursor-height);

  pointer-events: none;
  will-change: transform;
  transition: var(--omnipad-default-cursor-transition);
  z-index: 10;

  transform: translate3d(
    calc(-50% + var(--omnipad-virtual-cursor-x, 0px)),
    calc(-50% + var(--omnipad-virtual-cursor-y, 0px)),
    0
  );

  --omnipad-virtual-cursor-x: 0px;
  --omnipad-virtual-cursor-y: 0px;
}
</style>
