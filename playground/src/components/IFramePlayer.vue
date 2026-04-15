<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import DemoIntro from './DemoIntro.vue';

const props = defineProps<{
  swfUrl: string | null;
  /**
   * 为了模拟真实的跨域环境或沙箱环境，
   * 我们需要一个独立的 guest.html 来承载 Ruffle 和接收器。
   */
  guestUrl?: string;
}>();

const iframeRef = ref<HTMLIFrameElement | null>(null);

// 向 iframe 内部发送指令 (让内部的 Ruffle 加载特定的 SWF)
// 注意：这不是 OmniPad 的鼠标/键盘指令，这是业务指令
const loadSwfIntoIframe = (url: string) => {
  if (iframeRef.value && iframeRef.value.contentWindow) {
    console.log('[Playground] Sending SWF URL to Guest Iframe:', url);
    iframeRef.value.contentWindow.postMessage(
      {
        type: 'BUSINESS_LOAD_SWF',
        url: url,
      },
      window.location.origin,
    );
  }
};

// 监听 URL 变化，通知 iframe 更新
watch(
  () => props.swfUrl,
  (newUrl) => {
    if (newUrl) loadSwfIntoIframe(newUrl);
  },
);

// 监听 iframe 加载完成，发送初始 URL
const onIframeLoad = () => {
  console.log('[Playground] Guest Iframe Loaded.');
  if (props.swfUrl) {
    loadSwfIntoIframe(props.swfUrl);
  }
};

onMounted(() => {
  // 初始化逻辑现在全在 guest.html 里了
});
</script>

<template>
  <div class="iframe-wrapper">
    <div class="iframe-container">
      <DemoIntro v-if="!swfUrl" />

      <!-- 
        核心：这是一个原生的 iframe。
        我们把 src 指向 public/guest.html 
      -->
      <iframe
        v-show="swfUrl"
        ref="iframeRef"
        class="game-iframe"
        :src="guestUrl || './guest.html'"
        frameborder="0"
        scrolling="no"
        allowfullscreen
        @load="onIframeLoad"
      ></iframe>
    </div>
  </div>
</template>

<style scoped>
.iframe-wrapper {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  display: flex;
  justify-content: center;
  align-items: center;
}

.iframe-container {
  width: 100%;
  height: 100%;
  background: #000;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  position: relative;
}

.game-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
