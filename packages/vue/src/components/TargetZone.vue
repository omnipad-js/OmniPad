<script setup lang="ts">
import { computed } from 'vue';
import {
  ConfigTreeNode,
  CursorState,
  LayoutBox,
  TargetZoneConfig,
  TargetZoneCore,
  CMP_TYPES,
  resolveLayoutStyle,
  remap,
} from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';

interface TargetZoneProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this zone. Used for profile serialization. */
  widgetId?: string;

  /** Whether the virtual visual cursor is enabled for this stage. */
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
const { uid, config } = useWidgetConfig<TargetZoneConfig>(
  CMP_TYPES.TARGET_ZONE,
  props,
  defaultProps,
);
const { core, state, elementRef } = useCoreEntity<TargetZoneCore, CursorState>(
  () => new TargetZoneCore(uid.value, config.value),
);

const containerStyle = computed(() => resolveLayoutStyle(config.value.layout));

// 光标位置
const cursorPositionPx = computed(() => {
  const rect = core?.value?.getRect();
  const pos = state?.value?.position;
  return {
    x: remap(pos?.x || 0, 0, 100, 0, rect?.width || 0),
    y: remap(pos?.y || 0, 0, 100, 0, rect?.height || 0),
  };
});

// 光标位置样式
const cursorStyle = computed(() => {
  if (!state.value) return { display: 'none' };
  return {
    '--omnipad-virtual-cursor-x': `${cursorPositionPx.value.x}px`,
    '--omnipad-virtual-cursor-y': `${cursorPositionPx.value.y}px`,
    opacity: state.value.isVisible ? 1 : 0,
  };
});

const onPointerDown = (e: PointerEvent) => core.value?.onPointerDown(e);
const onPointerMove = (e: PointerEvent) => core.value?.onPointerMove(e);
const onPointerUp = (e: PointerEvent) => core.value?.onPointerUp(e);
const onPointerCancel = (e: PointerEvent) => core.value?.onPointerCancel(e);
</script>

<template>
  <div
    :id="uid"
    ref="elementRef"
    class="omnipad-target-zone"
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
      :cursor-pos="cursorPositionPx"
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
        :cursor-pos="cursorPositionPx"
      >
        <!-- 默认红色准星 -->
        <div class="omnipad-default-cursor-dot" :class="{ 'is-down': state?.isPointerDown }"></div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.omnipad-target-zone {
  user-select: none;
  touch-action: none;
  pointer-events: auto;
  overflow: hidden;
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
      var(--omnipad-virtual-cursor-x, 0px),
      var(--omnipad-virtual-cursor-y, 0px),
      0
    )
    translate(-50%, -50%);

  --omnipad-virtual-cursor-x: 0px;
  --omnipad-virtual-cursor-y: 0px;
}
</style>
