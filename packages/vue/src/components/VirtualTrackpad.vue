<script setup lang="ts">
import {
  TrackpadCore,
  CMP_TYPES,
  type ActionMapping,
  type ConfigTreeNode,
  type LayoutBox,
  type TrackpadConfig,
  type TrackpadState,
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

  /** Optional: Mouse or keyboard event metadata to be emitted when triggered. */
  mapping?: ActionMapping;

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}

const props = defineProps<VirtualTrackpadProps>();

const { uid, initialConfig, reactiveConfig } = useWidgetConfig<TrackpadConfig>(
  CMP_TYPES.TRACKPAD,
  props,
  {
    label: 'TRACKPAD',
    sensitivity: 1.0,
  },
);

const { core, state, domEvents, effectiveConfig, effectiveLayout, elementRef } = useCoreEntity<
  TrackpadCore,
  TrackpadState,
  TrackpadConfig
>(() => new TrackpadCore(uid.value, initialConfig.value, props.treeNode?.type), reactiveConfig);

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
  markRectDirty: () => core.value?.markRectDirty,
});
</script>

<template>
  <VirtualButtonBase
    :id="uid"
    ref="elementRef"
    class="omnipad-trackpad omnipad-prevent"
    :class="effectiveConfig?.cssClasses"
    :layout="effectiveLayout"
    :label="effectiveConfig?.label"
    :is-active="state?.isPressed"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
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

<style scoped>
.omnipad-trackpad {
  --omnipad-btn-border-style: var(--omnipad-trackpad-border-style);
  --omnipad-btn-bg: var(--omnipad-trackpad-bg);
  cursor: var(--omnipad-trackpad-cursor);
}
</style>
