<script setup lang="ts">
import { computed } from 'vue';
import { type LayoutBox } from '@omnipad/core';
import { resolveLayoutStyle } from '@omnipad/core/utils';

const props = defineProps<{
  layout?: LayoutBox;
  isActive?: boolean;
  label?: string;
}>();

// 解析容器样式
const containerStyle = computed(() => {
  return props.layout ? resolveLayoutStyle(props.layout) : {};
});
</script>

<template>
  <div class="omnipad-button-base omnipad-prevent" :style="containerStyle" tabindex="-1">
    <slot name="base" :is-active="isActive" :label="label">
      <div class="omnipad-default-button-base" :class="{ 'is-active': isActive }"></div>
    </slot>

    <div class="omnipad-button-content-layer">
      <slot :is-active="isActive" :label="label">
        <span v-if="label" class="omnipad-default-button-label">{{ label }}</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.omnipad-button-base {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  pointer-events: auto;

  will-change: transform, opacity;
}

.omnipad-default-button-base {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.omnipad-button-content-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.omnipad-default-button-base.is-active {
  background: var(--omnipad-btn-pressed-bg, rgba(255, 255, 255, 0.4));
  border-color: var(--omnipad-btn-pressed-border-color);
  opacity: var(--omnipad-btn-pressed-opacity);
}

.omnipad-default-button-label {
  font-family: var(--omnipad-btn-font-family);
  font-size: var(--omnipad-btn-font-size);
  color: var(--omnipad-btn-label-color);
  font-weight: var(--omnipad-btn-font-weight);
}
</style>
