import vue2 from '@vitejs/plugin-vue2'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'

  return {
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
    // Dev server config
    server: {
      port: 5173,
      open: true,
    },
    // Build config (library mode)
    build: isDev
      ? {}
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
