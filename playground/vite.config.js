import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    // port: 8080,
  },
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        guest: resolve(__dirname, 'guest.html'),
      },
    },
  },
  // resolve: {
  //   alias: {
  //     '@omnipad/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
  //     '@omnipad/core/utils': path.resolve(__dirname, '../packages/core/src/utils/index.ts'),
  //     '@omnipad/vue': path.resolve(__dirname, '../packages/vue/src/index.ts')
  //   }
  // }
});
