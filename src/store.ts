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
  }: Partial<StoreState> = {},
  serializedState?: string
): ReplStore {

  // Compile a single file
  async function doCompileFile(file: File): Promise<(string | Error)[]> {
    const { js, css, errors: compileErrors } = await compileFile(file.filename, file.code)
    file.compiled.js = js
    file.compiled.css = css
    return compileErrors
  }

  function applyBuiltinImportMap() {
    const importMap = mergeImportMap(builtinImportMap.value, getImportMap())
    setImportMap(importMap)
  }

  // Track code version to force recompilation
  const codeVersion = ref(0)

  function init() {
    // Use watchEffect to auto-track dependencies
    // Access file.code to create reactive dependency
    watchEffect(() => {
      const file = activeFile.value
      if (file) {
        // Access code to track it as dependency
        const code = file.code
        const filename = file.filename
        // Trigger compilation
        if (code !== undefined) {
          doCompileFile(file).then((errs) => {
            errors.value = errs
          })
        }
      }
    })

    // Init import map file if not exists
    if (!files.value[importMapFile]) {
      set(files.value, importMapFile, createFile(
        importMapFile,
        JSON.stringify(builtinImportMap.value, undefined, 2)
      ))
    }

    // Compile all other files
    errors.value = []
    for (const [filename, file] of Object.entries(files.value)) {
      if (filename !== mainFile.value && filename !== importMapFile) {
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
  const activeFile = computed(() => files.value[activeFilename.value])

  applyBuiltinImportMap()

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
  })

  return store
}

// Helper to set a file
function setFile(files: Record<string, File>, filename: string, content: string) {
  const normalized = addSrcPrefix(filename)
  files[normalized] = createFile(normalized, content)
}
