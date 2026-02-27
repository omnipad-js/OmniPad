<script setup lang="ts">
import {
  ConfigTreeNode,
  type KeyboardButtonConfig,
  KeyboardButtonCore,
  type KeyboardButtonState,
  type LayoutBox,
  CMP_TYPES,
} from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualButtonBase from './VirtualButtonBase.vue';

interface VirtualKeyButtonProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this button. Used for profile serialization. */
  widgetId?: string;

  /** The text or symbol displayed on the button surface. */
  label?: string;

  /** The ID (CID) of the TargetZone this button sends signals to, usually global ID. */
  targetStageId?: string;

  /**
   * Mapping definitions for keyboard events.
   * Includes 'key', 'code', and legacy 'keyCode'.
   */
  mapping?: KeyboardButtonConfig['mapping'];

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}
const props = defineProps<VirtualKeyButtonProps>();
const defaultProps = {
  label: 'BTN',
};

// 整合配置
const { uid, config } = useWidgetConfig<KeyboardButtonConfig>(
  CMP_TYPES.KEYBOARD_BUTTON,
  props,
  defaultProps,
);
const { core, state, elementRef } = useCoreEntity<KeyboardButtonCore, KeyboardButtonState>(
  () => new KeyboardButtonCore(uid.value, config.value),
);

// 转发交互
const onPointerDown = (e: PointerEvent) => core.value?.onPointerDown(e);
const onPointerUp = (e: PointerEvent) => core.value?.onPointerUp(e);
const onPointerCancel = (e: PointerEvent) => core.value?.onPointerCancel(e);

// 暴露转发方法
defineExpose({
  uid,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
});
</script>

<template>
  <VirtualButtonBase
    :id="uid"
    ref="elementRef"
    :layout="config.layout"
    :label="config.label"
    :is-active="state?.isPressed"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  />
</template>
