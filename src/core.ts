/**
 * Core module - headless REPL functionality without UI
 */

// Store
export { useStore, createFile, importMapFile, defaultMainFile } from './store'
export type { ReplStore, Store, StoreState, ImportMap, File } from './store'

// Compiler
export {
  compileFile,
  waitForBabel,
  COMP_IDENTIFIER,
} from './compiler'
export type {
  CompileOptions,
  CompileResult,
  CompileError,
  CompileSuccess,
} from './compiler'

// Output
export { PreviewProxy } from './output/PreviewProxy'
export { compileModulesForPreview, generateImportMapScript } from './output/moduleCompiler'
export type { PreviewError, ConsoleMessage, PreviewMessage } from './output/PreviewProxy'
export type { CompiledModules } from './output/moduleCompiler'

// Utils
export {
  utoa,
  atou,
  debounce,
  simpleHash,
  isVueSFC,
  isTS,
  isJSX,
  isJS,
  isCSS,
  isJSON,
  getExtension,
  stripSrcPrefix,
  addSrcPrefix,
} from './utils'

// Types
export type {
  OutputModes,
  EditorProps,
  EditorEmits,
  EditorComponentType,
  PreviewOptions,
  EditorOptions,
  SplitPaneOptions,
  ReplProps,
} from './types'
