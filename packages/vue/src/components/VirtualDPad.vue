<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import {
  ConfigTreeNode,
  type DPadConfig,
  DPadCore,
  type DPadState,
  type LayoutBox,
  CMP_TYPES,
  KEYS,
} from '@omnipad/core';
import { useCoreEntity } from '../composables/useCoreEntity';
import { useWidgetConfig } from '../composables/useWidgetConfig';
import VirtualAxisBase from './VirtualAxisBase.vue';

interface VirtualDPadProps {
  treeNode?: ConfigTreeNode;
  widgetId?: string;
  targetStageId?: string;
  mapping?: DPadConfig['mapping'];
  threshold?: number;
  showStick?: boolean;
  layout?: LayoutBox;
}

const props = defineProps<VirtualDPadProps>();
const defaultProps = {
  mapping: {
    up: KEYS.ArrowUp,
    down: KEYS.ArrowDown,
    left: KEYS.ArrowLeft,
    right: KEYS.ArrowRight,
  },
  showStick: false,
  threshold: 0.3,
};

// 整合配置
const { uid, config } = useWidgetConfig<DPadConfig>(CMP_TYPES.D_PAD, props, defaultProps);

// 桥接 Core
const { core, state, elementRef } = useCoreEntity<DPadCore, DPadState>(
  () => new DPadCore(uid.value, config.value),
);

// [关键计算]：实时提供 baseRadius 给基座
const baseRadius = ref({ x: 0, y: 0 });
// 监听元素尺寸变化并更新半径
watchEffect(() => {
  // 假设 elementRef.value 被 useCoreBridge 内置的 ResizeObserver 追踪，或者依赖 Vue 响应式。
  // 最稳妥的方法是，从 Core 那里拿到实时的 Rect。
  const rect = core.value?.getRect();
  if (rect) {
    baseRadius.value = { x: rect.width / 2, y: rect.height / 2 };
  }
});

// 转发交互
const onPointerDown = (e: PointerEvent) => core.value?.onPointerDown(e);
const onPointerMove = (e: PointerEvent) => core.value?.onPointerMove(e);
const onPointerUp = (e: PointerEvent) => core.value?.onPointerUp(e);
const onPointerCancel = (e: PointerEvent) => core.value?.onPointerCancel(e);

// 暴露转发方法
defineExpose({
  uid,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
});
</script>

<template>
  <VirtualAxisBase
    ref="elementRef"
    :layout="config.layout"
    :is-active="state?.isActive"
    :vector="state?.vector"
    :show-stick="config.showStick"
    :base-radius="baseRadius"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  >
    <!-- [经典重现]：绘制 D-Pad 的十字背景 -->
    <template #base="{ vector }">
      <div class="dpad-cross-bg">
        <!-- 上 -->
        <div class="dpad-arm top" :class="{ on: vector && vector.y < -config.threshold! }"></div>
        <!-- 下 -->
        <div class="dpad-arm bottom" :class="{ on: vector && vector.y > config.threshold! }"></div>
        <!-- 左 -->
        <div class="dpad-arm left" :class="{ on: vector && vector.x < -config.threshold! }"></div>
        <!-- 右 -->
        <div class="dpad-arm right" :class="{ on: vector && vector.x > config.threshold! }"></div>
        <!-- 核心占位符 -->
        <div class="dpad-center"></div>
      </div>
    </template>
  </VirtualAxisBase>
</template>

<style scoped>
.dpad-cross-bg {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  /* 一个微弱的底圆指示触控范围 */
  background: rgba(255, 255, 255, 0.05);
  
  pointer-events: auto;
}

/* 用绝对定位拼出一个十字架 */
.dpad-arm {
  position: absolute;
  background: var(--wvg-btn-bg, rgba(255, 255, 255, 0.2));
  border: var(--wvg-btn-border, 2px solid rgba(255, 255, 255, 0.4));
  transition:
    background 0.1s,
    transform 0.1s;
}

.dpad-arm.top {
  top: 0;
  bottom: 66%;
  left: 33%;
  right: 33%;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}
.dpad-arm.bottom {
  top: 66%;
  bottom: 0;
  left: 33%;
  right: 33%;
  border-top: none;
  border-radius: 0 0 8px 8px;
}
.dpad-arm.left {
  top: 33%;
  bottom: 33%;
  left: 0;
  right: 66%;
  border-right: none;
  border-radius: 8px 0 0 8px;
}
.dpad-arm.right {
  top: 33%;
  bottom: 33%;
  left: 66%;
  right: 0;
  border-left: none;
  border-radius: 0 8px 8px 0;
}
.dpad-center {
  position: absolute;
  inset: 33%;
  background: var(--wvg-btn-bg, rgba(255, 255, 255, 0.2));
}

/* 激活反馈 */
.dpad-arm.on {
  background: var(--wvg-active-bg, rgba(255, 186, 67, 0.6));
  border-color: var(--wvg-active-border, #ffba43);
  /* 往内陷一点的效果 */
  transform: scale(0.95);
}
</style>
