<script setup lang="ts">
import {
  RootLayerCore,
  CMP_TYPES,
  type BaseConfig,
  type ConfigTreeNode,
  type LayoutBox,
} from '@omnipad/core';
import { resolveLayoutStyle } from '@omnipad/core/utils';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualLayerBase from './VirtualLayerBase.vue';
import { computed } from 'vue';

const props = defineProps<{
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this layer. Used for profile serialization. */
  widgetId?: string;

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}>();

const { uid, config, customClasses } = useWidgetConfig<BaseConfig>(CMP_TYPES.ROOT_LAYER, props);

const { effectiveLayout, elementRef } = useCoreEntity(
  () => new RootLayerCore(uid.value, config.value, props.treeNode?.type),
  config,
);

const containerStyle = computed(() => {
  return effectiveLayout.value ? resolveLayoutStyle(effectiveLayout.value) : {};
});
</script>

<template>
  <div
    :id="uid"
    ref="elementRef"
    class="omnipad-root-layer omnipad-prevent"
    :class="customClasses"
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
