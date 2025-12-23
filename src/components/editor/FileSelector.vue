<template>
  <div
    ref="fileSelector"
    class="file-selector"
    :class="{ 'has-import-map': showImportMap }"
    @wheel="horizontalScroll"
  >
    <div v-for="(file, i) in sortedFiles" :key="file" class="file-item">
      <div
        v-if="pending !== file"
        class="file"
        :class="{ active: activeFilename === file, modified: fileIsModified(file) }"
        @click="$emit('select', file)"
        @dblclick="i > 0 && !isImportMap(file) && editFileName(file)"
      >
        <span class="modified-dot" v-if="fileIsModified(file)"></span>
        <span class="label">{{ stripPrefix(file) }}</span>
        <span
          v-if="i > 0 && !isImportMap(file)"
          class="remove"
          @click.stop="$emit('delete', file)"
        >
          <svg class="icon" width="12" height="12" viewBox="0 0 24 24">
            <line stroke="#999" x1="18" y1="6" x2="6" y2="18" />
            <line stroke="#999" x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      </div>
      <div
        v-if="(pending === true && i === sortedFiles.length - 1 && !isImportMap(file)) || pending === file"
        class="file pending"
        :class="{ active: pending === file }"
      >
        <span class="file pending">{{ pendingFilename }}</span>
        <input
          v-focus
          v-model="pendingFilename"
          spellcheck="false"
          @blur="doneNameFile"
          @keyup.enter="doneNameFile"
          @keyup.esc="cancelNameFile"
        />
      </div>
    </div>
    <button class="add" @click="startAddFile">+</button>

    <div v-if="showImportMap" class="import-map-wrapper">
      <div
        class="file"
        :class="{ active: activeFilename === 'import-map.json' }"
        @click="$emit('select', 'import-map.json')"
      >
        <span class="label">Import Map</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, inject, type PropType, type Directive } from 'vue'
import type { File, ReplStore } from '../../store'
import { stripSrcPrefix } from '../../utils'

// Custom directive for auto-focus (Vue 2 equivalent of @vue:mounted)
const vFocus: Directive = {
  inserted(el: HTMLElement) {
    el.focus()
    if (el instanceof HTMLInputElement) {
      el.select()
    }
  }
}

export default defineComponent({
  name: 'FileSelector',
  directives: {
    focus: vFocus
  },
  props: {
    files: {
      type: Object as PropType<Record<string, File>>,
      required: true,
    },
    activeFilename: {
      type: String,
      required: true,
    },
    mainFile: {
      type: String,
      required: true,
    },
    showImportMap: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['select', 'delete', 'add', 'rename'],
  setup(props, { emit }) {
    const store = inject<ReplStore>('store')!
    const fileSelector = ref<HTMLElement | null>(null)

    /**
     * When `true`: indicates adding a new file
     * When `string`: indicates renaming a file
     */
    const pending = ref<boolean | string>(false)
    const pendingFilename = ref('Comp.vue')

    // Check if file is modified (has unsaved changes)
    function fileIsModified(filename: string): boolean {
      return store.isModified(filename)
    }

    // Sort files: main file first, import-map excluded (shown separately), others alphabetically
    const sortedFiles = computed(() => {
      const entries = Object.entries(props.files)
        .filter(([name, f]) => !f.hidden && name !== 'import-map.json')
        .map(([name]) => name)

      return entries.sort((a, b) => {
        if (a === props.mainFile) return -1
        if (b === props.mainFile) return 1
        return a.localeCompare(b)
      })
    })

    function stripPrefix(filename: string): string {
      return stripSrcPrefix(filename)
    }

    function isImportMap(filename: string): boolean {
      return filename === 'import-map.json'
    }

    function startAddFile() {
      let i = 0
      let name = `Comp.vue`

      while (true) {
        let hasConflict = false
        for (const filename in props.files) {
          if (stripSrcPrefix(filename) === name) {
            hasConflict = true
            name = `Comp${++i}.vue`
            break
          }
        }
        if (!hasConflict) break
      }

      pendingFilename.value = name
      pending.value = true
      // Input will be auto-focused by v-focus directive
    }

    function cancelNameFile() {
      pending.value = false
    }

    function doneNameFile() {
      if (!pending.value) return
      if (!pendingFilename.value) {
        pending.value = false
        return
      }

      const filename = 'src/' + pendingFilename.value
      const oldFilename = pending.value === true ? '' : pending.value

      if (!/\.(vue|jsx?|tsx?|css|json)$/.test(filename)) {
        alert('Only *.vue, *.js, *.ts, *.jsx, *.tsx, *.css, *.json files are supported.')
        return
      }

      if (filename !== oldFilename && filename in props.files) {
        alert(`File "${pendingFilename.value}" already exists.`)
        return
      }

      cancelNameFile()

      if (filename === oldFilename) {
        return
      }

      if (oldFilename) {
        emit('rename', oldFilename, filename)
      } else {
        emit('add', filename)
      }
    }

    function editFileName(file: string) {
      pendingFilename.value = stripSrcPrefix(file)
      pending.value = file
      // Input will be auto-focused and selected by v-focus directive
    }

    function horizontalScroll(e: WheelEvent) {
      e.preventDefault()
      const el = fileSelector.value
      if (!el) return
      const direction =
        Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const distance = 30 * (direction > 0 ? 1 : -1)
      el.scrollTo({
        left: el.scrollLeft + distance,
      })
    }

    return {
      fileSelector,
      sortedFiles,
      pending,
      pendingFilename,
      stripPrefix,
      isImportMap,
      fileIsModified,
      startAddFile,
      cancelNameFile,
      doneNameFile,
      editFileName,
      horizontalScroll,
    }
  },
})
</script>

<style scoped>
.file-selector {
  display: flex;
  box-sizing: border-box;
  border-bottom: 1px solid var(--border);
  background-color: var(--bg);
  overflow-y: hidden;
  overflow-x: auto;
  white-space: nowrap;
  position: relative;
  height: var(--header-height);
}

.file-selector::-webkit-scrollbar {
  height: 1px;
}

.file-selector::-webkit-scrollbar-track {
  background-color: var(--border);
}

.file-selector::-webkit-scrollbar-thumb {
  background-color: var(--color-branding);
}

.file-selector.has-import-map .add {
  margin-right: 10px;
}

.file-item {
  display: inline-block;
}

.file {
  position: relative;
  display: inline-block;
  font-size: 13px;
  font-family: var(--font-code);
  cursor: pointer;
  color: var(--text-light);
  box-sizing: border-box;
}

.file.active {
  color: var(--color-branding);
  border-bottom: 3px solid var(--color-branding);
  cursor: text;
}

.file span {
  display: inline-block;
  padding: 8px 10px 6px;
  line-height: 20px;
}

.file .modified-dot {
  position: absolute;
  top: 6px;
  left: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-branding);
  padding: 0;
}

.file.pending span {
  min-width: 50px;
  min-height: 34px;
  padding-right: 32px;
  background-color: rgba(200, 200, 200, 0.2);
  color: transparent;
}

.file.pending input {
  position: absolute;
  inset: 8px 7px auto;
  font-size: 13px;
  font-family: var(--font-code);
  line-height: 20px;
  outline: none;
  border: none;
  padding: 0 3px;
  min-width: 1px;
  color: inherit;
  background-color: transparent;
}

.file .remove {
  display: inline-block;
  vertical-align: middle;
  line-height: 12px;
  cursor: pointer;
  padding-left: 0;
}

.add {
  font-size: 18px;
  font-family: var(--font-code);
  color: #999;
  vertical-align: middle;
  margin-left: 6px;
  position: relative;
  top: -1px;
}

.add:hover {
  color: var(--color-branding);
}

.icon {
  margin-top: -1px;
}

.import-map-wrapper {
  position: sticky;
  margin-left: auto;
  top: 0;
  right: 0;
  padding-left: 30px;
  background-color: var(--bg);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 1) 25%
  );
}

.dark .import-map-wrapper {
  background: linear-gradient(
    90deg,
    rgba(26, 26, 26, 0) 0%,
    rgba(26, 26, 26, 1) 25%
  );
}
</style>
