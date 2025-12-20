<template>
  <div class="output-container">
    <div class="output-header">
      <button
        v-for="mode in modes"
        :key="mode.value"
        class="output-tab"
        :class="{ active: currentMode === mode.value }"
        @click="currentMode = mode.value"
      >
        {{ mode.label }}
      </button>
    </div>
    <div class="output-content">
      <Preview
        v-show="currentMode === 'preview'"
        ref="previewRef"
        :head-h-t-m-l="headHTML"
        :body-h-t-m-l="bodyHTML"
        :placeholder-h-t-m-l="placeholderHTML"
        :theme="theme"
      />
      <div v-show="currentMode === 'js'" class="code-output">
        <pre v-if="activeFileJs">{{ activeFileJs }}</pre>
        <div v-else class="empty-output">No compiled JavaScript</div>
      </div>
      <div v-show="currentMode === 'css'" class="code-output">
        <pre v-if="activeFileCss">{{ activeFileCss }}</pre>
        <div v-else class="empty-output">No compiled CSS</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, inject } from 'vue'
import Preview from './Preview.vue'
import type { ReplStore } from '../../store'

export default defineComponent({
  name: 'Output',
  components: {
    Preview,
  },
  props: {
    showCompileOutput: {
      type: Boolean,
      default: true,
    },
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
    const previewRef = ref()
    const currentMode = ref<'preview' | 'js' | 'css'>('preview')

    const modes = computed(() => {
      const result: { value: 'preview' | 'js' | 'css'; label: string }[] = [
        { value: 'preview', label: 'Preview' }
      ]
      if (props.showCompileOutput) {
        result.push(
          { value: 'js', label: 'JS' },
          { value: 'css', label: 'CSS' }
        )
      }
      return result
    })

    const activeFileJs = computed(() => {
      return store.activeFile?.compiled.js || ''
    })

    const activeFileCss = computed(() => {
      return store.activeFile?.compiled.css || ''
    })

    function reload() {
      previewRef.value?.reload()
    }

    return {
      previewRef,
      currentMode,
      modes,
      activeFileJs,
      activeFileCss,
      reload,
    }
  },
})
</script>

<style scoped>
.output-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

.output-header {
  display: flex;
  align-items: center;
  padding: 0 8px;
  height: var(--header-height);
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
}

.output-tab {
  padding: 6px 12px;
  margin-right: 4px;
  border: none;
  border-radius: 4px 4px 0 0;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.output-tab:hover {
  background: var(--bg);
  color: inherit;
}

.output-tab.active {
  background: var(--bg);
  color: var(--color-branding);
  border-bottom: 2px solid var(--color-branding);
}

.output-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.code-output {
  height: 100%;
  overflow: auto;
  padding: 16px;
}

.code-output pre {
  margin: 0;
  font-family: var(--font-code);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-output {
  color: var(--text-light);
  text-align: center;
  padding: 40px;
}
</style>
