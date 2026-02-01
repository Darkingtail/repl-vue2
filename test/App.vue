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
        <a href="https://github.com/Darkingtail/repl-vue2" target="_blank" class="github-link">
          <svg height="20" viewBox="0 0 16 16" width="20" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
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

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  color: white;
  text-decoration: none;
}

.github-link:hover {
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
