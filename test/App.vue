<template>
  <div class="demo-app">
    <header class="demo-header">
      <h1>Vue 2.7 REPL</h1>
      <div class="demo-actions">
        <button @click="toggleTheme">
          {{ theme === 'dark' ? '🌙 Dark' : '☀️ Light' }}
        </button>
        <button @click="shareUrl">Share</button>
      </div>
    </header>
    <div class="demo-content">
      <Repl
        :editor="CodeMirrorEditor"
        :store="store"
        :theme="theme"
        :show-compile-output="true"
        :show-import-map="true"
        layout="horizontal"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue'
import { Repl, useStore } from '../src'
import CodeMirrorEditor from '../src/editor/codemirror/CodeMirrorEditor.vue'

export default defineComponent({
  name: 'DemoApp',
  components: {
    Repl,
  },
  setup() {
    const theme = ref<'light' | 'dark'>('light')

    // Initialize store with URL state if present
    const hash = location.hash.slice(1)
    const store = useStore({}, hash || undefined)

    function toggleTheme() {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
      document.body.classList.toggle('dark', theme.value === 'dark')
    }

    function shareUrl() {
      const url = location.origin + location.pathname + store.serialize()
      navigator.clipboard.writeText(url).then(() => {
        alert('URL copied to clipboard!')
      }).catch(() => {
        prompt('Copy this URL:', url)
      })
    }

    // Watch for hash changes (from external sources like browser back/forward)
    onMounted(() => {
      // Trigger recompilation after Repl component is mounted
      store.init()

      window.addEventListener('hashchange', () => {
        const hash = location.hash.slice(1)
        if (hash) {
          store.deserialize(hash)
        }
      })
    })

    // Auto-save to URL hash when files change (like Vue 3 playground)
    // Use deep watch to detect all file content changes
    watch(
      () => store.files,
      () => {
        // Debounce to avoid too frequent updates
        const newHash = store.serialize()
        if (location.hash !== newHash) {
          history.replaceState(null, '', newHash)
        }
      },
      { deep: true }
    )

    return {
      theme,
      store,
      CodeMirrorEditor,
      toggleTheme,
      shareUrl,
    }
  },
})
</script>

<style>
.demo-app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #35495e;
  color: white;
  flex-shrink: 0;
}

.demo-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.demo-actions {
  display: flex;
  gap: 8px;
}

.demo-header button {
  padding: 6px 12px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.demo-header button:hover {
  background: rgba(255,255,255,0.1);
}

.demo-content {
  flex: 1;
  overflow: hidden;
}

/* Dark mode body styles */
body.dark {
  background: #1a1a1a;
  color: #fff;
}
</style>
