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
        // WORKAROUND: @vue/compiler-dom browser compatibility issue
        // Problem: @vue/compiler-dom's package.json exports "import" -> "esm-bundler.js"
        //          which calls `document.createElement()` at module load time.
        //          This fails in Web Worker (used by @vue/language-core for Monaco).
        // Error: "ReferenceError: document is not defined" in compiler-dom.esm-bundler.js
        // Solution: Force use of esm-browser.js which handles missing document gracefully.
        // Related: @vue/language-core -> @vue/compiler-dom dependency chain
        // TODO: Report to Vue core team to add "browser" condition in exports
        '@vue/compiler-dom': '@vue/compiler-dom/dist/compiler-dom.esm-browser.js',
      },
    },
    // Dev server config (multi-page application)
    server: {
      port: 5173,
      open: false,
    },
    // Build config (library mode for production)
    build: {
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
      include: ['vue', 'codemirror'],
    },
  }
})
