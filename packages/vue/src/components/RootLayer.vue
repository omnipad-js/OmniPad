<script setup lang="ts">
import { ConfigTreeNode, RootLayerCore, BaseConfig, CMP_TYPES } from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualLayerBase from './VirtualLayerBase.vue';

const props = defineProps<{
  /** The runtime tree node for auto-configuration. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this layer. Used for profile serialization. */
  widgetId?: string;
}>();

const { uid, config } = useWidgetConfig<BaseConfig>(CMP_TYPES.ROOT_LAYER, props);

const { elementRef } = useCoreEntity(() => new RootLayerCore(uid.value, config.value));
</script>

<template>
  <div :id="uid" ref="elementRef" class="omnipad-virtual-layer">
    <VirtualLayerBase :nodes="treeNode?.children || []">
      <slot />
    </VirtualLayerBase>
  </div>
</template>

<style scoped>
.omnipad-virtual-layer {
  position: relative;
  height: 100%;
  width: 100%;
  pointer-events: none;
}
</style>
