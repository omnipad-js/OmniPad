<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  modelValue: string; // 文本框内的 JSON 字符串
}>();

const emit = defineEmits(['update:modelValue', 'load', 'save', 'close']);

const internalText = ref(props.modelValue);

const availableRoots = ref(['$left-pad', '$ruffle-player', '$right-pad']);
const selectedRoots = ref<string[]>([]);

const getFriendlyName = (id: string) => {
  if (id === '$ruffle-player') return '📺 PLAYER';
  if (id.includes('left')) return '👈 LEFT';
  if (id.includes('right')) return '👉 RIGHT';
  return `📦 ${id}`;
};

// ==========================================
// 利用 Vite 批量导入 src/profiles 下的 JSON
// eager: true 表示在页面加载时就直接把 JSON 内容读进内存
// ==========================================
const profileModules = import.meta.glob('../profiles/*.json', { eager: true });

// 将扫描到的模块转换为下拉列表用的数组
const presets = Object.keys(profileModules).map((path) => {
  // 从路径中提取文件名，例如 '../profiles/gamepad.json' -> 'gamepad'
  const name = path.match(/\/([^/]+)\.json$/)?.[1] || path;
  return {
    name,
    // Vite 导入 JSON 时，内容默认放在 default 属性里
    content: (profileModules[path] as any).default || profileModules[path],
  };
});

const selectedPreset = ref(''); // 当前选中的预设名称

// 选择预设后，自动填入文本框并加载
const applyPreset = () => {
  if (!selectedPreset.value) return;
  const preset = presets.find((p) => p.name === selectedPreset.value);
  if (preset) {
    // 将对象转为格式化后的 JSON 字符串
    internalText.value = JSON.stringify(preset.content, null, 2);
    // 自动触发读取逻辑
    handleLoad();
  }
};

// ==========================================
// 读取与保存逻辑
// ==========================================

const handleLoad = () => {
  emit('update:modelValue', internalText.value);
  emit('load');
};

const handleSave = () => {
  emit('save', selectedRoots.value);
  // 保存动作发生后，App.vue 会更新 modelValue，需要同步到 internalText
};

const handleClose = () => {
  emit('close', selectedRoots.value);
};

// 监听外部 modelValue 变化（当保存成功回填时）
import { watch } from 'vue';
watch(
  () => props.modelValue,
  (newVal) => {
    internalText.value = newVal;
  },
);
</script>

<template>
  <div class="config-console">
    <!-- 预设工具栏 -->
    <div class="preset-toolbar">
      <button class="close-btn" @click="handleClose">&times;</button>
      <label>📚 PRESET: </label>
      <select v-model="selectedPreset" @change="applyPreset">
        <option value="" disabled>-- Select a Profile --</option>
        <option v-for="p in presets" :key="p.name" :value="p.name">
          {{ p.name }}
        </option>
      </select>
    </div>
    <textarea
      v-model="internalText"
      placeholder="Paste config JSON here..."
      spellcheck="false"
    ></textarea>
    <div class="export-section">
      <div class="checkbox-group">
        <label>SAVE: </label>
        <label v-for="rootId in availableRoots" :key="rootId" class="check-item">
          <input type="checkbox" :value="rootId" v-model="selectedRoots" />
          {{ getFriendlyName(rootId) }}
        </label>
      </div>
    </div>
    <div class="actions">
      <button class="load-btn" @click="handleLoad">💾 Config -> DOM 📥</button>
      <button class="save-btn" @click="handleSave">📤 DOM -> Config 💾</button>
    </div>
  </div>
</template>

<style scoped>
.config-console {
  display: flex;
  max-width: 90vw;
  flex-direction: column;
  gap: 10px;
  background: #222;
  padding: 15px;
  border-left: 2px solid #444;
  z-index: 10000;
}

.preset-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-size: 13px;
}

.preset-toolbar select {
  flex: 1;
  padding: 5px;
  background: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  outline: none;
}

.export-section {
  display: none;
}

.checkbox-group {
  display: flex;
  gap: 12px;
  background: #333;
  padding: 4px 10px;
  border-radius: 4px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  white-space: nowrap;
}

textarea {
  height: 90vh;
  background: #111;
  color: #0f0;
  border: 1px solid #444;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
}

.actions {
  display: flex;
  gap: 10px;
}

button {
  flex: 1;
  padding: 10px;
  cursor: pointer;
  font-weight: bold;
  border: none;
  border-radius: 4px;
}

.load-btn {
  background: #4caf50;
  color: white;
}
.save-btn {
  background: #2196f3;
  color: white;
}
button:hover {
  opacity: 0.9;
}

.close-btn {
  flex: none;
  display: block;
  background: none;
  border: none;
  padding: 0;
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;
  color: #fff;
  height: 44px;
  width: 44px;
}

.close-btn:hover {
  color: #ff0000;
}
</style>
