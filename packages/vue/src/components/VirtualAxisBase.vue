<script setup lang="ts">
import { computed } from 'vue';
import { LayoutBox, resolveLayoutStyle, supportsContainerQueries, Vec2 } from '@omnipad/core';

const props = defineProps<{
  layout?: LayoutBox;
  isActive?: boolean;
  vector?: Vec2;
  showStick?: boolean;
  baseRadius?: Vec2; // 兼容：由父组件传进来的绝对像素半径
}>();

const containerStyle = computed(() => {
  return props.layout ? resolveLayoutStyle(props.layout) : {};
});

const canUseNativeCQ = supportsContainerQueries();

// 杆头位置样式
const stickStyle = computed(() => {
  const vx = props.vector?.x || 0;
  const vy = props.vector?.y || 0;
  const rx = props.baseRadius?.x || 0;
  const ry = props.baseRadius?.y || 0;

  // 物理偏移像素
  const tx = canUseNativeCQ ? `${vx * 50}cqw` : `${vx * rx}px`;
  const ty = canUseNativeCQ ? `${vy * 50}cqh` : `${vy * ry}px`;

  // 杆头尺寸
  const cx = canUseNativeCQ ? `100cqw` : `${rx}px`;
  const cy = canUseNativeCQ ? `100cqh` : `${ry}px`;

  return {
    '--omnipad-axis-stick-container-x': tx,
    '--omnipad-axis-stick-container-y': ty,
    '--omnipad-axis-stick-width': cx,
    '--omnipad-axis-stick-height': cy,
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
        <div class="omnipad-default-axis-stick" :class="{ 'is-active': isActive }"></div>
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

  /* for Container Queries */
  container-type: size;
}

.omnipad-axis-bg {
  position: absolute;
  inset: 0;
  pointer-events: none; /* 事件穿透给最外层容器 */
}

/* 浮标的锚点固定在基座中心 */
.omnipad-axis-stick-container {
  width: calc(
    var(--omnipad-axis-stick-width, 0px) * var(--omnipad-default-axis-stick-width-scaler, 0.2)
  );
  height: calc(
    var(--omnipad-axis-stick-height, 0px) * var(--omnipad-default-axis-stick-height-scaler, 0.2)
  );

  position: absolute;
  left: 50%;
  top: 50%;
  pointer-events: none;

  transform: translate3d(
    calc(-50% + var(--omnipad-axis-stick-container-x, 0px)),
    calc(-50% + var(--omnipad-axis-stick-container-y, 0px)),
    0
  );

  --omnipad-axis-stick-container-x: 0px;
  --omnipad-axis-stick-container-y: 0px;
}
</style>
