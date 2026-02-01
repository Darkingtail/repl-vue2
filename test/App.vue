<template>
  <div class="demo-app">
    <header class="demo-header">
      <h1>Vue 2.7 REPL</h1>
      <div class="demo-actions">
        <select v-model="currentExample" class="example-select" @change="loadExample">
          <option v-for="key in exampleKeys" :key="key" :value="key">
            {{ examples[key].name }}
          </option>
        </select>
        <select v-model="themeMode" class="theme-select" @change="onThemeModeChange">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <button @click="shareUrl">Share</button>
      </div>
    </header>
    <div class="demo-content">
      <Repl
        :editor="MonacoEditor"
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
import { defineComponent, onMounted, ref, watchEffect } from 'vue'
import { type ExampleKey, Repl, exampleKeys, examples, getExample, useStore } from '../src'
import MonacoEditor from '../src/editor/monaco/MonacoEditor.vue'

export default defineComponent({
  name: 'DemoApp',
  components: {
    Repl,
  },
  setup() {
    // Theme mode: 'system' | 'light' | 'dark'
    const savedThemeMode = localStorage.getItem('repl-theme-mode') as 'system' | 'light' | 'dark' | null
    const themeMode = ref<'system' | 'light' | 'dark'>(savedThemeMode || 'system')

    // Actual theme applied to UI
    const theme = ref<'light' | 'dark'>('light')

    // Media query for system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

    function getSystemTheme(): 'light' | 'dark' {
      return prefersDark.matches ? 'dark' : 'light'
    }

    function applyTheme() {
      const resolvedTheme = themeMode.value === 'system' ? getSystemTheme() : themeMode.value
      theme.value = resolvedTheme
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
      document.body.classList.toggle('dark', resolvedTheme === 'dark')
    }

    // Listen for system theme changes
    prefersDark.addEventListener('change', () => {
      if (themeMode.value === 'system') {
        applyTheme()
      }
    })

    // Apply theme on init
    applyTheme()

    // Read example from URL query params
    const urlParams = new URLSearchParams(location.search)
    const initialExample = (urlParams.get('example') || 'welcome') as ExampleKey
    const currentExample = ref<ExampleKey>(
      exampleKeys.includes(initialExample) ? initialExample : 'welcome'
    )

    // Initialize store with URL state if present
    const hash = location.hash.slice(1)
    const store = useStore({}, hash || undefined)

    function onThemeModeChange() {
      localStorage.setItem('repl-theme-mode', themeMode.value)
      applyTheme()
    }

    function updateUrlParams() {
      const params = new URLSearchParams(location.search)
      if (currentExample.value === 'welcome') {
        params.delete('example')
      } else {
        params.set('example', currentExample.value)
      }
      const search = params.toString()
      const newUrl = location.pathname + (search ? '?' + search : '') + location.hash
      history.replaceState({}, '', newUrl)
    }

    function shareUrl() {
      const url = location.origin + location.pathname +
        (currentExample.value !== 'welcome' ? '?example=' + currentExample.value : '') +
        store.serialize()
      navigator.clipboard.writeText(url).then(() => {
        alert('URL copied to clipboard!')
      }).catch(() => {
        prompt('Copy this URL:', url)
      })
    }

    async function loadExample() {
      const example = getExample(currentExample.value)
      if (!example) return

      // Confirm if there are unsaved changes
      const hasContent = Object.keys(store.files).some(
        f => !f.includes('import-map') && !f.includes('tsconfig')
      )
      if (hasContent && !confirm(`Load "${example.name}" example? Current files will be replaced.`)) {
        return
      }

      await store.setFiles(example.files, example.mainFile)
      updateUrlParams()
    }

    // Watch for hash changes (from external sources like browser back/forward)
    onMounted(async () => {
      // Trigger recompilation after Repl component is mounted
      store.init()

      // If example is specified in URL but no hash content, load the example
      if (currentExample.value !== 'welcome' && !hash) {
        const example = getExample(currentExample.value)
        if (example) {
          await store.setFiles(example.files, example.mainFile)
        }
      }

      window.addEventListener('hashchange', () => {
        const hash = location.hash.slice(1)
        if (hash) {
          store.deserialize(hash)
        }
      })
    })

    // Auto-save to URL hash when files change (like Vue 3 playground)
    // Use watchEffect to only trigger when serialize() dependencies change (file.code)
    watchEffect(() => {
      history.replaceState({}, '', store.serialize())
    })

    return {
      theme,
      themeMode,
      store,
      MonacoEditor,
      onThemeModeChange,
      shareUrl,
      // Examples
      currentExample,
      examples,
      exampleKeys,
      loadExample,
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

.example-select,
.theme-select {
  padding: 6px 12px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 13px;
  outline: none;
}

.example-select:hover,
.theme-select:hover {
  background: rgba(255,255,255,0.1);
}

.example-select option,
.theme-select option {
  background: #35495e;
  color: white;
}

/* Dark mode styles */
body.dark .demo-header {
  background: #1e1e1e;
  border-bottom: 1px solid #333;
}

body.dark .example-select option,
body.dark .theme-select option {
  background: #2d2d2d;
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
