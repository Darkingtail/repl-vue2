<template>
  <div
    ref="container"
    class="monaco-editor-container"
    @keydown.ctrl.s.prevent="emitChangeEvent"
    @keydown.meta.s.prevent="emitChangeEvent"
  />
</template>

<script lang="ts">
import { computed, defineComponent, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor-core'
import { initMonaco } from './env'
import { getOrCreateModel } from './utils'
import { registerHighlighter } from './highlight'
import type { ReplStore } from '../../store'

export default defineComponent({
  name: 'MonacoEditor',
  props: {
    value: {
      type: String,
      default: '',
    },
    filename: {
      type: String,
      default: '',
    },
    mode: {
      type: String,
      default: 'javascript',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const container = ref<HTMLDivElement | null>(null)
    const store = inject<ReplStore>('store')!
    let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null
    let themeObserver: MutationObserver | null = null

    // Initialize Monaco with store
    initMonaco(store)

    const lang = computed(() => (props.mode === 'css' ? 'css' : 'javascript'))

    function emitChangeEvent() {
      if (editorInstance) {
        emit('change', editorInstance.getValue())
      }
    }

    function updateTheme() {
      if (!editorInstance) return
      const theme = registerHighlighter()
      const isDark = document.body.classList.contains('dark')
      editorInstance.updateOptions({
        theme: isDark ? theme.dark : theme.light,
      })
    }

    onMounted(() => {
      const theme = registerHighlighter()
      if (!container.value) {
        console.error('[MonacoEditor] Cannot find container ref')
        return
      }

      const isDark = document.body.classList.contains('dark')

      editorInstance = monaco.editor.create(container.value, {
        ...(props.readonly
          ? { value: props.value, language: lang.value }
          : { model: null }),
        fontSize: 13,
        tabSize: 2,
        theme: isDark ? theme.dark : theme.light,
        readOnly: props.readonly,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        minimap: {
          enabled: false,
        },
        inlineSuggest: {
          enabled: false,
        },
        fixedOverflowWidgets: true,
        // Disable word-based highlighting to avoid "Canceled" errors on model switch
        occurrencesHighlight: 'off',
      })

      // Watch for theme changes on body element
      themeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'class') {
            updateTheme()
          }
        }
      })
      themeObserver.observe(document.body, { attributes: true })

      // Support for semantic highlighting
      const t = (editorInstance as any)._themeService._theme
      t.semanticHighlighting = true
      t.getTokenStyleMetadata = (
        type: string,
        modifiers: string[],
        _language: string,
      ) => {
        const _readonly = modifiers.includes('readonly')
        switch (type) {
          case 'function':
          case 'method':
            return { foreground: 12 }
          case 'class':
            return { foreground: 11 }
          case 'variable':
          case 'property':
            return { foreground: _readonly ? 19 : 9 }
          default:
            return { foreground: 0 }
        }
      }

      // Watch value changes for readonly mode
      watch(
        () => props.value,
        (value) => {
          if (!editorInstance) return
          if (editorInstance.getValue() === value) return
          editorInstance.setValue(value || '')
        },
        { immediate: true },
      )

      // Watch language changes
      watch(lang, (newLang) => {
        if (editorInstance) {
          const model = editorInstance.getModel()
          if (model) {
            monaco.editor.setModelLanguage(model, newLang)
          }
        }
      })

      // File switching with view state preservation (non-readonly mode)
      if (!props.readonly) {
        watch(
          () => props.filename,
          (newFilename, oldFilename) => {
            if (!editorInstance) return
            const file = store.files[newFilename]
            if (!file) return

            const model = getOrCreateModel(
              monaco.Uri.parse(`file:///${newFilename}`),
              file.language,
              file.code,
            )

            // Save old file's view state
            const oldFile = oldFilename ? store.files[oldFilename] : null
            if (oldFile) {
              ;(oldFile as any).editorViewState = editorInstance.saveViewState()
            }

            editorInstance.setModel(model)

            // Restore view state if available
            if ((file as any).editorViewState) {
              editorInstance.restoreViewState((file as any).editorViewState)
              editorInstance.focus()
            }
          },
          { immediate: true },
        )
      }

      // Register Ctrl+S handler
      editorInstance.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          emitChangeEvent()
        },
      )

      // Content change listener
      editorInstance.onDidChangeModelContent(() => {
        emitChangeEvent()
      })
    })

    onUnmounted(() => {
      if (themeObserver) {
        themeObserver.disconnect()
        themeObserver = null
      }
      if (editorInstance) {
        editorInstance.dispose()
        editorInstance = null
      }
    })

    return {
      container,
      emitChangeEvent,
    }
  },
})
</script>

<style scoped>
.monaco-editor-container {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
