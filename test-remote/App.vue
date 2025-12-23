<template>
  <div class="remote-app">
    <header class="header">
      <h1>Vue 2 Remote Component Dev</h1>
      <div class="header-actions">
        <button @click="toggleTheme">
          {{ theme === 'dark' ? 'Dark' : 'Light' }}
        </button>
        <button @click="saveToServer" :disabled="saving" class="save-btn">
          {{ saving ? 'Saving...' : 'Save to Server' }}
        </button>
      </div>
    </header>
    <div class="main-content">
      <SplitPane layout="horizontal" :initial-size="50">
        <template #left>
          <div class="editor-panel">
            <Repl
              :editor="CodeMirrorEditor"
              :store="store"
              :theme="theme"
              :show-compile-output="true"
              :show-import-map="false"
              layout="vertical"
            />
          </div>
        </template>
        <template #right>
          <div class="right-panel">
            <SplitPane layout="vertical" :initial-size="35">
              <template #left>
                <div class="panel loader-panel">
                  <div class="panel-header">Load Remote Component</div>
                  <div class="panel-content">
                    <div class="form-group">
                      <label>Server URL</label>
                      <input v-model="serverUrl" type="text" placeholder="http://localhost:3456" />
                    </div>
                    <div class="form-group">
                      <label>App Domain</label>
                      <input v-model="appDomain" type="text" placeholder="default" @keyup.enter="refreshList" />
                    </div>
                    <div class="form-actions">
                      <button class="btn primary" @click="refreshList" :disabled="loading">
                        {{ loading ? 'Loading...' : 'Refresh' }}
                      </button>
                    </div>
                    <div class="component-list" v-if="components.length > 0">
                      <div class="list-title">Available Components:</div>
                      <div
                        v-for="comp in components"
                        :key="comp.name"
                        class="component-item"
                        :class="{ active: comp.name === componentName }"
                      >
                        <span class="comp-name" @click="selectComponent(comp.name)">
                          {{ comp.name }}
                          <span v-if="comp.dependencies && comp.dependencies.length" class="deps">
                            ({{ comp.dependencies.join(', ') }})
                          </span>
                        </span>
                        <button class="edit-btn" @click.stop="loadToEditor(comp.name)" title="Load into Editor">
                          Edit
                        </button>
                      </div>
                    </div>
                    <div class="log-section">
                      <div class="log-header">
                        Logs
                        <button class="clear-btn" @click="clearLogs">Clear</button>
                      </div>
                      <div class="log-content" ref="logContainer">
                        <div
                          v-for="(log, index) in logs"
                          :key="index"
                          class="log-item"
                          :class="log.type"
                        >
                          <span class="log-time">[{{ log.time }}]</span>
                          <span class="log-msg">{{ log.message }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template #right>
                <div class="panel preview-panel">
                  <div class="panel-header">Remote Preview</div>
                  <div class="panel-content preview-content">
                    <div id="preview-container" ref="previewContainer">
                      <div v-if="components.length === 0 && !loadedComponent" class="placeholder empty-state">
                        <div class="empty-icon">📭</div>
                        <div>No components available</div>
                        <div class="empty-hint">Check server connection or save a component first</div>
                      </div>
                      <div v-else-if="!loadedComponent" class="placeholder">
                        Load a component to preview
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </SplitPane>
          </div>
        </template>
      </SplitPane>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, onMounted, watch } from 'vue'
import SplitPane from '../src/components/SplitPane.vue'
import { Repl, useStore, type File } from '../src'
import CodeMirrorEditor from '../src/editor/codemirror/CodeMirrorEditor.vue'
import { toUMD, extractComponentName } from '../packages/umd-transformer/src'

// AMD simulation
declare global {
  interface Window {
    define: any
    require: any
    __amdResult__: any
    Vue: any
  }
}

// Setup AMD
window.define = function(deps: any, factory: any) {
  if (typeof deps === 'function') {
    factory = deps
    deps = []
  }
  window.__amdResult__ = factory()
}
window.define.amd = true

window.require = function(deps: string[], callback: Function) {
  if (Array.isArray(deps) && deps.length === 1) {
    const url = deps[0]
    const script = document.createElement('script')
    script.src = url
    script.onload = function() {
      if (callback) {
        callback(window.__amdResult__)
      }
    }
    script.onerror = function() {
      console.error('Failed to load:', url)
    }
    document.head.appendChild(script)
  }
}

interface LogItem {
  type: 'info' | 'success' | 'error'
  time: string
  message: string
}

interface ComponentInfo {
  name: string
  url: string
  dependencies?: string[]
}

// Component cache
const componentCache = new Map<string, any>()

// Analyze imports from code
function analyzeImports(code: string): string[] {
  const imports: string[] = []
  const importRegex = /import\s+\w+\s+from\s+['"]\.\/(\w+)\.vue['"]/g
  let match
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1])
  }
  return imports
}

// Get dependency order (topological sort)
function getDependencyOrder(
  files: Record<string, File>,
  mainFilename: string
): File[] {
  const result: File[] = []
  const visited = new Set<string>()

  function visit(filename: string) {
    if (visited.has(filename)) return
    visited.add(filename)

    const file = files[filename]
    if (!file || !filename.endsWith('.vue')) return

    const imports = analyzeImports(file.code)
    for (const imp of imports) {
      const depFilename = `src/${imp}.vue`
      if (files[depFilename]) {
        visit(depFilename)
      }
    }

    result.push(file)
  }

  visit(mainFilename)
  return result
}

export default defineComponent({
  name: 'RemoteApp',
  components: {
    SplitPane,
    Repl,
  },
  setup() {
    const theme = ref<'light' | 'dark'>('light')
    const serverUrl = ref('http://localhost:3456')
    const appDomain = ref('default')
    const componentName = ref('App')
    const components = ref<ComponentInfo[]>([])
    const logs = ref<LogItem[]>([])
    const loading = ref(false)
    const saving = ref(false)
    const loadedComponent = ref<any>(null)
    const logContainer = ref<HTMLElement | null>(null)
    const previewContainer = ref<HTMLElement | null>(null)

    // Initialize store with file change tracking enabled
    const store = useStore({
      trackFileChanges: ref(true),
    })

    let vueInstance: any = null
    let currentComponentNames: string[] = []

    function toggleTheme() {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
      document.body.classList.toggle('dark', theme.value === 'dark')
    }

    function log(type: LogItem['type'], message: string) {
      const time = new Date().toLocaleTimeString()
      logs.value.push({ type, time, message })
      nextTick(() => {
        if (logContainer.value) {
          logContainer.value.scrollTop = logContainer.value.scrollHeight
        }
      })
    }

    function clearLogs() {
      logs.value = []
    }

    // Cleanup component styles
    function cleanupComponentStyles() {
      currentComponentNames.forEach(name => {
        const styleEl = document.querySelector(`style[data-v-component="${name}"]`)
        if (styleEl) {
          styleEl.remove()
          log('info', `Removed style for "${name}"`)
        }
      })
      currentComponentNames = []
    }

    // Clear preview completely
    function clearPreview() {
      if (vueInstance) {
        vueInstance.$destroy()
        vueInstance = null
        cleanupComponentStyles()
      }
      loadedComponent.value = null
      if (previewContainer.value) {
        previewContainer.value.innerHTML = ''
      }
    }

    // Generate cache key
    function getCacheKey(name: string): string {
      return `${serverUrl.value}|${appDomain.value}|${name}`
    }

    // Inject component style
    function injectComponentStyle(component: any, name: string) {
      const css = component?.__css__
      if (!css) return

      const existingStyle = document.querySelector(`style[data-v-component="${name}"]`)
      if (existingStyle) return

      const style = document.createElement('style')
      style.setAttribute('data-v-component', name)
      style.textContent = css
      document.head.appendChild(style)
      log('info', `Injected style for "${name}"`)
    }

    // Render component
    function renderComponent(component: any, name: string) {
      try {
        if (previewContainer.value) {
          previewContainer.value.innerHTML = '<div id="remote-app"></div>'
        }

        injectComponentStyle(component, name)

        vueInstance = new window.Vue({
          el: '#remote-app',
          render: (h: any) => h(component || window[name as any])
        })
        loadedComponent.value = component
        currentComponentNames.push(name)
        log('success', `Component "${name}" rendered`)
      } catch (e: any) {
        log('error', `Render error: ${e.message}`)
      }
    }

    async function refreshList() {
      try {
        log('info', `Fetching components from ${serverUrl.value}...`)
        const res = await fetch(`${serverUrl.value}/api/components?appDomain=${appDomain.value}`)
        const data = await res.json()

        if (data.success && data.components) {
          components.value = data.components
          log('success', `Found ${data.components.length} component(s)`)
        } else {
          components.value = []
          log('info', 'No components found')
        }

        // Clear preview if no components
        if (components.value.length === 0) {
          clearPreview()
        }
      } catch (e: any) {
        log('error', `Failed to fetch: ${e.message}`)
        components.value = []
        clearPreview()
      }
    }

    function selectComponent(name: string) {
      componentName.value = name
      loadComponent()
    }

    // Load component source into editor (or switch to it if already loaded)
    async function loadToEditor(name: string) {
      const filename = `src/${name}.vue`

      // If already in editor, just switch to it
      if (store.files[filename]) {
        store.setActive(filename)
        componentName.value = name
        return
      }

      // Otherwise, fetch and add the component (with its dependencies)
      try {
        const res = await fetch(
          `${serverUrl.value}/api/sources?names=${name}&appDomain=${appDomain.value}`
        )
        const data = await res.json()

        if (data.success && Object.keys(data.files).length > 0) {
          // Add new files to existing files
          for (const [fname, code] of Object.entries(data.files)) {
            const fullFilename = `src/${fname}`
            if (!store.files[fullFilename]) {
              store.addFile({
                filename: fullFilename,
                code: code as string,
                hidden: false,
                compiled: { js: '', css: '' },
                get language() {
                  return 'vue'
                }
              })
              // Mark newly loaded file as saved
              store.markAsSaved(fullFilename)
            }
          }
          store.setActive(filename)
          log('success', `Added "${name}" to editor`)
        }
      } catch (e: any) {
        log('error', `Failed to load: ${e.message}`)
      }

      componentName.value = name
    }

    // Load single component
    function loadSingleComponent(name: string): Promise<any> {
      return new Promise((resolve, reject) => {
        const cacheKey = getCacheKey(name)

        if (componentCache.has(cacheKey)) {
          log('info', `Using cached component "${name}"`)
          resolve(componentCache.get(cacheKey))
          return
        }

        const url = `${serverUrl.value}/components/${appDomain.value}/${name}/${name}.umd.min.js`
        log('info', `Loading: ${url}`)

        window.require([url], function(component: any) {
          log('success', `Component "${name}" loaded`)

          // Set global variable (AMD mode doesn't auto-set)
          ;(window as any)[name] = component
          log('info', `Registered to window.${name}`)

          // Cache component
          componentCache.set(cacheKey, component)
          log('info', `Cached component "${name}"`)

          resolve(component)
        })
      })
    }

    // Get component dependencies
    function getComponentDependencies(name: string): string[] {
      const comp = components.value.find(c => c.name === name)
      return comp?.dependencies || []
    }

    // Load component with dependencies
    async function loadComponentWithDeps(name: string, loaded: Set<string> = new Set()): Promise<any> {
      if (loaded.has(name)) return componentCache.get(getCacheKey(name))
      loaded.add(name)

      const deps = getComponentDependencies(name)
      if (deps.length > 0) {
        log('info', `Loading dependencies for "${name}": ${deps.join(', ')}`)
        for (const dep of deps) {
          await loadComponentWithDeps(dep, loaded)
        }
      }

      return loadSingleComponent(name)
    }

    async function loadComponent() {
      const name = componentName.value
      if (!name) {
        log('error', 'Please enter component name')
        return
      }

      if (typeof window.Vue === 'undefined') {
        log('error', 'Vue is not loaded!')
        return
      }

      log('info', `Vue version: ${window.Vue.version}`)

      // Destroy old instance and cleanup styles
      if (vueInstance) {
        vueInstance.$destroy()
        vueInstance = null
        cleanupComponentStyles()
      }

      loading.value = true

      try {
        // Refresh list first to get latest dependencies
        await refreshList()
        const component = await loadComponentWithDeps(name)
        renderComponent(component, name)
      } catch (e: any) {
        log('error', `Load error: ${e.message}`)
      } finally {
        loading.value = false
      }
    }

    // Save to server
    async function saveToServer() {
      // Get modified files only
      const modifiedFiles = store.getModifiedFiles()

      if (modifiedFiles.length === 0) {
        log('info', 'No modified files to save')
        alert('No modified files to save')
        return
      }

      // Filter to only .vue files
      const vueFiles = modifiedFiles.filter(f => f.filename.endsWith('.vue'))
      if (vueFiles.length === 0) {
        alert('No modified .vue files to save')
        return
      }

      saving.value = true
      log('info', `Saving ${vueFiles.length} modified file(s)...`)

      try {
        // Sort by dependencies (dependencies first)
        const sortedFiles: typeof vueFiles = []
        const visited = new Set<string>()

        function visit(file: (typeof vueFiles)[0]) {
          if (visited.has(file.filename)) return
          visited.add(file.filename)

          const deps = analyzeImports(file.code)
          for (const dep of deps) {
            const depFile = vueFiles.find(f => f.filename === `src/${dep}.vue`)
            if (depFile) {
              visit(depFile)
            }
          }
          sortedFiles.push(file)
        }

        for (const file of vueFiles) {
          visit(file)
        }

        const savedComponents: string[] = []

        for (const file of sortedFiles) {
          const { js, css } = file.compiled
          if (!js) {
            log('info', `File ${file.filename} not compiled yet, skipping`)
            continue
          }

          const compName = extractComponentName(file.filename)
          const result = toUMD({
            componentName: compName,
            js,
            css,
          })

          const dependencies = analyzeImports(file.code)

          const response = await fetch(`${serverUrl.value}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: compName,
              source: file.code,
              compiled: result.code,
              appDomain: appDomain.value,
              dependencies,
            }),
          })

          const data = await response.json()

          if (data.success) {
            savedComponents.push(compName)
            // Mark as saved after successful save
            store.markAsSaved(file.filename)
            log('success', `Saved: ${compName}`)
            // Clear cache for this component
            componentCache.delete(getCacheKey(compName))
          } else {
            throw new Error(`Failed to save ${compName}: ${data.error}`)
          }
        }

        log('success', `Saved ${savedComponents.length} component(s)`)

        // Refresh list and auto-load the first saved component
        await refreshList()
        if (savedComponents.length > 0) {
          componentName.value = savedComponents[savedComponents.length - 1]
          await loadComponent()
        }

      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        log('error', `Save failed: ${msg}`)
        alert(`Save failed: ${msg}\n\nMake sure the server is running:\ncd server && pnpm dev`)
      } finally {
        saving.value = false
      }
    }

    // Load sources from server into editor
    async function loadSourcesFromServer(mainComponentName: string = 'App') {
      try {
        log('info', `Loading sources for "${mainComponentName}" from server...`)
        const res = await fetch(
          `${serverUrl.value}/api/sources?names=${mainComponentName}&appDomain=${appDomain.value}`
        )
        const data = await res.json()

        if (data.success && Object.keys(data.files).length > 0) {
          // Convert to store format with src/ prefix
          const files: Record<string, string> = {}
          for (const [filename, code] of Object.entries(data.files)) {
            files[filename] = code as string
          }

          // Set files in store
          await store.setFiles(files, `${mainComponentName}.vue`)
          // Mark all loaded files as saved
          store.markAllAsSaved()
          log('success', `Loaded ${Object.keys(files).length} file(s) into editor`)
          return true
        } else {
          log('info', 'No saved components found, using default template')
          return false
        }
      } catch (e: any) {
        log('info', `Could not load from server: ${e.message}`)
        return false
      }
    }

    // Load all components from server into editor
    async function loadAllSourcesFromServer() {
      try {
        const names = components.value.map(c => c.name)
        if (names.length === 0) {
          log('info', 'No components on server')
          return false
        }

        log('info', `Loading all sources: ${names.join(', ')}`)
        const res = await fetch(
          `${serverUrl.value}/api/sources?names=${names.join(',')}&appDomain=${appDomain.value}`
        )
        const data = await res.json()

        if (data.success && Object.keys(data.files).length > 0) {
          const files: Record<string, string> = {}
          for (const [filename, code] of Object.entries(data.files)) {
            files[filename] = code as string
          }

          // Determine main file (prefer App.vue if exists)
          const mainFile = files['App.vue'] ? 'App.vue' : Object.keys(files)[0]
          await store.setFiles(files, mainFile)
          // Mark all loaded files as saved (no modifications yet)
          store.markAllAsSaved()
          log('success', `Loaded ${Object.keys(files).length} file(s) into editor`)
          return true
        }
        return false
      } catch (e: any) {
        log('info', `Could not load from server: ${e.message}`)
        return false
      }
    }

    onMounted(async () => {
      log('info', 'Remote dev page initialized')
      log('info', `Vue available: ${typeof window.Vue !== 'undefined'}`)

      // First refresh the list to see what's available
      await refreshList()

      // Load all components from server
      if (components.value.length > 0) {
        const loaded = await loadAllSourcesFromServer()
        store.init()
        // If loading failed, mark current files as saved
        if (!loaded) {
          store.markAllAsSaved()
        }
        // Auto-load preview for App if exists
        if (components.value.some(c => c.name === 'App')) {
          componentName.value = 'App'
          await loadComponent()
        }
      } else {
        store.init()
        // Mark default template as saved (no server content yet)
        store.markAllAsSaved()
      }
    })

    return {
      theme,
      serverUrl,
      appDomain,
      componentName,
      components,
      logs,
      loading,
      saving,
      loadedComponent,
      logContainer,
      previewContainer,
      store,
      CodeMirrorEditor,
      toggleTheme,
      log,
      clearLogs,
      refreshList,
      selectComponent,
      loadToEditor,
      loadComponent,
      saveToServer,
    }
  },
})
</script>

<style>
.remote-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-soft);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #35495e;
  color: white;
  flex-shrink: 0;
}

.header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header button {
  padding: 6px 12px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.header button:hover {
  background: rgba(255,255,255,0.1);
}

.header button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header .save-btn {
  background: #42b883;
  border-color: #42b883;
}

.header .save-btn:hover:not(:disabled) {
  background: #3aa776;
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.editor-panel {
  height: 100%;
}

.right-panel {
  height: 100%;
}

.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-left: 1px solid var(--border);
}

.panel-header {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-light);
  border-bottom: 1px solid var(--border);
  background: var(--bg-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

/* Loader Panel */
.loader-panel .form-group {
  margin-bottom: 12px;
}

.loader-panel label {
  display: block;
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 4px;
}

.loader-panel input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--bg);
  color: var(--text);
}

.loader-panel input:focus {
  outline: none;
  border-color: var(--color-branding);
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-soft);
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--border);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--color-branding);
  border-color: var(--color-branding);
  color: white;
}

.btn.primary:hover {
  background: #3aa776;
}

.component-list {
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-bottom: 16px;
}

.list-title {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 8px;
}

.component-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-soft);
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 13px;
  transition: all 0.2s;
}

.component-item:hover {
  background: rgba(66, 184, 131, 0.1);
}

.component-item.active {
  background: var(--color-branding);
  color: white;
}

.component-item .comp-name {
  flex: 1;
  cursor: pointer;
}

.component-item .deps {
  font-size: 11px;
  opacity: 0.7;
}

.component-item .edit-btn {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.component-item:hover .edit-btn {
  opacity: 1;
}

.component-item .edit-btn:hover {
  background: var(--color-branding);
  border-color: var(--color-branding);
  color: white;
}

.component-item.active .edit-btn {
  border-color: rgba(255,255,255,0.5);
  color: rgba(255,255,255,0.8);
}

.component-item.active .edit-btn:hover {
  background: rgba(255,255,255,0.2);
  border-color: white;
  color: white;
}

/* Log Section */
.log-section {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 8px;
}

.clear-btn {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
}

.clear-btn:hover {
  background: var(--border);
}

.log-content {
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  font-family: var(--font-code);
  font-size: 11px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
}

.log-item {
  margin-bottom: 4px;
  line-height: 1.4;
}

.log-item.success { color: #4ec9b0; }
.log-item.error { color: #f14c4c; }
.log-item.info { color: #9cdcfe; }

.log-time {
  opacity: 0.6;
  margin-right: 8px;
}

/* Preview Panel */
.preview-panel {
  border-left: none;
  border-top: 1px solid var(--border);
}

.preview-content {
  padding: 0;
}

#preview-container {
  height: 100%;
  padding: 20px;
  overflow: auto;
}

.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  font-size: 14px;
  gap: 8px;
}

.empty-state .empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-state .empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

/* Variables */
.remote-app {
  --bg: #fff;
  --bg-soft: #f8f8f8;
  --border: #ddd;
  --text: #213547;
  --text-light: #888;
  --font-code: Menlo, Monaco, Consolas, 'Courier New', monospace;
  --color-branding: #42b883;
  color: var(--text);
}

/* Dark mode */
body.dark .remote-app {
  --bg: #1a1a1a;
  --bg-soft: #242424;
  --border: #383838;
  --text: #e0e0e0;
  --text-light: #aaa;
  --color-branding: #42d392;
}
</style>
