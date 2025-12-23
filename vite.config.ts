import vue2 from '@vitejs/plugin-vue2'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'

  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    plugins: [
      vue2(),
      !isDev &&
      dts({
        include: ['src/**/*.ts', 'src/**/*.vue'],
        outDir: 'dist',
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    // Dev server config (multi-page application)
    server: {
      port: 5173,
      open: false,
    },
    // Build config (library mode for production, multi-page for dev preview)
    build: isDev
      ? {
        // Multi-page application for dev preview
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
            'index-remote': resolve(__dirname, 'index-remote.html'),
          },
        },
      }
      : {
        lib: {
          entry: {
            'repl-vue2': resolve(__dirname, 'src/index.ts'),
            core: resolve(__dirname, 'src/core.ts'),
            'codemirror-editor': resolve(
              __dirname,
              'src/editor/codemirror/index.ts',
            ),
            'monaco-editor': resolve(__dirname, 'src/editor/monaco/index.ts'),
          },
          formats: ['es', 'cjs'],
        },
        rollupOptions: {
          external: [
            'vue',
            'codemirror',
            'monaco-editor',
            '@vue/compiler-sfc',
            'hash-sum',
          ],
          output: {
            globals: {
              vue: 'Vue',
            },
          },
        },
        cssCodeSplit: false,
      },
    // Optimize deps for dev
    optimizeDeps: {
      include: ['vue', 'codemirror', '@vue/compiler-sfc', 'hash-sum'],
    },
  }
})
