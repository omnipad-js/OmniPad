import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@omnipad/core/utils',
        replacement: `${workspaceRoot}/packages/core/src/utils/index.ts`,
      },
      {
        find: '@omnipad/core/const',
        replacement: `${workspaceRoot}/packages/core/src/constants/index.ts`,
      },
      { find: '@omnipad/core', replacement: `${workspaceRoot}/packages/core/src/index.ts` },
      {
        find: '@omnipad/web/guest',
        replacement: `${workspaceRoot}/packages/web/src/guest/index.ts`,
      },
      { find: '@omnipad/web', replacement: `${workspaceRoot}/packages/web/src/index.ts` },
      {
        find: '@omnipad/vue/style.css',
        replacement: `${workspaceRoot}/packages/vue/src/styles/index.css`,
      },
      { find: '@omnipad/vue', replacement: `${workspaceRoot}/packages/vue/src/index.ts` },
      {
        find: '@omnipad/vanilla/guest',
        replacement: `${workspaceRoot}/packages/vanilla/src/guest.ts`,
      },
      {
        find: '@omnipad/vanilla/style.css',
        replacement: `${workspaceRoot}/packages/vanilla/src/style.css`,
      },
      { find: '@omnipad/vanilla', replacement: `${workspaceRoot}/packages/vanilla/src/index.ts` },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      all: true,
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
    },
  },
});
