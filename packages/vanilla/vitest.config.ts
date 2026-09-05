import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
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
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
    },
  },
});
