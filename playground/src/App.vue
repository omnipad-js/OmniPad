<script setup lang="ts">
import { ref, computed, onBeforeMount, onMounted } from 'vue';
import RufflePlayer from './components/RufflePlayer.vue';
import ConfigConsole from './components/ConfigConsole.vue';
import { registerComponent, RootLayer } from '@omnipad/vue';
import { GamepadManager, Registry, WindowManager } from '@omnipad/core';
import { parseProfileJson, parseProfileTrees, exportProfile } from '@omnipad/core/utils';
import CustomTrackpad from './components/CustomTrackpad.vue';

const jsonText = ref('{}'); // 文本框内容
const forest = ref<any>(null); // 当前运行时的树根
const loadCount = ref(0); // 加载计数器，配合 vue 的 key 实现强制重载
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

    const { roots, runtimeGamepadMappings } = parseProfileTrees(safeProfile);

    forest.value = roots;
    loadCount.value++;
    console.log(
      '[Playground] Config Loaded into TreeNode.',
      Registry.getInstance().getAllEntities().length,
    );

    if (runtimeGamepadMappings) {
      GamepadManager.getInstance().setConfig(runtimeGamepadMappings);
      GamepadManager.getInstance().start();
    } else {
      GamepadManager.getInstance().stop();
    }
  } catch (e: any) {
    alert('读取失败: ' + e.message);
  }
};
// --- 导出逻辑：同时指定多个根 ---
const saveConfig = (selectedRoots: string[]) => {
  const runtimeGamepadMappings = GamepadManager.getInstance().getConfig();
  const exported = exportProfile(
    { name: 'Flex Export', version: '1.0', author: 'Omnipad', description: 'Enter text.' },
    selectedRoots,
    runtimeGamepadMappings ?? [],
  );

  // 回填到文本框
  jsonText.value = JSON.stringify(exported, null, 2);
  console.log('[Playground] Profile Serialized from Registry.');
};

const closeConfig = () => (showConfig.value = false);

const toggleFullscreen = () => {
  WindowManager.getInstance().toggleFullscreen();
};

const renderLeftPad = computed(() => {
  return forest.value ? forest.value['$left-pad'] : {};
});

const renderRightPad = computed(() => {
  return forest.value ? forest.value['$right-pad'] : {};
});

const renderPlayer = computed(() => {
  return forest.value ? forest.value['$ruffle-player'] : {};
});

// 注册自定义触摸板
onBeforeMount(() => {
  registerComponent('random-trackpad', CustomTrackpad);
});

onMounted(() => {
  WindowManager.getInstance().init();
});
</script>

<template>
  <div class="playground-root">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="logo">
        OmniPad Playground
        <a href="https://github.com/omnipad-js/omnipad" class="github-tag" target="_blank">
          &nbsp;<img
            src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"
            alt="GitHub"
          />
        </a>
      </div>
      <div class="file-input">
        <label for="swf-upload" class="upload-btn">Import SWF</label>
        <input id="swf-upload" type="file" accept=".swf" @change="onFileChange" hidden />
        <button class="upload-btn" @pointerdown="() => (showConfig = !showConfig)">Config</button>
        <button class="upload-btn" @pointerdown="toggleFullscreen">Fullscreen</button>
      </div>
    </header>
    <!-- 主交互区域：这是 Flex 布局的战场 -->
    <main class="game-flex-container">
      <!-- [左侧/下方左半] 输入分区 -->
      <section class="flex-item side-panel left">
        <RootLayer
          v-if="renderLeftPad"
          widget-id="$left-pad"
          :tree-node="renderLeftPad"
          :key="`left-${loadCount}`"
        >
          <div v-if="renderLeftPad?.config?.hasStaticTrackpad" class="static-trackpad">
            <CustomTrackpad
              :layout="{
                top: 0,
                left: 0,
                height: '100%',
                width: '100%',
              }"
              target-stage-id="$ruffle-player"
              label="STATIC TRACKPAD (1x sensitivity)"
            ></CustomTrackpad>
          </div>
        </RootLayer>
      </section>

      <!-- [中间/上方全宽] 游戏核心区 -->
      <section class="flex-item-two main-stage">
        <RufflePlayer
          :swf-url="currentSwf"
          widget-id="$ruffle-player"
          cursor-enabled
          :tree-node="renderPlayer"
          :load-count="loadCount"
        />
      </section>

      <!-- [右侧/下方右半] 输入分区 -->
      <section class="flex-item side-panel right">
        <RootLayer
          v-if="renderRightPad"
          widget-id="$right-pad"
          :tree-node="renderRightPad"
          :key="`right-${loadCount}`"
        />
      </section>
    </main>

    <!-- 底部控制台 -->
    <ConfigConsole
      v-model="jsonText"
      v-show="showConfig"
      @load="loadConfig"
      @save="saveConfig"
      @close="closeConfig"
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

.github-tag img {
  vertical-align: middle;
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

.game-flex-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.flex-item {
  position: relative; /* 必须为 relative，让内部组件的 LayoutBox 生效 */
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* =========================================
   横屏模式：左 | 中 | 右 (1:1:1)
   ========================================= */
@media (orientation: landscape) {
  .game-flex-container {
    flex-direction: row;
  }
  .flex-item {
    flex: 1;
  }
  .flex-item-two {
    flex: 2;
  }
}

/* =========================================
   竖屏模式：
   上 (Stage)
   下 (Left | Right)
   ========================================= */
@media (orientation: portrait) {
  .game-flex-container {
    flex-direction: column;
    height: 50vh;
  }

  .main-stage {
    flex: 1; /* 占据上半部分 */
    width: 100%;
  }

  /* 下半部分需要并排显示左右两个分区 */
  .side-panel {
    position: absolute;
    bottom: 0;
    height: 50%; /* 占据下半部分 */
    width: 50%;
  }

  .side-panel.left {
    left: 0;
  }
  .side-panel.right {
    right: 0;
  }
}

/* 调试：给分区加个暗色，方便识别范围 */
.side-panel {
  background: rgba(255, 255, 255, 0.02);
  z-index: 100;
}
.main-stage {
  background: #000;
}

/* 自定义样式 */

.playground-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.static-trackpad {
  height: 100%;
  width: 100%;
  display: var(--static-trackpad-display, none);
}

.show-static-trackpad {
  --static-trackpad-display: show;
}

.round-button {
  --omnipad-btn-radius: 50%;
}

.red-team {
  filter: brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(30) brightness(1.2);
}

.blue-team {
  filter: brightness(0.5) sepia(1) hue-rotate(190deg) saturate(30) brightness(1.2);
}
</style>
