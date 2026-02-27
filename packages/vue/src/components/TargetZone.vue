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
const cursorStyle = computed(() => {
  if (!state.value) return { display: 'none' };
  return {
    left: `${state.value.position.x}%`,
    top: `${state.value.position.y}%`,
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
        :cursor-pos="state?.position"
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
  width: var(--omnipad-default-cursor-width);
  height: var(--omnipad-default-cursor-height);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: var(--omnipad-default-cursor-transition);
  z-index: 10;
}
</style>
