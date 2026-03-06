<script setup lang="ts">
import {
  ConfigTreeNode,
  RootLayerCore,
  BaseConfig,
  CMP_TYPES,
  LayoutBox,
  resolveLayoutStyle,
} from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualLayerBase from './VirtualLayerBase.vue';
import { computed } from 'vue';

const props = defineProps<{
  /** The runtime tree node for auto-configuration. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this layer. Used for profile serialization. */
  widgetId?: string;

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}>();

const { uid, config } = useWidgetConfig<BaseConfig>(CMP_TYPES.ROOT_LAYER, props);

const { elementRef } = useCoreEntity(() => new RootLayerCore(uid.value, config.value));

const containerStyle = computed(() => resolveLayoutStyle(config.value.layout));
</script>

<template>
  <div
    :id="uid"
    ref="elementRef"
    class="omnipad-root-layer omnipad-prevent"
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
