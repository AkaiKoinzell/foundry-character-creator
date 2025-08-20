import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'js/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    sourcemap: false
  },
  plugins: [
    nodeResolve(),
    terser()
  ]
};
