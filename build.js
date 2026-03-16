// build.js - Run with node build.js
import esbuild from 'esbuild';

const common = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  external: [], // zero deps
  platform: 'neutral',
};

await Promise.all([
  // ESM
  esbuild.build({
    ...common,
    format: 'esm',
    outfile: 'dist/index.js',
  }),
  // CJS
  esbuild.build({
    ...common,
    format: 'cjs',
    outfile: 'dist/index.cjs',
  }),
]);
console.log('Build complete: dist/index.js (ESM) and dist/index.cjs (CJS)');