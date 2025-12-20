import type { InjectionKey, Ref, Component } from 'vue'

export type OutputModes = 'preview' | 'js' | 'css'

export interface EditorProps {
  value: string
  filename: string
  readonly?: boolean
  mode?: string
}

export interface EditorEmits {
  (e: 'change', value: string): void
}

export type EditorComponentType = Component

export interface PreviewOptions {
  headHTML?: string
  bodyHTML?: string
  placeholderHTML?: string
  customCode?: {
    importCode?: string
    useCode?: string
  }
  showRuntimeError?: boolean
  showRuntimeWarning?: boolean
}

export interface EditorOptions {
  showErrorText?: string | false
  autoSaveText?: string | false
}

export interface SplitPaneOptions {
  codeTogglerText?: string
  outputTogglerText?: string
}

export interface ReplProps {
  theme?: 'dark' | 'light'
  previewTheme?: boolean
  autoResize?: boolean
  showCompileOutput?: boolean
  showImportMap?: boolean
  clearConsole?: boolean
  layout?: 'horizontal' | 'vertical'
  layoutReverse?: boolean
  previewOptions?: PreviewOptions
  editorOptions?: EditorOptions
  splitPaneOptions?: SplitPaneOptions
}

// Injection keys
export const injectKeyProps: InjectionKey<{
  theme: Ref<'dark' | 'light'>
  previewTheme: Ref<boolean>
  previewOptions: Ref<PreviewOptions>
  editorOptions: Ref<EditorOptions>
  clearConsole: Ref<boolean>
  autoSave: Ref<boolean>
}> = Symbol('repl-props')

export const injectKeyPreviewRef: InjectionKey<Ref<HTMLDivElement | null>> = Symbol('preview-ref')
