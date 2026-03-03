<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  RootLayer,
  InputZone,
  VirtualKeyboardButton,
  VirtualMouseButton,
  VirtualTrackpad,
} from '@omnipad/vue';
import {
  exportProfile,
  InputManager,
  parseProfileJson,
  parseProfileTree,
  Registry,
  OmniPad,
} from '@omnipad/core';
import ConfigConsole from './components/ConfigConsole.vue';
import RufflePlayer from './components/RufflePlayer.vue';

const jsonText = ref('{}'); // 文本框内容
const treeRoot = ref<any>(null); // 当前运行时的树根
const showConfig = ref(false);

const currentSwf = ref<string | null>(null);

// 处理文件选择
const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    // 释放之前的内存 URL (如果有)
    if (currentSwf.value?.startsWith('blob:')) {
      URL.revokeObjectURL(currentSwf.value);
    }
    // 创建本地预览 URL
    currentSwf.value = URL.createObjectURL(file);
  }
};

const loadConfig = () => {
  try {
    const raw = JSON.parse(jsonText.value);
    const safeProfile = parseProfileJson(raw);
    // 生成新的树，这会导致 VirtualLayerBase 重新卸载并挂载所有组件
    treeRoot.value = parseProfileTree(safeProfile);
    console.log(
      '[Playground] Config Loaded into TreeNode.',
      Registry.getInstance().getAllEntities().length,
    );
  } catch (e: any) {
    alert('读取失败: ' + e.message);
  }
};

// --- 动作 2: 保存 ---
const saveConfig = () => {
  // 从 Registry 中抓取所有实体，并将它们序列化
  // 传入 treeRoot.value.uid 确保我们知道谁是根
  const exported = exportProfile(
    { name: 'Exported Profile', version: '1.0', author: 'Playground' },
    '$managed-root',
  );

  // 回填到文本框
  jsonText.value = JSON.stringify(exported, null, 2);
  console.log('[Playground] Profile Serialized from Registry.');
};

import demoRaw from './profiles/platformer.json';
onMounted(() => {
  InputManager.getInstance().init();
  jsonText.value = JSON.stringify(demoRaw, null, 2);
  loadConfig();
});

const toggleFullscreen = () => {
  InputManager.getInstance().toggleFullscreen();
};
</script>

<template>
  <div class="playground-root">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="logo">OmniPad Playground</div>
      <div class="file-input">
        <label for="swf-upload" class="upload-btn">Import SWF</label>
        <input id="swf-upload" type="file" accept=".swf" @change="onFileChange" hidden />
        <button class="upload-btn" @pointerdown="() => (showConfig = !showConfig)">Config</button>
        <button class="upload-btn" @pointerdown="toggleFullscreen">Fullscreen</button>
      </div>
    </header>

    <!-- 主显示区 -->
    <main class="viewport">
      <RufflePlayer
        :swf-url="currentSwf"
        widget-id="$ruffle-player"
        cursor-enabled
        :cursor-auto-delay="3000"
      />
    </main>

    <div class="main-root-layer">
      <RootLayer widget-id="$managed-root" :tree-node="treeRoot" />
      <!-- <RootLayer widget-id="$managed-root"> -->
      <!-- <InputZone :layout="{ left: 0, bottom: 0, width: '30%', height: '70%' }">
          <VirtualKeyboardButton
            label="LEFT"
            target-stage-id="$ruffle-player"
            :mapping="OmniPad.Keys.ArrowLeft"
            :layout="{ left: '30%', top: '70%', width: '80px', height: '80px', anchor: 'center' }"
          ></VirtualKeyboardButton>
          <VirtualKeyboardButton
            label="RIGHT"
            target-stage-id="$ruffle-player"
            :mapping="OmniPad.Keys.ArrowRight"
            :layout="{ left: '55%', top: '70%', width: '80px', height: '80px', anchor: 'center' }"
          ></VirtualKeyboardButton>
        </InputZone>

        <InputZone :layout="{ right: 0, bottom: 0, width: '30%', height: '70%' }">
          <VirtualKeyboardButton
            label="UP"
            target-stage-id="$ruffle-player"
            :mapping="OmniPad.Keys.ArrowUp"
            :layout="{ left: '70%', top: '70%', width: '80px', height: '80px', anchor: 'center' }"
          ></VirtualKeyboardButton>
          <template #dynamicWidget>
            <VirtualKeyboardButton
              label="SPACE"
              target-stage-id="$ruffle-player"
              :mapping="OmniPad.Keys.Space"
              :layout="{ width: '80px', height: '80px', anchor: 'center' }"
            ></VirtualKeyboardButton>
          </template>
        </InputZone> -->
      <!-- </RootLayer> -->
    </div>

    <ConfigConsole
      v-model="jsonText"
      v-show="showConfig"
      @load="loadConfig"
      @save="saveConfig"
      style="position: absolute; top: 0; right: 0; bottom: 0"
    />
  </div>
</template>

<style>
/* 基础重置 */
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  background: #111;
  color: #eee;
  font-family: sans-serif;
}

.playground-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.main-root-layer {
  position: absolute;
  height: 100%;
  width: 100%;
  pointer-events: none;
}

.toolbar {
  height: 50px;
  background: #222;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  border-bottom: 1px solid #333;
}

.upload-btn {
  background: #ffba43;
  color: #000;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 13px;
  margin-right: 10px;
}

.viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.console {
  height: 30px;
  background: #000;
  font-family: monospace;
  font-size: 11px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: #0f0;
}
</style>
