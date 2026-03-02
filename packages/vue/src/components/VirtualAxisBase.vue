<script setup lang="ts">
import { computed } from 'vue';
import { LayoutBox, resolveLayoutStyle, Vec2 } from '@omnipad/core';

const props = defineProps<{
  layout?: LayoutBox;
  isActive?: boolean;
  vector?: Vec2;
  showStick?: boolean;
  baseRadius?: Vec2; // 核心：由父组件传进来的绝对像素半径
}>();

const containerStyle = computed(() => {
  return props.layout ? resolveLayoutStyle(props.layout) : {};
});

// 革命性的动态渲染方式：完全基于 GPU 加速的 translate3d
const stickStyle = computed(() => {
  const vx = props.vector?.x || 0;
  const vy = props.vector?.y || 0;
  const rx = props.baseRadius?.x || 0;
  const ry = props.baseRadius?.y || 0;

  // 物理偏移像素
  const tx = vx * rx;
  const ty = vy * ry;

  return {
    // calc(-50% + Xpx) 完美解决了“自身居中偏移”和“相对父级位移”的结合
    transform: `translate3d(calc(-50% + ${tx}px), calc(-50% + ${ty}px), 0)`,
    // 松手时加一点回弹过渡，活动时取消过渡保证绝对跟手
    transition: props.isActive ? 'none' : 'transform 0.1s ease-out',
  };
});
</script>

<template>
  <div
    class="omnipad-axis-base"
    :class="{ 'is-active': isActive }"
    :style="containerStyle"
    tabindex="-1"
  >
    <!-- 第一层：底座背景，供复写 -->
    <div class="omnipad-axis-bg">
      <slot name="base" :is-active="isActive" :vector="vector"></slot>
    </div>

    <!-- 第二层：浮标/柄头，独立管控 transform -->
    <div v-if="showStick" class="omnipad-axis-stick-container" :style="stickStyle">
      <slot name="stick" :is-active="isActive" :vector="vector">
        <div class="omnipad-default-stick" :class="{ 'is-active': isActive }"></div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.omnipad-axis-base {
  position: absolute;
  /* 基础重置 */
  user-select: none;
  touch-action: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.omnipad-axis-bg {
  position: absolute;
  inset: 0;
  pointer-events: none; /* 事件穿透给最外层容器 */
}

/* 浮标的锚点固定在基座中心 */
.omnipad-axis-stick-container {
  position: absolute;
  left: 50%;
  top: 50%;
  pointer-events: none;
  /* transform 将被内联样式覆盖 */
}

.omnipad-default-stick {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}
.omnipad-default-stick.is-active {
  background: var(--wvg-active-bg, rgba(255, 186, 67, 0.6));
  border-color: var(--wvg-active-border, #ffba43);
}
</style>
