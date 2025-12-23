import { reactive, ref, computed, watchEffect, watch, set, del, type ToRefs, type UnwrapRef } from 'vue'
import { compileFile } from './compiler'
import { utoa, atou, addSrcPrefix, stripSrcPrefix } from './utils'
import type { OutputModes } from './types'
import welcomeCode from './template/welcome.vue?raw'
import newSfcCode from './template/new-sfc.vue?raw'

// ============================================================================
// Constants
// ============================================================================

export const importMapFile = 'import-map.json'
export const defaultMainFile = 'src/App.vue'


// ============================================================================
// File Type and Factory
// ============================================================================

export interface File {
  filename: string
  code: string
  hidden: boolean
  compiled: {
    js: string
    css: string
  }
  readonly language: string
}

// Factory function to create File objects
// Returns a plain object - reactivity is handled by the store's ref wrapper
export function createFile(filename: string, code = '', hidden = false): File {
  return {
    filename,
    code,
    hidden,
    compiled: {
      js: '',
      css: '',
    },
    get language(): string {
      if (this.filename.endsWith('.vue')) return 'vue'
      if (this.filename.endsWith('.html')) return 'html'
      if (this.filename.endsWith('.css')) return 'css'
      if (this.filename.endsWith('.ts') || this.filename.endsWith('.tsx')) return 'typescript'
      if (this.filename.endsWith('.json')) return 'json'
      return 'javascript'
    }
  }
}

// For backwards compatibility with type imports
export { File as FileType }

// ============================================================================
// Import Map
// ============================================================================

export interface ImportMap {
  imports?: Record<string, string>
  scopes?: Record<string, Record<string, string>>
}

export function mergeImportMap(a: ImportMap, b: ImportMap): ImportMap {
  return {
    imports: { ...a.imports, ...b.imports },
    scopes: { ...a.scopes, ...b.scopes },
  }
}

// Default import map for Vue 2.7
function getDefaultImportMap(): ImportMap {
  return {
    imports: {
      vue: 'https://cdn.jsdelivr.net/npm/vue@2.7.16/dist/vue.esm.browser.min.js',
    },
  }
}

// ============================================================================
// Store Types
// ============================================================================

export type StoreState = ToRefs<{
  files: Record<string, File>
  activeFilename: string
  mainFile: string
  template: {
    welcomeSFC?: string
    newSFC?: string
  }
  builtinImportMap: ImportMap

  errors: (string | Error)[]
  showOutput: boolean
  outputMode: OutputModes

  loading: boolean

  // Enable tracking of file modifications (for remote save feature)
  trackFileChanges: boolean
}>

export interface ReplStore extends UnwrapRef<StoreState> {
  activeFile: File
  init(): void
  setActive(filename: string): void
  addFile(filename: string | File): void
  deleteFile(filename: string): void
  renameFile(oldFilename: string, newFilename: string): void
  getImportMap(): ImportMap
  setImportMap(map: ImportMap, merge?: boolean): void
  serialize(): string
  deserialize(serializedState: string): void
  getFiles(): Record<string, string>
  setFiles(newFiles: Record<string, string>, mainFile?: string): Promise<void>
  compileFile(file: File): Promise<(string | Error)[]>
  // Track saved state for remote feature
  markAsSaved(filename: string): void
  markAllAsSaved(): void
  isModified(filename: string): boolean
  getModifiedFiles(): File[]
  clearSavedState(): void
}

export type Store = Pick<
  ReplStore,
  | 'files'
  | 'activeFile'
  | 'mainFile'
  | 'errors'
  | 'showOutput'
  | 'outputMode'
  | 'init'
  | 'setActive'
  | 'addFile'
  | 'deleteFile'
  | 'renameFile'
  | 'getImportMap'
  | 'compileFile'
>

// ============================================================================
// useStore
// ============================================================================

export function useStore(
  {
    files = ref(Object.create(null)),
    activeFilename = undefined!,
    mainFile = ref(defaultMainFile),
    template = ref({
      welcomeSFC: welcomeCode,
      newSFC: newSfcCode,
    }),
    builtinImportMap = ref(getDefaultImportMap()),

    errors = ref([]),
    showOutput = ref(false),
    outputMode = ref('preview'),
    loading = ref(false),

    trackFileChanges = ref(false),
  }: Partial<StoreState> = {},
  serializedState?: string
): ReplStore {

  // Compile a single file
  async function doCompileFile(file: File): Promise<(string | Error)[]> {
    const { js, css, errors: compileErrors } = await compileFile(file.filename, file.code)
    // Directly assign to trigger reactivity
    file.compiled.js = js
    file.compiled.css = css
    // Increment version to force reactivity update
    codeVersion.value++
    return compileErrors
  }

  function applyBuiltinImportMap() {
    const importMap = mergeImportMap(builtinImportMap.value, getImportMap())
    setImportMap(importMap)
  }

  // Track code version to force recompilation
  const codeVersion = ref(0)

  function init() {
    // Watch activeFilename and the code of that file
    // Use separate watches to avoid circular dependency with codeVersion
    watch(
      [activeFilename, () => files.value[activeFilename.value]?.code],
      ([filename, code]) => {
        const file = files.value[filename]
        if (file && code !== undefined) {
          doCompileFile(file).then((errs) => {
            errors.value = errs
          })
        }
      },
      { immediate: true }
    )

    // Init import map file if not exists
    if (!files.value[importMapFile]) {
      set(files.value, importMapFile, createFile(
        importMapFile,
        JSON.stringify(builtinImportMap.value, undefined, 2)
      ))
    }

    // Compile all files (including mainFile)
    errors.value = []
    for (const [filename, file] of Object.entries(files.value)) {
      if (filename !== importMapFile) {
        doCompileFile(file).then((errs) => errors.value.push(...errs))
      }
    }
  }

  function setImportMap(map: ImportMap, merge = false) {
    if (merge) {
      map = mergeImportMap(getImportMap(), map)
    }

    const code = JSON.stringify(map, undefined, 2)
    if (files.value[importMapFile]) {
      files.value[importMapFile].code = code
    } else {
      files.value[importMapFile] = createFile(importMapFile, code)
    }
  }

  const setActive: Store['setActive'] = (filename) => {
    activeFilename.value = filename
  }

  const addFile: Store['addFile'] = (fileOrFilename) => {
    let file: File
    if (typeof fileOrFilename === 'string') {
      file = createFile(
        fileOrFilename,
        fileOrFilename.endsWith('.vue') ? template.value.newSFC || '' : ''
      )
    } else {
      file = fileOrFilename
    }
    // Use Vue 2's set() to make new properties reactive
    set(files.value, file.filename, file)
    if (!file.hidden) setActive(file.filename)
  }

  const deleteFile: Store['deleteFile'] = (filename) => {
    if (!confirm(`Are you sure you want to delete ${stripSrcPrefix(filename)}?`)) {
      return
    }

    if (activeFilename.value === filename) {
      activeFilename.value = mainFile.value
    }
    // Use Vue 2's del() to make deletion reactive
    del(files.value, filename)
  }

  const renameFile: Store['renameFile'] = (oldFilename, newFilename) => {
    const file = files.value[oldFilename]

    if (!file) {
      errors.value = [`Could not rename "${oldFilename}", file not found`]
      return
    }

    if (!newFilename || oldFilename === newFilename) {
      errors.value = [`Cannot rename "${oldFilename}" to "${newFilename}"`]
      return
    }

    file.filename = newFilename
    const newFiles: Record<string, File> = {}

    for (const [name, f] of Object.entries(files.value)) {
      if (name === oldFilename) {
        newFiles[newFilename] = f
      } else {
        newFiles[name] = f
      }
    }

    files.value = newFiles

    if (mainFile.value === oldFilename) {
      mainFile.value = newFilename
    }
    if (activeFilename.value === oldFilename) {
      activeFilename.value = newFilename
    } else {
      doCompileFile(file).then((errs) => (errors.value = errs))
    }
  }

  const getImportMap: Store['getImportMap'] = () => {
    try {
      return JSON.parse(files.value[importMapFile]?.code || '{}')
    } catch (e) {
      errors.value = [`Syntax error in ${importMapFile}: ${(e as Error).message}`]
      return {}
    }
  }

  const serialize = (): string => {
    const exportedFiles: Record<string, string> = {}
    for (const [filename, file] of Object.entries(files.value)) {
      const normalized = stripSrcPrefix(filename)
      // Skip import map if it matches builtin
      if (normalized === importMapFile) {
        try {
          const parsed = JSON.parse(file.code)
          const builtin = builtinImportMap.value.imports || {}
          if (parsed.imports) {
            for (const [key, value] of Object.entries(parsed.imports)) {
              if (builtin[key] === value) {
                delete parsed.imports[key]
              }
            }
          }
          if (Object.keys(parsed.imports || {}).length === 0 && Object.keys(parsed.scopes || {}).length === 0) {
            continue
          }
          exportedFiles[normalized] = JSON.stringify(parsed, null, 2)
        } catch {
          exportedFiles[normalized] = file.code
        }
      } else {
        exportedFiles[normalized] = file.code
      }
    }
    return '#' + utoa(JSON.stringify(exportedFiles))
  }

  const deserialize = (serializedState: string) => {
    if (serializedState.startsWith('#')) {
      serializedState = serializedState.slice(1)
    }
    let saved: Record<string, string>
    try {
      saved = JSON.parse(atou(serializedState))
    } catch (err) {
      console.error('[Vue2 REPL] Failed to deserialize state:', err)
      setDefaultFile()
      return
    }
    for (const filename in saved) {
      setFile(files.value, filename, saved[filename])
    }
    applyBuiltinImportMap()
  }

  const getFiles = (): Record<string, string> => {
    const exported: Record<string, string> = {}
    for (const [filename, file] of Object.entries(files.value)) {
      const normalized = stripSrcPrefix(filename)
      exported[normalized] = file.code
    }
    return exported
  }

  const setFiles = async (
    newFiles: Record<string, string>,
    newMainFile = store.mainFile
  ): Promise<void> => {
    const filesObj: Record<string, File> = Object.create(null)

    newMainFile = addSrcPrefix(newMainFile)
    if (!newFiles[stripSrcPrefix(newMainFile)]) {
      setFile(filesObj, newMainFile, template.value.welcomeSFC || welcomeCode)
    }
    for (const [filename, content] of Object.entries(newFiles)) {
      setFile(filesObj, filename, content)
    }

    const allErrors: (string | Error)[] = []
    for (const file of Object.values(filesObj)) {
      const errs = await doCompileFile(file)
      allErrors.push(...errs)
    }

    store.mainFile = newMainFile
    store.files = filesObj
    store.errors = allErrors
    applyBuiltinImportMap()
    setActive(store.mainFile)
  }

  const setDefaultFile = (): void => {
    setFile(files.value, mainFile.value, template.value.welcomeSFC || welcomeCode)
  }

  // Initialize from serialized state or default
  if (serializedState) {
    deserialize(serializedState)
  } else {
    setDefaultFile()
  }

  if (!files.value[mainFile.value]) {
    mainFile.value = Object.keys(files.value).find(f => f !== importMapFile) || defaultMainFile
  }

  activeFilename ||= ref(mainFile.value)
  // Include codeVersion dependency to force recompute when compilation finishes
  const activeFile = computed(() => {
    // Touch codeVersion to create dependency
    const _ = codeVersion.value
    return files.value[activeFilename.value]
  })

  applyBuiltinImportMap()

  // Track saved state for remote feature
  // Stores the code content at the time of last save
  const savedCodes = ref<Record<string, string>>({})

  function markAsSaved(filename: string) {
    const file = files.value[filename]
    if (file) {
      // Use Vue 2's set() for reactivity
      set(savedCodes.value, filename, file.code)
    }
  }

  function markAllAsSaved() {
    // Replace entire object to ensure reactivity
    const newSavedCodes: Record<string, string> = {}
    for (const [filename, file] of Object.entries(files.value)) {
      if (filename !== importMapFile) {
        newSavedCodes[filename] = file.code
      }
    }
    savedCodes.value = newSavedCodes
  }

  function isModified(filename: string): boolean {
    // If tracking is disabled, always return false
    if (!trackFileChanges.value) return false
    const file = files.value[filename]
    if (!file) return false
    // If file not in savedCodes, it's a new file (modified)
    if (!(filename in savedCodes.value)) return true
    return file.code !== savedCodes.value[filename]
  }

  function getModifiedFiles(): File[] {
    const modified: File[] = []
    for (const [filename, file] of Object.entries(files.value)) {
      if (filename !== importMapFile && isModified(filename)) {
        modified.push(file)
      }
    }
    return modified
  }

  function clearSavedState() {
    savedCodes.value = {}
  }

  const store: ReplStore = reactive({
    files,
    activeFile,
    activeFilename,
    mainFile,
    template,
    builtinImportMap,

    errors,
    showOutput,
    outputMode,
    loading,

    trackFileChanges,

    init,
    setActive,
    addFile,
    deleteFile,
    renameFile,
    getImportMap,
    setImportMap,
    serialize,
    deserialize,
    getFiles,
    setFiles,
    compileFile: doCompileFile,
    markAsSaved,
    markAllAsSaved,
    isModified,
    getModifiedFiles,
    clearSavedState,
  })

  return store
}

// Helper to set a file
function setFile(files: Record<string, File>, filename: string, content: string) {
  const normalized = addSrcPrefix(filename)
  files[normalized] = createFile(normalized, content)
}
