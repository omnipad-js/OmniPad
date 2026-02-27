<script setup lang="ts">
import {
  ConfigTreeNode,
  LayoutBox,
  type TrackpadConfig,
  TrackpadCore,
  type TrackpadState,
  CMP_TYPES,
} from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualButtonBase from './VirtualButtonBase.vue';

interface VirtualTrackpadProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this trackpad. Used for profile serialization. */
  widgetId?: string;

  /** The text or symbol displayed on the trackpad surface. */
  label?: string;

  /** Determines the mapping ratio between the physical displacement of the trackpad and the movement of the screen cursor. */
  sensitivity?: number;

  /** The ID (CID) of the TargetZone this trackpad sends signals to. */
  targetStageId?: string;

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}

const props = defineProps<VirtualTrackpadProps>();

const { uid, config } = useWidgetConfig<TrackpadConfig>(CMP_TYPES.TRACKPAD, props, {
  label: 'TRACKPAD',
  sensitivity: 1.0,
});

const { core, state, elementRef } = useCoreEntity<TrackpadCore, TrackpadState>(
  () => new TrackpadCore(uid.value, config.value),
);

// 转发交互
const onPointerDown = (e: PointerEvent) => core.value?.onPointerDown(e);
const onPointerMove = (e: PointerEvent) => core.value?.onPointerMove(e);
const onPointerUp = (e: PointerEvent) => core.value?.onPointerUp(e);
const onPointerCancel = (e: PointerEvent) => core.value?.onPointerCancel(e);

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
    class="omnipad-trackpad"
    :layout="config.layout"
    :label="config.label"
    :is-active="state?.isPressed"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  />
</template>

<style scoped>
.omnipad-trackpad {
  user-select: none;
  touch-action: none;
  overflow: hidden;

  --omnipad-btn-border-style: var(--omnipad-trackpad-border-style);
  --omnipad-btn-bg: var(--omnipad-trackpad-bg);
  cursor: var(--omnipad-trackpad-cursor);
}
</style>
