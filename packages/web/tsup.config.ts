import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: {
    index: 'src/index.ts',
    'guest/index': 'src/guest/index.ts',
  },
  format: ['cjs', 'esm'],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
  clean: !options.watch,
  minify: !options.watch,
  dts: true,
  sourcemap: false,
  splitting: true,
  treeshake: true,
  outDir: 'dist',
  external: ['@omnipad/core'],
}));
