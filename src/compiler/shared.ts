/**
 * Shared compiler utilities for Vue 2 SFC compilation
 */
import { compileStyle, type SFCDescriptor } from '@vue/compiler-sfc'

// ============================================================================
// Constants
// ============================================================================

/** Component identifier used in compiled output */
export const COMP_IDENTIFIER = '__sfc__'

/** Regex for parsing filename into basename and extension */
export const FILE_EXT_REGEX = /([^.]+)\.([^.]+)$/

// ============================================================================
// Types
// ============================================================================

export interface CompileOptions {
  code: string
  filename: string
  id: string
}

export type CompileResult = CompileError | CompileSuccess

export type CompileError = Error[]

export interface CompileSuccess {
  js: string
  css: string
}

export function isCompileError(result: CompileResult): result is CompileError {
  return Array.isArray(result)
}

// ============================================================================
// Utility Functions
// ============================================================================

export function resolveFilename(filename: string): { basename: string; lang: string } {
  const match = filename.match(FILE_EXT_REGEX)
  if (!match) {
    throw new Error(`[Vue2 Compiler] Invalid filename format: ${filename}`)
  }
  const [, basename, lang] = match
  return { basename, lang }
}

export function safeResolveFilename(filename: string): { basename?: string; lang?: string } {
  const match = filename.match(FILE_EXT_REGEX)
  if (!match) {
    return { basename: undefined, lang: undefined }
  }
  const [, basename, lang] = match
  return { basename, lang }
}

export function generateComponentId(filename: string): string {
  const id = filename.replace(/[^\dA-Za-z]/g, '_')
  return id || 'component'
}

// ============================================================================
// Error Handling
// ============================================================================

export function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (typeof e === 'string') return new Error(e)
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return new Error(String((e as { message: unknown }).message))
  }
  return new Error(String(e))
}

// ============================================================================
// Style Compilation
// ============================================================================

export type StylePreprocessor = (source: string, lang: string) => string | Promise<string>

export async function compileStylesAsync(
  id: string,
  styles: SFCDescriptor['styles'],
  filename = 'component.vue',
  preprocessor?: (source: string, lang: string) => string | Promise<string>
): Promise<string | Error[]> {
  const styleList: string[] = []

  for (const style of styles) {
    let source = style.content
    const lang = style.lang || 'css'

    // Apply preprocessor if style has a preprocessor lang
    if (lang !== 'css' && preprocessor) {
      try {
        source = await preprocessor(source, lang)
      } catch (error) {
        return [toError(error)]
      }
    }

    const result = compileStyle({
      filename,
      id: `data-v-${id}`,
      scoped: style.scoped || false,
      source,
      trim: true,
    })

    if (result.errors && result.errors.length) {
      return result.errors.map((e) => (e instanceof Error ? e : new Error(String(e))))
    }

    styleList.push(result.code)
  }

  return styleList.join('\n')
}

export const SUPPORTED_STYLE_LANGS = ['css', 'less', 'scss', 'sass'] as const

export function hasUnsupportedStyleLang(styles: SFCDescriptor['styles']): boolean {
  return styles.some((style) => style.lang && !SUPPORTED_STYLE_LANGS.includes(style.lang as any))
}

export function hasStyleModule(styles: SFCDescriptor['styles']): boolean {
  return styles.some((style) => style.module)
}

export function hasScoped(styles: SFCDescriptor['styles']): boolean {
  return styles.some((style) => style.scoped)
}

// ============================================================================
// Code Generation Helpers
// ============================================================================

export function generateScopedIdCode(id: string): string {
  return `${COMP_IDENTIFIER}._scopeId = "data-v-${id}";`
}

export function generateCssCode(css: string): string {
  return `${COMP_IDENTIFIER}.__css__ = ${JSON.stringify(css)};`
}

export function generateIdCode(id: string): string {
  return `${COMP_IDENTIFIER}.__id__ = "${id}";`
}

export const WARNINGS = {
  PREPROCESSOR:
    'Custom preprocessors for <template> and <style> are not supported in the Playground.',
  STYLE_MODULE: '<style module> is not supported in the Playground.',
} as const
