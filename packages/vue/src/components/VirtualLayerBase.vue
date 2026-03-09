<script setup lang="ts">
import { type ConfigTreeNode } from '@omnipad/core';
import { getComponent, getComponentSafe } from '../utils/componentRegistry';
import { computed } from 'vue';

const props = defineProps<{
  nodes: ConfigTreeNode[];
}>();

const renderNodes = computed(() => {
  return (props.nodes || []).map((node) => {
    // 尝试获取最匹配的组件
    let component = getComponentSafe(node.type);

    // 如果失败，尝试回退到基础类型 (例如自定义摇杆回退到普通摇杆)
    if (!component && node.config?.baseType) {
      component = getComponentSafe(node.config.baseType);
    }

    // 如果依然失败，调用原有的 getComponent 拿到警告占位符
    if (!component) {
      component = getComponent(node.type);
    }
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
