<template>
  <div ref="container" class="codemirror-editor"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue'
import CodeMirror from 'codemirror'

// Import CodeMirror modes
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/css/css'
import 'codemirror/mode/htmlmixed/htmlmixed'
import 'codemirror/mode/vue/vue'
import 'codemirror/mode/jsx/jsx'

// Import CodeMirror addons
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/closetag'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/comment/comment'
import 'codemirror/addon/fold/foldcode'
import 'codemirror/addon/fold/foldgutter'
import 'codemirror/addon/fold/brace-fold'

// Import CodeMirror styles
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/fold/foldgutter.css'

export default defineComponent({
  name: 'CodeMirrorEditor',
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
    let editor: CodeMirror.Editor | null = null
    let ignoreNextChange = false

    onMounted(() => {
      if (!container.value) return

      editor = CodeMirror(container.value, {
        value: props.value,
        mode: getMode(props.mode) as any,
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
        indentWithTabs: false,
        autoCloseBrackets: true,
        autoCloseTags: true,
        matchBrackets: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        readOnly: props.readonly,
        extraKeys: {
          'Ctrl-/': 'toggleComment',
          'Cmd-/': 'toggleComment',
        },
      })

      editor.on('change', () => {
        if (ignoreNextChange) {
          ignoreNextChange = false
          return
        }
        emit('change', editor!.getValue())
      })
    })

    watch(
      () => props.value,
      (newValue) => {
        if (editor && newValue !== editor.getValue()) {
          ignoreNextChange = true
          const cursor = editor.getCursor()
          editor.setValue(newValue)
          editor.setCursor(cursor)
        }
      }
    )

    watch(
      () => props.mode,
      (newMode) => {
        if (editor) {
          editor.setOption('mode', getMode(newMode) as any)
        }
      }
    )

    watch(
      () => props.readonly,
      (readonly) => {
        if (editor) {
          editor.setOption('readOnly', readonly)
        }
      }
    )

    function getMode(mode: string): string | object {
      switch (mode) {
        case 'vue':
          return 'vue'
        case 'typescript':
          return { name: 'javascript', typescript: true }
        case 'jsx':
          return 'jsx'
        case 'css':
          return 'css'
        case 'htmlmixed':
        case 'html':
          return 'htmlmixed'
        case 'application/json':
        case 'json':
          return { name: 'javascript', json: true }
        default:
          return 'javascript'
      }
    }

    onUnmounted(() => {
      if (editor) {
        // Clean up editor (toTextArea doesn't exist for element-based editors)
        const wrapper = editor.getWrapperElement()
        wrapper.parentNode?.removeChild(wrapper)
        editor = null
      }
    })

    return {
      container,
    }
  },
})
</script>

<style>
.codemirror-editor {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.codemirror-editor .CodeMirror {
  height: 100%;
  font-family: var(--font-code);
  font-size: 14px;
  line-height: 1.5;
}

.codemirror-editor .CodeMirror-gutters {
  background: var(--bg-soft);
  border-right: 1px solid var(--border);
}

.codemirror-editor .CodeMirror-linenumber {
  color: var(--text-light);
}

/* Dark theme */
.dark .codemirror-editor .CodeMirror {
  background: var(--bg);
  color: #d4d4d4;
}

.dark .codemirror-editor .CodeMirror-gutters {
  background: var(--bg-soft);
  border-right-color: var(--border);
}

.dark .codemirror-editor .CodeMirror-cursor {
  border-left-color: #fff;
}

.dark .codemirror-editor .CodeMirror-selected {
  background: #264f78;
}

/* Syntax highlighting for dark theme */
.dark .codemirror-editor .cm-keyword {
  color: #569cd6;
}
.dark .codemirror-editor .cm-atom {
  color: #569cd6;
}
.dark .codemirror-editor .cm-number {
  color: #b5cea8;
}
.dark .codemirror-editor .cm-def {
  color: #dcdcaa;
}
.dark .codemirror-editor .cm-variable {
  color: #9cdcfe;
}
.dark .codemirror-editor .cm-variable-2 {
  color: #9cdcfe;
}
.dark .codemirror-editor .cm-variable-3 {
  color: #4ec9b0;
}
.dark .codemirror-editor .cm-type {
  color: #4ec9b0;
}
.dark .codemirror-editor .cm-property {
  color: #9cdcfe;
}
.dark .codemirror-editor .cm-operator {
  color: #d4d4d4;
}
.dark .codemirror-editor .cm-comment {
  color: #6a9955;
}
.dark .codemirror-editor .cm-string {
  color: #ce9178;
}
.dark .codemirror-editor .cm-string-2 {
  color: #ce9178;
}
.dark .codemirror-editor .cm-meta {
  color: #d4d4d4;
}
.dark .codemirror-editor .cm-qualifier {
  color: #d7ba7d;
}
.dark .codemirror-editor .cm-builtin {
  color: #4ec9b0;
}
.dark .codemirror-editor .cm-bracket {
  color: #d4d4d4;
}
.dark .codemirror-editor .cm-tag {
  color: #569cd6;
}
.dark .codemirror-editor .cm-attribute {
  color: #9cdcfe;
}
</style>
