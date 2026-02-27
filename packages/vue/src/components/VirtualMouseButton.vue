<script setup lang="ts">
import {
  ConfigTreeNode,
  type MouseButtonConfig,
  MouseButtonCore,
  type MouseButtonState, // 假设复用基础的 ButtonState
  type LayoutBox,
  CMP_TYPES,
  Vec2,
} from '@omnipad/core'; // 注意你的包名
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualButtonBase from './VirtualButtonBase.vue';

interface VirtualMouseButtonProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this button. Used for profile serialization. */
  widgetId?: string;

  /** The text or symbol displayed on the button surface. */
  label?: string;

  /** The ID (CID) of the TargetZone this button sends signals to. */
  targetStageId?: string;

  /** 0: Left, 1: Middle, 2: Right */
  button?: 0 | 1 | 2;

  /**
   * Fixed coordinate to click on (0-100 percentage).
   * Example: { x: 95, y: 5 } for a pause button in the corner.
   */
  fixedPoint?: Vec2;

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}

const props = defineProps<VirtualMouseButtonProps>();
const defaultProps = {
  label: 'LMB',
  button: 0,
};

// 整合配置
const { uid, config } = useWidgetConfig<MouseButtonConfig>(
  CMP_TYPES.MOUSE_BUTTON,
  props,
  defaultProps,
);

const { core, state, elementRef } = useCoreEntity<MouseButtonCore, MouseButtonState>(
  () => new MouseButtonCore(uid.value, config.value),
);

// 转发交互
const onPointerDown = (e: PointerEvent) => core.value?.onPointerDown(e);
const onPointerUp = (e: PointerEvent) => core.value?.onPointerUp(e);
const onPointerCancel = (e: PointerEvent) => core.value?.onPointerCancel(e);

// 暴露转发方法供外部（如 InputZone）调用
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
