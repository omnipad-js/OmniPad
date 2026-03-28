import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue(), dts({ rollupTypes: true })],
  // resolve: {
  //   conditions: ['import', 'browser'],
  //   alias: {
  //     '@omnipad/core/utils': resolve(__dirname, '../core/dist/utils/index.mjs'),
  //     '@omnipad/core': resolve(__dirname, '../core/dist/index.mjs'),
  //   },
  // },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OmniPadVue',
      fileName: 'omnipad-vue',
    },
    rollupOptions: {
      external: [
        'vue',
        '@omnipad/core',
        '@omnipad/core/utils',
        '@omnipad/core/dom',
        /^@omnipad\/core\/.*/,
      ],
      output: {
        globals: {
          vue: 'Vue',
          '@omnipad/core': 'OmniPadCore',
          '@omnipad/core/utils': 'OmniPadCoreUtils',
          '@omnipad/core/dom': 'OmniPadCoreDom',
        },
        exports: 'named',
      },
    },
    outDir: 'dist',
  },
});
