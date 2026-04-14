<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import {
  DPadCore,
  OmniPad,
  type ConfigTreeNode,
  type DPadConfig,
  type DPadState,
  type LayoutBox,
} from '@omnipad/core';
import { supportsContainerQueries } from '@omnipad/web';
import VirtualAxisBase from './VirtualAxisBase.vue';
import { useWidgetSetup } from '../composables/useWidgetSetup';

/**
 * Props for the Virtual D-Pad component.
 */
interface VirtualDPadProps {
  /** The runtime tree node for automatic setup. */
  treeNode?: ConfigTreeNode;

  /** Unique configuration ID (CID) for this D-pad. Used for profile serialization. */
  widgetId?: string;

  /** The ID (CID) of the TargetZone this D-pad sends signals to, usually global ID. */
  targetStageId?: string;

  /** Defines the specific actions or key signals emitted for each cardinal direction. */
  mapping?: DPadConfig['mapping'];

  /**
   * Determines the minimum travel distance required to trigger a direction.
   * @default 0.3
   */
  threshold?: number;

  /**
   * Controls the visibility of the internal floating feedback handle (stick).
   * @default false
   */
  showStick?: {
    type: boolean;
    default: undefined;
  };

  /** Spatial layout configuration relative to its parent zone. */
  layout?: LayoutBox;
}

const props = defineProps<VirtualDPadProps>();
const defaultProps = {
  showStick: false,
  threshold: 0.3,
};

const { uid, core, state, domEvents, effectiveConfig, effectiveLayout, elementRef } =
  useWidgetSetup<DPadCore, DPadState, DPadConfig>(OmniPad.Types.D_PAD, props, { defaultProps });

const canUseNativeCQ = supportsContainerQueries();

// 兼容：实时提供 baseSize 给基座
const baseSize = ref({ x: 0, y: 0 });
// 监听元素尺寸变化并更新半径
const stopBaseRect = watchEffect(() => {
  const rect = core.value?.rect;
  if (rect) {
    baseSize.value = { x: rect.width, y: rect.height };
  }
});

// 如果浏览器支持 ContainerQueries，直接结束 baseRadius 实时获取
if (canUseNativeCQ) stopBaseRect();

// 转发交互
const onPointerDown = (e: PointerEvent) => domEvents?.onPointerDown?.(e);
const onPointerMove = (e: PointerEvent) => domEvents?.onPointerMove?.(e);
const onPointerUp = (e: PointerEvent) => domEvents?.onPointerUp?.(e);
const onPointerCancel = (e: PointerEvent) => domEvents?.onPointerCancel?.(e);

// 暴露转发方法
defineExpose({
  uid,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  markRectDirty: () => core.value?.markRectDirty(),
});
</script>

<template>
  <VirtualAxisBase
    :id="uid"
    ref="elementRef"
    class="omnipad-dpad omnipad-prevent"
    :class="effectiveConfig?.cssClass"
    :layout="effectiveLayout"
    :is-active="state?.isActive"
    :vector="state?.vector"
    :show-stick="effectiveConfig?.showStick"
    :base-size="baseSize"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  >
    <template #base="slotProps">
      <slot name="base" v-bind="slotProps">
        <!-- 默认经典的 D-Pad 十字渲染 -->
        <div class="omnipad-dpad-cross-bg">
          <div
            class="dpad-arm top"
            :class="{ on: slotProps.vector && slotProps.vector.y < -effectiveConfig?.threshold! }"
          ></div>
          <div
            class="dpad-arm bottom"
            :class="{ on: slotProps.vector && slotProps.vector.y > effectiveConfig?.threshold! }"
          ></div>
          <div
            class="dpad-arm left"
            :class="{ on: slotProps.vector && slotProps.vector.x < -effectiveConfig?.threshold! }"
          ></div>
          <div
            class="dpad-arm right"
            :class="{ on: slotProps.vector && slotProps.vector.x > effectiveConfig?.threshold! }"
          ></div>
          <div class="dpad-center"></div>
        </div>
      </slot>
    </template>

    <template #stick="slotProps">
      <slot name="stick" v-bind="slotProps" />
    </template>

    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </VirtualAxisBase>
</template>

<style scoped>
.omnipad-dpad-cross-bg {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--omnipad-dpad-border-radius);
  background: var(--omnipad-dpad-bg);
  pointer-events: none;
}

/* 用绝对定位拼出一个十字架 */
.dpad-arm {
  position: absolute;
  background: var(--omnipad-dpad-arm-bg);
  border: var(--omnipad-dpad-arm-border);
  box-sizing: border-box;
  transition:
    background 0.1s,
    transform 0.1s,
    border-color 0.1s;
}

/* 4个方向臂的布局定义 */
.dpad-arm.top {
  top: 0;
  bottom: 66%;
  left: 33%;
  right: 33%;
  border-bottom: none;
  border-radius: var(--omnipad-dpad-arm-border-radius) var(--omnipad-dpad-arm-border-radius) 0 0;
}
.dpad-arm.bottom {
  top: 66%;
  bottom: 0;
  left: 33%;
  right: 33%;
  border-top: none;
  border-radius: 0 0 var(--omnipad-dpad-arm-border-radius) var(--omnipad-dpad-arm-border-radius);
}
.dpad-arm.left {
  top: 33%;
  bottom: 33%;
  left: 0;
  right: 66%;
  border-right: none;
  border-radius: var(--omnipad-dpad-arm-border-radius) 0 0 var(--omnipad-dpad-arm-border-radius);
}
.dpad-arm.right {
  top: 33%;
  bottom: 33%;
  left: 66%;
  right: 0;
  border-left: none;
  border-radius: 0 var(--omnipad-dpad-arm-border-radius) var(--omnipad-dpad-arm-border-radius) 0;
}

.dpad-center {
  position: absolute;
  inset: 33%;
  background: var(--omnipad-dpad-arm-bg);
  z-index: 1;
}

/* 激活反馈样式 */
.dpad-arm.on {
  background: var(--omnipad-dpad-active-bg);
  border-color: var(--omnipad-dpad-active-border);
  transform: var(--omnipad-dpad-active-transform);
  z-index: 2;
}
</style>
