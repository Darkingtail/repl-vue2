<template>
  <div ref="container" class="monaco-editor-container"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue'

// Note: Monaco editor is loaded externally
// This is a placeholder for Monaco integration
// Full implementation would require proper Monaco setup

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
    let editor: any = null

    onMounted(async () => {
      if (!container.value) return

      // Check if Monaco is available globally
      const monaco = (window as any).monaco
      if (!monaco) {
        console.warn('[MonacoEditor] Monaco is not loaded. Please include monaco-editor.')
        container.value.innerHTML = `
          <div style="padding: 20px; color: #888; text-align: center;">
            Monaco Editor not loaded.<br>
            Please include monaco-editor or use CodeMirror editor instead.
          </div>
        `
        return
      }

      editor = monaco.editor.create(container.value, {
        value: props.value,
        language: getLanguage(props.mode),
        theme: document.body.classList.contains('dark') ? 'vs-dark' : 'vs',
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        readOnly: props.readonly,
        tabSize: 2,
      })

      editor.onDidChangeModelContent(() => {
        emit('change', editor.getValue())
      })
    })

    watch(
      () => props.value,
      (newValue) => {
        if (editor && newValue !== editor.getValue()) {
          editor.setValue(newValue)
        }
      }
    )

    watch(
      () => props.mode,
      (newMode) => {
        if (editor) {
          const monaco = (window as any).monaco
          const model = editor.getModel()
          if (model && monaco) {
            monaco.editor.setModelLanguage(model, getLanguage(newMode))
          }
        }
      }
    )

    function getLanguage(mode: string): string {
      switch (mode) {
        case 'vue':
          return 'html' // Monaco doesn't have vue mode by default
        case 'typescript':
          return 'typescript'
        case 'jsx':
        case 'javascript':
          return 'javascript'
        case 'css':
          return 'css'
        case 'htmlmixed':
        case 'html':
          return 'html'
        case 'application/json':
        case 'json':
          return 'json'
        default:
          return 'javascript'
      }
    }

    onUnmounted(() => {
      if (editor) {
        editor.dispose()
        editor = null
      }
    })

    return {
      container,
    }
  },
})
</script>

<style scoped>
.monaco-editor-container {
  height: 100%;
  width: 100%;
}
</style>
