<template>
  <div class="repl-vue2" :class="{ dark: theme === 'dark' }">
    <SplitPane :layout="layout">
      <template #left>
        <div v-if="!layoutReverse" class="editor-panel">
          <EditorContainer
            :editor-component="editor"
            :show-import-map="showImportMap"
          />
        </div>
        <div v-else class="output-panel">
          <Output
            ref="outputRef"
            :show-compile-output="showCompileOutput"
            :head-h-t-m-l="previewOptions.headHTML"
            :body-h-t-m-l="previewOptions.bodyHTML"
            :placeholder-h-t-m-l="previewOptions.placeholderHTML"
            :theme="theme"
          />
        </div>
      </template>
      <template #right>
        <div v-if="!layoutReverse" class="output-panel">
          <Output
            ref="outputRef"
            :show-compile-output="showCompileOutput"
            :head-h-t-m-l="previewOptions.headHTML"
            :body-h-t-m-l="previewOptions.bodyHTML"
            :placeholder-h-t-m-l="previewOptions.placeholderHTML"
            :theme="theme"
          />
        </div>
        <div v-else class="editor-panel">
          <EditorContainer
            :editor-component="editor"
            :show-import-map="showImportMap"
          />
        </div>
      </template>
    </SplitPane>
    <Message :errors="store.errors" @dismiss="dismissError" />
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  provide,
  ref,
  type Component,
  type PropType,
} from 'vue'
import { useStore, type ReplStore } from '../store'
import type { PreviewOptions } from '../types'
import Message from './Message.vue'
import SplitPane from './SplitPane.vue'
import EditorContainer from './editor/EditorContainer.vue'
import Output from './output/Output.vue'

export default defineComponent({
  name: 'Repl',
  components: {
    SplitPane,
    EditorContainer,
    Output,
    Message,
  },
  props: {
    editor: {
      type: Object as PropType<Component>,
      required: true,
    },
    store: {
      type: Object as PropType<ReplStore>,
      default: () => useStore(),
    },
    theme: {
      type: String as PropType<'dark' | 'light'>,
      default: 'light',
    },
    autoResize: {
      type: Boolean,
      default: true,
    },
    showCompileOutput: {
      type: Boolean,
      default: true,
    },
    showImportMap: {
      type: Boolean,
      default: true,
    },
    clearConsole: {
      type: Boolean,
      default: true,
    },
    layout: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    layoutReverse: {
      type: Boolean,
      default: false,
    },
    previewOptions: {
      type: Object as PropType<PreviewOptions>,
      default: () => ({}),
    },
  },
  setup(props) {
    const outputRef = ref()

    // Provide store to child components
    provide('store', props.store)

    // Initialize store
    props.store.init()

    function dismissError(idx: number) {
      props.store.errors.splice(idx, 1)
    }

    function reload() {
      outputRef.value?.reload()
    }

    return {
      outputRef,
      dismissError,
      reload,
    }
  },
})
</script>

<style>
.repl-vue2 {
  --bg: #fff;
  --bg-soft: #f8f8f8;
  --border: #ddd;
  --text-light: #888;
  --font-code: Menlo, Monaco, Consolas, 'Courier New', monospace;
  --color-branding: #42b883;
  --color-branding-dark: #35495e;
  --header-height: 38px;

  height: 100%;
  margin: 0;
  overflow: hidden;
  font-size: 13px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--bg-soft);
}

.repl-vue2.dark {
  --bg: #1a1a1a;
  --bg-soft: #242424;
  --border: #383838;
  --text-light: #aaa;
  --color-branding: #42d392;
  --color-branding-dark: #89ddff;
}

.repl-vue2 button {
  border: none;
  outline: none;
  cursor: pointer;
  margin: 0;
  background-color: transparent;
}

.editor-panel,
.output-panel {
  height: 100%;
}

/* Scrollbar styling */
.repl-vue2 ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.repl-vue2 ::-webkit-scrollbar-track {
  background: var(--bg-soft);
}

.repl-vue2 ::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.repl-vue2 ::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.repl-vue2.dark ::-webkit-scrollbar-track {
  background: var(--bg);
}

.repl-vue2.dark ::-webkit-scrollbar-thumb {
  background: #555;
}

.repl-vue2.dark ::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* Firefox scrollbar */
.repl-vue2 {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 var(--bg-soft);
}

.repl-vue2.dark {
  scrollbar-color: #555 var(--bg);
}
</style>
