/**
 * Browser-compatible Vue 2.7 SFC Compiler
 * Adapted from preset-vue2 for standalone REPL use
 */
import { parse, compileScript, rewriteDefault, type SFCDescriptor } from '@vue/compiler-sfc'
import hashId from 'hash-sum'
import {
  COMP_IDENTIFIER,
  type CompileOptions,
  type CompileResult,
  WARNINGS,
  compileStylesAsync,
  generateCssCode,
  generateIdCode,
  generateScopedIdCode,
  hasScoped,
  hasStyleModule,
  hasUnsupportedStyleLang,
  safeResolveFilename,
  toError,
} from './shared'
import { getVue2JsxPlugins, loadVue2JsxPlugins } from './vue-jsx'

// ============================================================================
// Style Preprocessor
// ============================================================================

async function browserStylePreprocessor(source: string, lang: string): Promise<string> {
  if (lang === 'less') {
    const lessLib = window.less
    if (!lessLib) {
      console.warn('[Vue2 REPL] less.js not loaded. LESS styles will not be compiled.')
      return source
    }
    try {
      const result = await lessLib.render(source)
      return result.css
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      throw new Error(`LESS compile error: ${msg}`)
    }
  }

  if (lang === 'scss' || lang === 'sass') {
    const sassLib = window.Sass
    if (!sassLib) {
      console.warn('[Vue2 REPL] sass.js not loaded. SCSS/SASS styles will not be compiled.')
      return source
    }
    return new Promise<string>((resolve, reject) => {
      sassLib.compile(source, (result) => {
        if (result.status === 0 && result.text) {
          resolve(result.text)
        } else {
          reject(new Error(`SCSS compile error: ${result.message || result.formatted || 'Unknown error'}`))
        }
      })
    })
  }

  return source
}

// ============================================================================
// Babel Transform
// ============================================================================

function getBabel() {
  if (!window.Babel) {
    throw new Error('[Vue2 REPL] Babel standalone is not loaded. Please include @babel/standalone.')
  }
  return window.Babel
}

function transformTS(
  src: string,
  filename: string,
  options: {
    lang?: string
    plugins?: any[]
    presets?: any[]
  } = {}
): string {
  const babel = getBabel()
  const { lang, plugins = [], presets = [] } = options

  // Add TypeScript preset if needed
  if (lang === 'ts' || lang === 'tsx') {
    presets.push([
      'typescript',
      { allExtensions: true, isTSX: lang === 'tsx', onlyRemoveTypeImports: true },
    ])
  }

  // Add Vue 2 JSX plugins for JSX/TSX files
  if (lang === 'jsx' || lang === 'tsx') {
    const jsxPlugins = getVue2JsxPlugins()
    plugins.push(...jsxPlugins)
  }

  const { basename } = safeResolveFilename(filename)

  const result = babel.transform(src, {
    filename: (basename || 'component') + '.' + (lang || 'js'),
    plugins,
    presets,
  })
  return result?.code || ''
}

function toCommonJS(es: string): string {
  const babel = getBabel()
  const result = babel.transform(es, {
    presets: [['env', { modules: 'cjs' }]],
  })
  return result?.code || es
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract component names from import statements in script setup
 * Matches: import Comp from './Comp.vue'
 */
function extractImportedComponents(scriptContent: string): string[] {
  const components: string[] = []
  // Match: import ComponentName from './path.vue' or "./path.vue"
  const importRegex = /import\s+(\w+)\s+from\s+['"][^'"]+\.vue['"]/g
  let match
  while ((match = importRegex.exec(scriptContent)) !== null) {
    components.push(match[1])
  }
  return components
}

// ============================================================================
// SFC Compilation
// ============================================================================

function doCompileScript(
  id: string,
  descriptor: SFCDescriptor,
  scopedStyles: boolean,
  filename = 'component.vue'
): string | Error[] {
  const { template, script, scriptSetup } = descriptor

  let sfcCode = ''
  const scriptLang = script?.lang || scriptSetup?.lang || 'js'

  const expressionPlugins: any[] = []
  if (scriptLang === 'ts' || scriptLang === 'tsx') {
    expressionPlugins.push('typescript')
  }

  if (script || scriptSetup) {
    try {
      const compiledScript = compileScript(descriptor, {
        babelParserPlugins: expressionPlugins,
        id,
        inlineTemplate: false,
        isProd: false,
      })

      let content = compiledScript.content
      content = rewriteDefault(content, COMP_IDENTIFIER, expressionPlugins)
      sfcCode = transformTS(content, filename, { lang: scriptLang })

      // For script setup, extract imported components and register them
      if (scriptSetup) {
        const importedComponents = extractImportedComponents(scriptSetup.content)
        if (importedComponents.length > 0) {
          const componentsCode = importedComponents
            .map(name => `"${name}": ${name}`)
            .join(', ')
          sfcCode += `\n${COMP_IDENTIFIER}.components = { ${componentsCode} };`
        }
      }
    } catch (error) {
      return [toError(error)]
    }
  } else {
    sfcCode = `const ${COMP_IDENTIFIER} = {};`
  }

  // Attach template for Vue 2 runtime compilation
  if (template?.content) {
    sfcCode += `\n${COMP_IDENTIFIER}.template = ${JSON.stringify(template.content)};`
  }

  // For scoped styles - Vue 2 uses _scopeId (single underscore)
  if (scopedStyles) {
    sfcCode += `\n${generateScopedIdCode(id)}`
  }

  return sfcCode
}

async function compileSFC(options: CompileOptions): Promise<CompileResult> {
  const { id, code, filename } = options

  const parseResult = parse(code, {
    filename,
    sourceMap: false,
  })

  const descriptor = parseResult.descriptor
  const parseErrors = parseResult.errors

  if (parseErrors && parseErrors.length) {
    return (parseErrors as unknown[]).map(toError)
  }

  let js = ''
  let skipStyleCompile = false

  // Check for unsupported features
  if (descriptor.template && descriptor.template.lang) {
    // Template preprocessors (like pug) are not supported
    js += `\nconsole.warn("Custom preprocessors for <template> are not supported.")`
  }

  if (hasUnsupportedStyleLang(descriptor.styles)) {
    skipStyleCompile = true
    js += `\nconsole.warn("Unsupported style preprocessor. Supported: css, scss, sass, less.")`
  }

  if (hasStyleModule(descriptor.styles)) {
    skipStyleCompile = true
    js += `\nconsole.warn(${JSON.stringify(WARNINGS.STYLE_MODULE)})`
  }

  const scopedStyles = hasScoped(descriptor.styles)
  const scriptResult = doCompileScript(id, descriptor, scopedStyles, filename)

  if (Array.isArray(scriptResult)) {
    return scriptResult as Error[]
  }

  js += `\n${scriptResult}`

  // Compile styles
  let css = ''
  if (!skipStyleCompile && descriptor.styles.length > 0) {
    const styleResult = await compileStylesAsync(
      id,
      descriptor.styles,
      filename,
      browserStylePreprocessor
    )
    if (Array.isArray(styleResult)) {
      return styleResult
    }
    css = styleResult
  }

  return { css, js }
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

  const { lang } = safeResolveFilename(filename)
  const id = hashId(filename)

  // Ensure JSX plugins are loaded
  await loadVue2JsxPlugins()

  try {
    // CSS files
    if (lang === 'css') {
      return { js: '', css: code, errors }
    }

    // JSON files
    if (lang === 'json') {
      try {
        const parsed = JSON.parse(code)
        return {
          js: `export default ${JSON.stringify(parsed)}`,
          css: '',
          errors,
        }
      } catch (e: any) {
        return { js: '', css: '', errors: [e.message] }
      }
    }

    // Vue SFC files
    if (lang === 'vue') {
      const compiled = await compileSFC({ code, filename, id })

      if (Array.isArray(compiled)) {
        return { js: '', css: '', errors: compiled }
      }

      let { css, js } = compiled

      if (css) {
        js += `\n${generateCssCode(css)}`
      }
      js += `\n${generateIdCode(id)}`
      js += `\nexport default ${COMP_IDENTIFIER};`

      // Convert to CommonJS for preview sandbox
      let cjsCode = toCommonJS(js)

      // Fix Vue.extend() issue
      cjsCode = cjsCode.replace(/_vue\["default"]\.extend\({/g, '({')
      cjsCode = cjsCode.replace(/_vue\.default\.extend\({/g, '({')

      return { js: cjsCode, css, errors }
    }

    // JS/TS/JSX/TSX files
    if (lang && ['tsx', 'jsx', 'ts', 'js'].includes(lang)) {
      let js = transformTS(code, filename, { lang })
      let cjsCode = toCommonJS(js)

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

      // Fix Vue.extend()
      cjsCode = cjsCode.replace(/_vue\["default"]\.extend\({/g, '({')
      cjsCode = cjsCode.replace(/_vue\.default\.extend\({/g, '({')

      return { js: cjsCode, css: '', errors }
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
  const startTime = Date.now()
  while (!window.Babel) {
    if (Date.now() - startTime > timeout) {
      throw new Error('[Vue2 REPL] Babel standalone is not loaded.')
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100))
  }
}
