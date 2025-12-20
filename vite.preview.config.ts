import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import replace from '@rollup/plugin-replace'

// Config for building standalone preview/demo site
export default defineConfig({
  plugins: [vue2()],
  build: {
    outDir: 'dist-preview',
    commonjsOptions: {
      ignore: ['typescript'],
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
      }),
    ],
  },
})
