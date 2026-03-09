<script setup lang="ts">
import { computed } from 'vue';
import { type LayoutBox, type Vec2 } from '@omnipad/core';
import { resolveLayoutStyle, supportsContainerQueries } from '@omnipad/core/utils';

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
  const cx = canUseNativeCQ ? `100cqw` : `${rx * 2}px`;
  const cy = canUseNativeCQ ? `100cqh` : `${ry * 2}px`;

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
    class="omnipad-axis-base omnipad-prevent"
    :class="{ 'is-active': isActive }"
    :style="containerStyle"
    tabindex="-1"
  >
    <!-- 底座背景，供复写 -->
    <div class="omnipad-axis-bg">
      <slot name="base" :is-active="isActive" :vector="vector"></slot>
    </div>

    <!-- 浮标/柄头，独立管控 transform -->
    <div v-if="showStick" class="omnipad-axis-stick-container" :style="stickStyle">
      <slot name="stick" :is-active="isActive" :vector="vector">
        <div class="omnipad-default-axis-stick" :class="{ 'is-active': isActive }"></div>
      </slot>
    </div>

    <div class="omnipad-axis-content-layer">
      <slot :is-active="isActive" :vector="vector"></slot>
    </div>
  </div>
</template>

<style scoped>
.omnipad-axis-base {
  position: relative;
  box-sizing: border-box;
  pointer-events: auto;

  /* for Container Queries */
  container-type: size;
}

.omnipad-axis-bg {
  box-sizing: border-box;
  border-color: var(--omnipad-axis-base-border-color);
  border-radius: var(--omnipad-axis-base-border-radius);
  border-style: var(--omnipad-axis-base-border-style);
  border-width: var(--omnipad-axis-base-border-width);
  background: var(--omnipad-axis-base-bg);
}

.omnipad-axis-bg,
.omnipad-axis-content-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
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
