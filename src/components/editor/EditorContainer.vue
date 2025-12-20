<template>
  <div class="editor-container">
    <FileSelector
      :files="store.files"
      :active-filename="store.activeFilename"
      :main-file="store.mainFile"
      :show-import-map="showImportMap"
      @select="store.setActive"
      @delete="store.deleteFile"
      @add="store.addFile"
      @rename="store.renameFile"
    />
    <div class="editor-wrapper">
      <component
        :is="editorComponent"
        v-if="store.activeFile"
        :value="store.activeFile.code"
        :filename="store.activeFilename"
        :mode="getMode(store.activeFilename)"
        @change="handleChange"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, inject, type PropType, type Component } from 'vue'
import FileSelector from './FileSelector.vue'
import type { ReplStore } from '../../store'
import { debounce, getExtension } from '../../utils'

export default defineComponent({
  name: 'EditorContainer',
  components: {
    FileSelector,
  },
  props: {
    editorComponent: {
      type: Object as PropType<Component>,
      required: true,
    },
    showImportMap: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const store = inject<ReplStore>('store')!

    const handleChange = debounce((code: string) => {
      if (store.activeFile) {
        store.activeFile.code = code
        // Explicitly trigger recompilation
        store.compileFile(store.activeFile).then((errs) => {
          store.errors = errs
        })
      }
    }, 250)

    function getMode(filename: string): string {
      const ext = getExtension(filename)
      switch (ext) {
        case 'vue':
          return 'vue'
        case 'html':
          return 'htmlmixed'
        case 'css':
        case 'scss':
        case 'less':
          return 'css'
        case 'ts':
        case 'tsx':
          return 'typescript'
        case 'jsx':
          return 'jsx'
        case 'json':
          return 'application/json'
        default:
          return 'javascript'
      }
    }

    return {
      store,
      handleChange,
      getMode,
      showImportMap: props.showImportMap,
    }
  },
})
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

.editor-wrapper {
  flex: 1;
  overflow: hidden;
}
</style>
