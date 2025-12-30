<template>
  <div class="d2c-app" :class="{ dark: theme === 'dark' }">
    <header class="header">
      <h1>Vue 2 REPL - D2C</h1>
      <div class="header-actions">
        <button @click="toggleTheme">
          {{ theme === 'dark' ? 'Dark' : 'Light' }}
        </button>
      </div>
    </header>

    <div class="main-content">
      <SplitPane layout="horizontal" :initial-size="30">
        <template #left>
          <div class="d2c-panel">
            <div class="panel-header">Design to Code</div>
            <div class="panel-content">
              <!-- Server URL -->
              <div class="form-group">
                <label>D2C Server URL</label>
                <input v-model="serverUrl" type="text" placeholder="http://localhost:3001" />
                <button class="check-btn" @click="checkServer" :disabled="checking">
                  {{ checking ? '...' : 'Check' }}
                </button>
              </div>

              <!-- Tabs: Image / MasterGo -->
              <div class="input-tabs">
                <button
                  :class="{ active: inputMode === 'image' }"
                  @click="inputMode = 'image'"
                >
                  Image
                </button>
                <button
                  :class="{ active: inputMode === 'mastergo' }"
                  @click="inputMode = 'mastergo'"
                >
                  MasterGo
                </button>
              </div>

              <!-- Image Input -->
              <div v-if="inputMode === 'image'" class="image-input">
                <div
                  class="drop-zone"
                  :class="{ dragging: isDragging, 'has-image': !!imagePreview }"
                  @dragover.prevent="isDragging = true"
                  @dragleave="isDragging = false"
                  @drop.prevent="handleDrop"
                  @paste="handlePaste"
                  @click="triggerFileInput"
                  tabindex="0"
                >
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleFileSelect"
                  />
                  <template v-if="imagePreview">
                    <img :src="imagePreview" alt="Preview" class="preview-image" />
                    <button class="clear-btn" @click.stop="clearImage">
                      Clear
                    </button>
                  </template>
                  <template v-else>
                    <div class="drop-hint">
                      <div class="icon">Image</div>
                      <div>Drag image, paste (Ctrl+V), or click to upload</div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- MasterGo Input -->
              <div v-if="inputMode === 'mastergo'" class="mastergo-input">
                <div class="form-group">
                  <label>MasterGo Link</label>
                  <input
                    v-model="mastergoLink"
                    type="text"
                    placeholder="https://mastergo.com/file/xxx?node_id=xxx"
                  />
                </div>
                <div class="hint">
                  Paste MasterGo design link with node_id for specific component
                </div>
              </div>

              <!-- Additional Prompt -->
              <div class="form-group">
                <label>Additional Instructions (Optional)</label>
                <textarea
                  v-model="additionalPrompt"
                  placeholder="e.g., Use Element UI components, Add hover effects..."
                  rows="3"
                ></textarea>
              </div>

              <!-- Generate Button -->
              <button
                class="generate-btn"
                @click="generateCode"
                :disabled="generating || (!imageData && !mastergoLink)"
              >
                <span v-if="generating" class="loading"></span>
                {{ generating ? 'Generating...' : 'Generate Vue 2 Code' }}
              </button>

              <!-- Status -->
              <div v-if="status" class="status" :class="status.type">
                {{ status.message }}
              </div>
            </div>
          </div>
        </template>

        <template #right>
          <div class="repl-panel">
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
      </SplitPane>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import SplitPane from '../src/components/SplitPane.vue'
import { Repl, useStore } from '../src'
import CodeMirrorEditor from '../src/editor/codemirror/CodeMirrorEditor.vue'

interface Status {
  type: 'info' | 'success' | 'error'
  message: string
}

export default defineComponent({
  name: 'D2CApp',
  components: {
    SplitPane,
    Repl,
  },
  setup() {
    const theme = ref<'light' | 'dark'>('light')
    const serverUrl = ref('http://localhost:3001')
    const inputMode = ref<'image' | 'mastergo'>('image')
    const mastergoLink = ref('')
    const additionalPrompt = ref('')
    const imageData = ref<string | null>(null)
    const imagePreview = ref<string | null>(null)
    const isDragging = ref(false)
    const generating = ref(false)
    const checking = ref(false)
    const status = ref<Status | null>(null)
    const fileInput = ref<HTMLInputElement | null>(null)

    const store = useStore()

    function toggleTheme() {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
      document.body.classList.toggle('dark', theme.value === 'dark')
    }

    function setStatus(type: Status['type'], message: string) {
      status.value = { type, message }
      if (type !== 'error') {
        setTimeout(() => {
          if (status.value?.message === message) {
            status.value = null
          }
        }, 5000)
      }
    }

    // Check server connection
    async function checkServer() {
      checking.value = true
      try {
        const res = await fetch(`${serverUrl.value}/api/health`)
        const data = await res.json()
        if (data.status === 'ok') {
          setStatus('success', `Server OK - MasterGo: ${data.mastergo ? 'Yes' : 'No'}, AI: ${data.ai ? 'Yes' : 'No'}`)
        } else {
          setStatus('error', 'Server returned invalid response')
        }
      } catch (e: any) {
        setStatus('error', `Cannot connect to server: ${e.message}`)
      } finally {
        checking.value = false
      }
    }

    // Image handling
    function triggerFileInput() {
      fileInput.value?.click()
    }

    function handleFileSelect(e: Event) {
      const input = e.target as HTMLInputElement
      const file = input.files?.[0]
      if (file) {
        processImageFile(file)
      }
    }

    function handleDrop(e: DragEvent) {
      isDragging.value = false
      const file = e.dataTransfer?.files[0]
      if (file && file.type.startsWith('image/')) {
        processImageFile(file)
      }
    }

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            processImageFile(file)
            e.preventDefault()
            break
          }
        }
      }
    }

    function processImageFile(file: File) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        imagePreview.value = result
        imageData.value = result
        setStatus('info', `Image loaded: ${file.name}`)
      }
      reader.readAsDataURL(file)
    }

    function clearImage() {
      imageData.value = null
      imagePreview.value = null
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }

    // Generate code
    async function generateCode() {
      if (inputMode.value === 'image' && !imageData.value) {
        setStatus('error', 'Please upload an image first')
        return
      }
      if (inputMode.value === 'mastergo' && !mastergoLink.value) {
        setStatus('error', 'Please enter a MasterGo link')
        return
      }

      generating.value = true
      setStatus('info', 'Generating code...')

      try {
        let response

        if (inputMode.value === 'image') {
          // Image to code
          response = await fetch(`${serverUrl.value}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: imageData.value,
              prompt: additionalPrompt.value,
            }),
          })
        } else {
          // MasterGo to code
          response = await fetch(`${serverUrl.value}/api/mastergo/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              link: mastergoLink.value,
              prompt: additionalPrompt.value,
            }),
          })
        }

        const data = await response.json()

        if (data.success && data.code) {
          // Set generated code to REPL
          await store.setFiles({ 'App.vue': data.code })
          store.init()
          setStatus('success', `Code generated! (${data.code.length} chars, model: ${data.model})`)
        } else {
          setStatus('error', data.error || 'Failed to generate code')
        }
      } catch (e: any) {
        setStatus('error', `Error: ${e.message}`)
      } finally {
        generating.value = false
      }
    }

    // Add global paste listener
    onMounted(() => {
      document.addEventListener('paste', handlePaste)
      store.init()
    })

    return {
      theme,
      serverUrl,
      inputMode,
      mastergoLink,
      additionalPrompt,
      imageData,
      imagePreview,
      isDragging,
      generating,
      checking,
      status,
      fileInput,
      store,
      CodeMirrorEditor,
      toggleTheme,
      checkServer,
      triggerFileInput,
      handleFileSelect,
      handleDrop,
      handlePaste,
      clearImage,
      generateCode,
    }
  },
})
</script>

<style>
.d2c-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  --bg: #fff;
  --bg-soft: #f8f8f8;
  --border: #ddd;
  --text: #213547;
  --text-light: #888;
  --color-branding: #42b883;
  color: var(--text);
}

.d2c-app.dark {
  --bg: #1a1a1a;
  --bg-soft: #242424;
  --border: #383838;
  --text: #e0e0e0;
  --text-light: #aaa;
  --color-branding: #42d392;
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

.main-content {
  flex: 1;
  overflow: hidden;
}

.d2c-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-right: 1px solid var(--border);
}

.panel-header {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  background: var(--bg-soft);
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--bg);
  color: var(--text);
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-branding);
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.check-btn {
  margin-top: 8px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-soft);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
}

.check-btn:hover {
  background: var(--border);
}

.check-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.input-tabs button {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-light);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.input-tabs button:hover {
  background: var(--bg-soft);
}

.input-tabs button.active {
  background: var(--color-branding);
  border-color: var(--color-branding);
  color: white;
}

.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.drop-zone:hover,
.drop-zone:focus {
  border-color: var(--color-branding);
  outline: none;
}

.drop-zone.dragging {
  border-color: var(--color-branding);
  background: rgba(66, 184, 131, 0.1);
}

.drop-zone.has-image {
  padding: 8px;
}

.drop-hint {
  color: var(--text-light);
  font-size: 13px;
}

.drop-hint .icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
}

.clear-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  font-size: 11px;
}

.clear-btn:hover {
  background: #f44336;
  border-color: #f44336;
  color: white;
}

.mastergo-input .hint {
  font-size: 11px;
  color: var(--text-light);
  margin-top: -8px;
  margin-bottom: 16px;
}

.generate-btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  background: var(--color-branding);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background: #3aa776;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.status.info {
  background: rgba(66, 184, 131, 0.1);
  color: var(--color-branding);
}

.status.success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.status.error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.repl-panel {
  height: 100%;
}
</style>
