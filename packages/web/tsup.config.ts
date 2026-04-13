import { defineConfig } from 'tsup';

export default defineConfig({
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
  clean: true,
  dts: true,
  minify: true,
  sourcemap: false,
  splitting: true,
  treeshake: true,
  outDir: 'dist',
  external: [],
});
