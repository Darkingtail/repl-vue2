/**
 * Browser-compatible Vue 2.7 SFC Compiler
 * Uses vue2-sfc-runner for compilation
 */
import {
  createBrowserCompiler,
  waitForBabel as runnerWaitForBabel,
  COMP_IDENTIFIER,
} from 'vue2-sfc-runner'
import type { Compiler } from 'vue2-sfc-runner'

// Re-export COMP_IDENTIFIER for backwards compatibility
export { COMP_IDENTIFIER }

/**
 * Simple hash function for generating unique IDs
 */
function hashId(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8)
}

// Lazy-initialized compiler instance
let compilerInstance: Compiler | null = null

function getCompiler(): Compiler {
  if (!compilerInstance) {
    compilerInstance = createBrowserCompiler()
  }
  return compilerInstance
}

// ============================================================================
// File Extension Helpers
// ============================================================================

const FILE_EXT_REGEX = /([^.]+)\.([^.]+)$/

function getFileExtension(filename: string): string | undefined {
  const match = filename.match(FILE_EXT_REGEX)
  return match ? match[2] : undefined
}

function getBasename(filename: string): string {
  const match = filename.match(FILE_EXT_REGEX)
  return match ? match[1] : filename
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compile a file (SFC, JS, TS, JSX, TSX, CSS, JSON)
 */
export async function compileFile(
  filename: string,
  code: string
): Promise<{ js: string; css: string; errors: (string | Error)[] }> {
  const errors: (string | Error)[] = []

  if (!code.trim()) {
    return { js: '', css: '', errors }
  }

  const lang = getFileExtension(filename)
  const id = hashId(filename)

  try {
    // CSS/SCSS/SASS/LESS files - passthrough
    // Note: Preprocessing is only supported within .vue files
    // Standalone style files are passed through as-is
    if (lang === 'css' || lang === 'scss' || lang === 'sass' || lang === 'less') {
      return { js: '', css: code, errors }
    }

    // JSON files - parse and export
    if (lang === 'json') {
      try {
        const parsed = JSON.parse(code)
        return {
          js: `export default ${JSON.stringify(parsed)}`,
          css: '',
          errors,
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { js: '', css: '', errors: [msg] }
      }
    }

    // Vue SFC files - use vue2-sfc-runner (compiler.compileToCommonJS)
    if (lang === 'vue') {
      const compiler = getCompiler()
      const componentName = getBasename(filename)
      const result = await compiler.compileToCommonJS(code, componentName)

      if (result.errors.length > 0) {
        return { js: '', css: result.css, errors: result.errors }
      }

      let jsCode = result.js

      // Add CSS code as __css__ property for preview
      if (result.css) {
        // Check if __css__ is already added
        if (!jsCode.includes('.__css__')) {
          jsCode = jsCode.replace(
            /exports\["default"\]\s*=\s*(\w+);/,
            `$1.__css__ = ${JSON.stringify(result.css)};\nexports["default"] = $1;`
          )
        }
      }

      // Add __id__ for module identification
      jsCode = jsCode.replace(
        /exports\["default"\]\s*=\s*(\w+);/,
        `$1.__id__ = "${id}";\nexports["default"] = $1;`
      )

      return { js: jsCode, css: result.css, errors: [] }
    }

    // JS/TS/JSX/TSX files - use compiler.compileJSXToCommonJS
    if (lang && ['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
      const compiler = getCompiler()
      const result = await compiler.compileJSXToCommonJS(code, filename)

      if (result.errors.length > 0) {
        return { js: '', css: '', errors: result.errors }
      }

      let cjsCode = result.js

      // Remove CSS imports
      cjsCode = cjsCode.replace(
        /require\s*\(\s*["'][^"']+\.(css|less|scss|sass|styl|stylus)["']\s*\)\s*;?/g,
        '/* css import removed */'
      )

      // Inject h for JSX/TSX
      if (lang === 'jsx' || lang === 'tsx') {
        if (cjsCode.includes('"use strict";')) {
          cjsCode = cjsCode.replace(/("use strict";)/, '$1\nvar h = require("vue").h;')
        } else {
          cjsCode = 'var h = require("vue").h;\n' + cjsCode
        }
      }

      return { js: cjsCode, css: '', errors: [] }
    }

    return { js: '', css: '', errors: [`Unsupported file type: .${lang}`] }
  } catch (e) {
    return { js: '', css: '', errors: [e instanceof Error ? e : new Error(String(e))] }
  }
}

/**
 * Wait for Babel to be loaded
 */
export async function waitForBabel(timeout = 10000): Promise<void> {
  return runnerWaitForBabel(timeout)
}
