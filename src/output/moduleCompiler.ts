/**
 * Module compiler for preview
 * Converts compiled files into modules that can be loaded in the iframe
 */

import type { File, ReplStore, ImportMap } from '../store'
import { stripSrcPrefix } from '../utils'

export interface CompiledModules {
  modules: Record<string, string>
  mainModule: string
  css: string
  importMap: ImportMap
}

/**
 * Compile all files in store for preview
 */
export function compileModulesForPreview(store: ReplStore): CompiledModules {
  const modules: Record<string, string> = {}
  let css = ''
  const importMap = store.getImportMap()

  // Process all files
  for (const [filename, file] of Object.entries(store.files)) {
    // Skip import map
    if (filename === 'import-map.json') continue

    // Collect CSS
    if (file.compiled.css) {
      css += file.compiled.css + '\n'
    }

    // Skip if no JS
    if (!file.compiled.js) continue

    // Transform requires to use normalized paths
    let code = file.compiled.js

    // Normalize module name (remove src/ prefix for consistency)
    const moduleName = normalizeModuleName(filename)

    // Transform relative imports
    code = transformImports(code, filename, store.files)

    modules[moduleName] = code
  }

  const mainModule = normalizeModuleName(store.mainFile)

  return {
    modules,
    mainModule,
    css: css.trim(),
    importMap,
  }
}

/**
 * Normalize module name (remove src/ and extension)
 */
function normalizeModuleName(filename: string): string {
  let name = stripSrcPrefix(filename)
  // Remove extension for imports
  name = name.replace(/\.(vue|js|ts|jsx|tsx)$/, '')
  return name
}

/**
 * Transform require() calls to use normalized paths
 */
function transformImports(
  code: string,
  currentFile: string,
  files: Record<string, File>
): string {
  // Match require("./xxx") or require('../xxx')
  return code.replace(
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
    (match, importPath) => {
      // Skip external packages (vue, element-ui, etc.)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return match
      }

      // Resolve relative path
      const resolved = resolveImportPath(currentFile, importPath, files)
      console.log(`[ModuleCompiler] Resolving import: ${importPath} from ${currentFile} -> ${resolved}`)
      if (resolved) {
        const moduleName = normalizeModuleName(resolved)
        console.log(`[ModuleCompiler] Transformed to: require("${moduleName}")`)
        return `require("${moduleName}")`
      }

      console.warn(`[ModuleCompiler] Could not resolve: ${importPath} from ${currentFile}`)
      return match
    }
  )
}

/**
 * Resolve relative import path to actual file
 */
function resolveImportPath(
  currentFile: string,
  importPath: string,
  files: Record<string, File>
): string | null {
  // Get directory of current file
  const dir = currentFile.includes('/')
    ? currentFile.substring(0, currentFile.lastIndexOf('/'))
    : ''

  // Resolve relative path
  let resolved: string
  if (importPath.startsWith('./')) {
    resolved = dir ? `${dir}/${importPath.slice(2)}` : importPath.slice(2)
  } else if (importPath.startsWith('../')) {
    const parts = dir.split('/')
    let path = importPath
    while (path.startsWith('../')) {
      parts.pop()
      path = path.slice(3)
    }
    resolved = parts.length ? `${parts.join('/')}/${path}` : path
  } else if (importPath.startsWith('/')) {
    resolved = importPath.slice(1)
  } else {
    resolved = importPath
  }

  // Try to find the file with various extensions
  const extensions = ['', '.vue', '.js', '.ts', '.jsx', '.tsx', '.json']
  for (const ext of extensions) {
    const candidate = resolved + ext
    // Check both with and without src/ prefix
    if (files[candidate] || files[`src/${candidate}`]) {
      return files[candidate] ? candidate : `src/${candidate}`
    }
  }

  return null
}

/**
 * Generate import map script tag content
 */
export function generateImportMapScript(importMap: ImportMap): string {
  return `<script type="importmap">${JSON.stringify(importMap, null, 2)}</script>`
}
