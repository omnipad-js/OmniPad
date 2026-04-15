<script setup lang="ts">
import {
  RootLayerCore,
  type BaseConfig,
  type ConfigTreeNode,
  type LayoutBox,
  LayerState,
} from '@omnipad/core';
import { resolveLayoutStyle } from '@omnipad/web';
import VirtualLayerBase from './VirtualLayerBase.vue';
import { computed } from 'vue';
import { useWidgetSetup } from '../composables/useWidgetSetup';
import { OmniPad } from '@omnipad/core/const';

const props = defineProps<{
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this layer. Used for profile serialization. */
  widgetId?: string;

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}>();

const { uid, effectiveConfig, effectiveLayout, elementRef } = useWidgetSetup<
  RootLayerCore,
  LayerState,
  BaseConfig
>(OmniPad.Types.ROOT_LAYER, props);

const containerStyle = computed(() => {
  return effectiveLayout.value ? resolveLayoutStyle(effectiveLayout.value) : {};
});
</script>

<template>
  <div
    :id="uid"
    ref="elementRef"
    class="omnipad-root-layer omnipad-prevent"
    :class="effectiveConfig?.cssClass"
    :style="containerStyle"
  >
    <VirtualLayerBase :nodes="treeNode?.children || []">
      <slot />
    </VirtualLayerBase>
  </div>
</template>

<style scoped>
.omnipad-root-layer {
  position: relative;
  pointer-events: none;
}
</style>
