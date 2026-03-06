<script setup lang="ts">
import { ConfigTreeNode, LayoutBox } from '@omnipad/core';
import { VirtualTrackpad } from '@omnipad/vue';

const props = defineProps<{
  treeNode?: ConfigTreeNode;
  widgetId?: string;
  label?: string;
  sensitivity?: number;
  targetStageId?: string;
  layout?: LayoutBox;
}>();
</script>

<template>
  <!-- 包装原有的 VirtualTrackpad -->
  <VirtualTrackpad v-bind="props" class="fancy-tp">
    <!-- 1. 重写底座 (base slot) -->
    <template #base="{ isActive }">
      <div class="glow-box" :class="{ 'is-active': isActive }">
        <div class="scan-line"></div>
      </div>
    </template>

    <!-- 2. 重写内容 (default slot) -->
    <template #default="slotProps">
      <span class="custom-label">{{ slotProps.label }}</span>
    </template>
  </VirtualTrackpad>
</template>

<style scoped>
.fancy-tp {
  --omnipad-btn-border-color: #00f2ff;
}

.glow-box {
  position: absolute;
  inset: 0;
  background: rgba(0, 242, 255, 0.05);
  border: 2px solid #00f2ff;
  box-shadow: inset 0 0 15px rgba(0, 242, 255, 0.2);
  transition: all 0.3s;
  overflow: hidden;
}

.glow-box.is-active {
  background: rgba(0, 242, 255, 0.2);
  box-shadow: inset 0 0 30px rgba(0, 242, 255, 0.5);
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00f2ff, transparent);
  animation: scan 2s linear infinite;
}

@keyframes scan {
  from {
    top: -10%;
  }
  to {
    top: 110%;
  }
}

.custom-label {
  font-size: 10px;
  color: #00f2ff;
  letter-spacing: 2px;
  text-shadow: 0 0 5px #00f2ff;
}
</style>
