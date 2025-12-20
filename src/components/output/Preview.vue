<template>
  <div ref="container" class="preview-container">
    <!-- iframe is created dynamically -->
    <Message
      v-if="runtimeError"
      :errors="[runtimeError]"
      @dismiss="runtimeError = ''"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, inject, onMounted, onUnmounted, watchEffect, watch } from 'vue'
import Message from '../Message.vue'
import { PreviewProxy } from '../../output/PreviewProxy'
import { compileModulesForPreview } from '../../output/moduleCompiler'
import type { ReplStore } from '../../store'
import srcdocTemplate from '../../output/srcdoc.html?raw'

export default defineComponent({
  name: 'Preview',
  components: {
    Message,
  },
  props: {
    headHTML: {
      type: String,
      default: '',
    },
    bodyHTML: {
      type: String,
      default: '',
    },
    placeholderHTML: {
      type: String,
      default: '',
    },
    theme: {
      type: String as () => 'dark' | 'light',
      default: 'light',
    },
  },
  setup(props) {
    const store = inject<ReplStore>('store')!
    const container = ref<HTMLDivElement | null>(null)
    const runtimeError = ref('')

    let sandbox: HTMLIFrameElement | null = null
    let proxy: PreviewProxy | null = null
    let stopUpdateWatcher: (() => void) | null = null

    function createSandbox() {
      // Clear previous sandbox
      if (sandbox && container.value) {
        proxy?.destroy()
        stopUpdateWatcher?.()
        container.value.removeChild(sandbox)
      }

      sandbox = document.createElement('iframe')
      sandbox.setAttribute('sandbox', [
        'allow-forms',
        'allow-modals',
        'allow-pointer-lock',
        'allow-popups',
        'allow-same-origin',
        'allow-scripts',
        'allow-top-navigation-by-user-activation',
      ].join(' '))
      sandbox.className = 'preview-iframe'

      const themeClass = props.theme === 'dark' ? 'dark' : ''
      const sandboxSrc = srcdocTemplate
        .replace('<html>', `<html class="${themeClass}">`)
        .replace('<!--HEAD_HTML-->', props.headHTML)
        .replace('<!--BODY_HTML-->', props.bodyHTML)
        .replace('<!--PLACEHOLDER_HTML-->', props.placeholderHTML)

      sandbox.srcdoc = sandboxSrc
      container.value?.appendChild(sandbox)

      proxy = new PreviewProxy({
        onError: (error) => {
          runtimeError.value = error.message
        },
        onConsole: (msg) => {
          const method = msg.level as keyof Console
          if (typeof console[method] === 'function') {
            ;(console[method] as Function)('[Preview]', ...msg.args)
          }
        },
      })
      proxy.setIframe(sandbox)

      // Wait for iframe to fully load before starting preview updates
      sandbox.addEventListener('load', () => {
        // Start watching for changes and update preview
        stopUpdateWatcher = watchEffect(updatePreview)
      })
    }

    function updatePreview() {
      if (!sandbox || !proxy) return

      runtimeError.value = ''

      try {
        // Skip if there are compile errors
        if (store.errors.length > 0) {
          console.log('[Preview] Skipping due to errors:', store.errors)
          return
        }

        // Check that main file exists and is compiled
        const mainFile = store.files[store.mainFile]
        if (!mainFile || !mainFile.compiled.js) {
          console.log('[Preview] Main file not ready:', store.mainFile, mainFile?.compiled?.js?.length)
          return
        }

        // Access all files' compiled output to create reactive dependencies
        const allFilesCompiled = Object.entries(store.files).map(([name, file]) => ({
          name,
          hasJs: !!file.compiled?.js,
          hasCss: !!file.compiled?.css
        }))
        console.log('[Preview] Files status:', allFilesCompiled)

        const { modules, mainModule, css } = compileModulesForPreview(store)

        console.log('[Preview] Modules:', Object.keys(modules))
        console.log('[Preview] Main module:', mainModule)

        // Send to iframe
        proxy.eval({
          modules,
          mainModule,
          css,
        })
      } catch (err) {
        console.error('[Preview] Update failed:', err)
        runtimeError.value = err instanceof Error ? err.message : String(err)
      }
    }

    onMounted(() => {
      createSandbox()
    })

    // Recreate sandbox when import map changes
    watch(
      () => store.getImportMap(),
      () => {
        createSandbox()
      },
      { deep: true }
    )

    // Update theme in iframe when theme changes
    watch(
      () => props.theme,
      (newTheme) => {
        if (sandbox && sandbox.contentDocument) {
          const html = sandbox.contentDocument.documentElement
          if (newTheme === 'dark') {
            html.classList.add('dark')
          } else {
            html.classList.remove('dark')
          }
        }
      }
    )

    onUnmounted(() => {
      proxy?.destroy()
      stopUpdateWatcher?.()
    })

    function reload() {
      createSandbox()
    }

    return {
      container,
      runtimeError,
      reload,
    }
  },
})
</script>

<style scoped>
.preview-container {
  position: relative;
  height: 100%;
  background: var(--bg);
}

.preview-container :deep(.preview-iframe) {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.dark .preview-container :deep(.preview-iframe) {
  background: #1a1a1a;
}
</style>
