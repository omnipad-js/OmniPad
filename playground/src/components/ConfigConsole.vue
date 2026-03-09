<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  modelValue: string; // 文本框内的 JSON 字符串
}>();

const emit = defineEmits(['update:modelValue', 'load', 'save']);

const internalText = ref(props.modelValue);

const handleLoad = () => {
  emit('update:modelValue', internalText.value);
  emit('load');
};

const handleSave = () => {
  emit('save');
  // 保存动作发生后，App.vue 会更新 modelValue，我们需要同步到 internalText
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
    <div class="actions">
      <button class="load-btn" @click="handleLoad">📥 Config -> DOM</button>
      <button class="save-btn" @click="handleSave">📤 DOM -> Config</button>
    </div>
    <textarea
      v-model="internalText"
      placeholder="Paste config JSON here..."
      spellcheck="false"
    ></textarea>
  </div>
</template>

<style scoped>
.config-console {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #222;
  padding: 15px;
  border-left: 2px solid #444;
  z-index: 10000;
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
</style>
