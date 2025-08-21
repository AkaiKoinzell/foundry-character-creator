import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'js/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    sourcemap: false,
    inlineDynamicImports: true
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    terser()
  ]
};
