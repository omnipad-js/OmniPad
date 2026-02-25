import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    dts({ rollupTypes: true }), // 自动生成类型声明
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OmnipadVue',
      fileName: 'omnipad-vue',
    },
    rollupOptions: {
      // 确保外部化 Vue，不打包进库
      external: ['vue', '@omnipad/core'],
      output: {
        globals: {
          vue: 'Vue',
          '@omnipad/core': 'OmniPadCore'
        },
      },
    },
  },
});
