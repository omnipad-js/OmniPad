<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import {
  JoystickCore,
  CMP_TYPES,
  type ConfigTreeNode,
  type JoystickConfig,
  type JoystickState,
  type LayoutBox,
} from '@omnipad/core';
import { supportsContainerQueries } from '@omnipad/web';
import VirtualAxisBase from './VirtualAxisBase.vue';
import VirtualButtonBase from './VirtualButtonBase.vue';
import { useWidgetSetup } from '../composables/useWidgetSetup';

interface VirtualJoystickProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this joystick. Used for profile serialization. */
  widgetId?: string;

  /** The text or symbol displayed on the stick button surface. */
  label?: string;

  /** The ID (CID) of the TargetZone this trackpad sends signals to. */
  targetStageId?: string;

  /** Determines the minimum travel distance required to trigger a direction. */
  threshold?: number;

  /** Whether enable cursor displacement simulation. */
  cursorMode?: {
    type: boolean;
    default: undefined;
  };

  /** Determines the mapping velocity between the physical displacement of the joystick and the movement of the screen cursor. */
  cursorSensitivity?: number;

  /** Defines the specific actions or key signals emitted for each cardinal direction and stick button. */
  mapping?: JoystickConfig['mapping'];

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}

const props = defineProps<VirtualJoystickProps>();

const defaultProps = {
  label: 'PUSH',
  threshold: 0.2,
  cursorMode: false,
  cursorSensitivity: 1.0,
};

const { uid, core, state, domEvents, effectiveConfig, effectiveLayout, elementRef } =
  useWidgetSetup<JoystickCore, JoystickState, JoystickConfig>(CMP_TYPES.JOYSTICK, props, {
    defaultProps,
  });

const canUseNativeCQ = supportsContainerQueries();
const baseSize = ref({ x: 0, y: 0 });

const stopBaseRect = watchEffect(() => {
  const rect = core.value?.rect;
  if (rect) {
    baseSize.value = { x: rect.width, y: rect.height };
  }
});
if (canUseNativeCQ) stopBaseRect();

// 转发交互
const onPointerDown = (e: PointerEvent) => domEvents?.onPointerDown?.(e);
const onPointerMove = (e: PointerEvent) => domEvents?.onPointerMove?.(e);
const onPointerUp = (e: PointerEvent) => domEvents?.onPointerUp?.(e);
const onPointerCancel = (e: PointerEvent) => domEvents?.onPointerCancel?.(e);

// 暴露转发方法
defineExpose({
  uid,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  markRectDirty: () => core.value?.markRectDirty,
});
</script>

<template>
  <VirtualAxisBase
    :id="uid"
    ref="elementRef"
    class="omnipad-joystick omnipad-prevent"
    :class="effectiveConfig?.cssClass"
    :layout="effectiveLayout"
    :is-active="state?.isActive"
    :vector="state?.vector"
    show-stick
    :base-size="baseSize"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  >
    <!-- 透传基座插槽 -->
    <template #base="slotProps">
      <slot name="base" v-bind="slotProps" />
    </template>

    <!-- 透传柄头插槽，给用户改写 L3 按钮样式的能力 -->
    <template #stick>
      <VirtualButtonBase
        :layout="{ height: '100%', width: '100%' }"
        :is-active="state?.isPressed"
        :label="effectiveConfig?.label"
      >
        <template #base="slotProps">
          <slot name="stick-base" v-bind="slotProps" />
        </template>

        <template #default="slotProps">
          <slot name="stick" v-bind="slotProps" />
        </template>
      </VirtualButtonBase>
    </template>

    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </VirtualAxisBase>
</template>

<style scoped>
.omnipad-joystick {
  pointer-events: auto;

  --omnipad-axis-base-border-color: var(--omnipad-joystick-base-border-color);
  --omnipad-axis-base-border-radius: var(--omnipad-joystick-base-border-radius);
  --omnipad-axis-base-border-style: var(--omnipad-joystick-base-border-style);
  --omnipad-axis-base-border-width: var(--omnipad-joystick-base-border-width);
  --omnipad-axis-base-bg: var(--omnipad-joystick-base-bg, rgba(255, 255, 255, 0.2));

  --omnipad-default-axis-stick-height-scaler: var(
    --omnipad-default-joystick-stick-height-scaler,
    0.5
  );
  --omnipad-default-axis-stick-width-scaler: var(
    --omnipad-default-joystick-stick-width-scaler,
    0.5
  );

  --omnipad-btn-bg: var(--omnipad-joystick-btn-bg, rgba(255, 255, 255, 0.2));
  --omnipad-btn-border-color: var(--omnipad-joystick-btn-border-color);
  --omnipad-btn-border-style: var(--omnipad-joystick-btn-border-style);
  --omnipad-btn-border-width: var(--omnipad-joystick-btn-border-width);
  --omnipad-btn-radius: var(--omnipad-joystick-btn-radius);
}
</style>
