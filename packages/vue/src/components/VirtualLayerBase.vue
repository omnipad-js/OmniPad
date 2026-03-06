<script setup lang="ts">
import { ConfigTreeNode } from '@omnipad/core';
import { getComponent } from '../utils/componentRegistry';
import { computed } from 'vue';

const props = defineProps<{
  nodes: ConfigTreeNode[];
}>();

const renderNodes = computed(() => {
  return (props.nodes || []).map((node) => {
    const component = getComponent(node.config?.baseType || node.type);

    return {
      node,
      component,
    };
  });
});
</script>

<template>
  <div class="omnipad-virtual-layer-base omnipad-prevent">
    <component
      v-for="item in renderNodes"
      :key="item.node.uid"
      :is="item.component"
      :tree-node="item.node"
    />

    <slot />
  </div>
</template>

<style scoped>
.omnipad-virtual-layer-base {
  position: absolute;
  inset: 0;
  /* [核心]：图层本身不接收事件，确保不阻挡下方的模拟器 */
  pointer-events: none;
  z-index: 1000;
}

/* [关键]：确保子组件（Zone/Button）能够重新接收事件 */
:deep(.omnipad-input-zone),
:deep(.omnipad-button) {
  pointer-events: auto;
}
</style>
