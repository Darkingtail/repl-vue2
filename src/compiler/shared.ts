/**
 * Shared compiler types for Vue 2 SFC compilation
 */

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
