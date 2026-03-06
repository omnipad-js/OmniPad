<script setup lang="ts">
import {
  ConfigTreeNode,
  type LayoutBox,
  CMP_TYPES,
  ButtonConfig,
  ButtonCore,
  ButtonState,
} from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualButtonBase from './VirtualButtonBase.vue';

interface VirtualButtonProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this button. Used for profile serialization. */
  widgetId?: string;

  /** The text or symbol displayed on the button surface. */
  label?: string;

  /** The ID (CID) of the TargetZone this button sends signals to, usually global ID. */
  targetStageId?: string;

  /** Keyboard or Mouse event metadata to be emitted when triggered. */
  mapping?: ButtonConfig['mapping'];

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}
const props = defineProps<VirtualButtonProps>();
const defaultProps = {
  label: 'BTN',
};

// 整合配置
const { uid, config } = useWidgetConfig<ButtonConfig>(CMP_TYPES.BUTTON, props, defaultProps);
const { state, elementRef, domEvents } = useCoreEntity<ButtonCore, ButtonState>(
  () => new ButtonCore(uid.value, config.value),
);

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
  <VirtualButtonBase
    :id="uid"
    ref="elementRef"
    class="omnipad-button omnipad-prevent"
    :layout="config.layout"
    :label="config.label"
    :is-active="state?.isPressed"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  >
    <template #base="slotProps">
      <slot name="base" v-bind="slotProps" />
    </template>

    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </VirtualButtonBase>
</template>
