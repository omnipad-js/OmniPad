<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import {
  ConfigTreeNode,
  JoystickConfig,
  JoystickCore,
  JoystickState,
  LayoutBox,
  CMP_TYPES,
  supportsContainerQueries,
} from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualAxisBase from './VirtualAxisBase.vue';
import VirtualButtonBase from './VirtualButtonBase.vue';

interface VirtualJoystickProps {
  treeNode?: ConfigTreeNode;
  widgetId?: string;
  label?: string;
  targetStageId?: string;
  threshold?: number;
  cursorMode?: {
    type: boolean;
    default: undefined;
  };
  cursorSensitivity?: number;
  mapping?: JoystickConfig['mapping'];
  layout?: LayoutBox;
}

const props = defineProps<VirtualJoystickProps>();

const defaultProps = {
  label: 'PUSH',
  threshold: 0.2,
  cursorMode: false,
  cursorSensitivity: 1.0,
};

const { uid, config } = useWidgetConfig<JoystickConfig>(CMP_TYPES.JOYSTICK, props, defaultProps);

const { core, state, elementRef, domEvents } = useCoreEntity<JoystickCore, JoystickState>(
  () => new JoystickCore(uid.value, config.value),
);

const canUseNativeCQ = supportsContainerQueries();
const baseRadius = ref({ x: 0, y: 0 });

const stopBaseRect = watchEffect(() => {
  const rect = core.value?.rect;
  if (rect) {
    baseRadius.value = { x: rect.width / 2, y: rect.height / 2 };
  }
});
if (canUseNativeCQ) stopBaseRect();

// 转发交互
const onPointerDown = (e: PointerEvent) => domEvents.value?.onPointerDown(e);
const onPointerMove = (e: PointerEvent) => domEvents.value?.onPointerMove(e);
const onPointerUp = (e: PointerEvent) => domEvents.value?.onPointerUp(e);
const onPointerCancel = (e: PointerEvent) => domEvents.value?.onPointerCancel(e);

// 暴露转发方法
defineExpose({
  uid,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
});
</script>

<template>
  <VirtualAxisBase
    ref="elementRef"
    class="omnipad-joystick omnipad-prevent"
    :layout="config.layout"
    :is-active="state?.isActive"
    :vector="state?.vector"
    show-stick
    :base-radius="baseRadius"
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
        :label="config.label"
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

  --omnipad-axis-base-border-color: rgba(255, 255, 255, 0.4);
  --omnipad-axis-base-border-radius: 50%;
  --omnipad-axis-base-border-style: solid;
  --omnipad-axis-base-border-width: 2px;
  --omnipad-axis-base-bg: rgba(255, 255, 255, 0.2);
  --omnipad-default-axis-stick-height-scaler: 0.5;
  --omnipad-default-axis-stick-width-scaler: 0.5;

  --omnipad-btn-bg: rgba(255, 255, 255, 0.2);
  --omnipad-btn-border-color: rgba(255, 255, 255, 0.4);
  --omnipad-btn-border-style: solid;
  --omnipad-btn-border-width: 2px;
  --omnipad-btn-radius: 50%;
}
</style>
