import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  globalName: 'OmniPad',
  clean: !options.watch,
  minify: !options.watch,
  dts: true,
  sourcemap: false,
  splitting: true,
  treeshake: true,
  noExternal: ['@omnipad/core', '@omnipad/web'],
  outDir: 'dist',
}));