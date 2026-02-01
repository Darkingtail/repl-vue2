// WORKAROUND: @vue/compiler-dom uses document.createElement() for HTML entity decoding
// This fails in Web Worker. Provide a minimal polyfill.
// The polyfill creates a fake DOM element that can decode HTML entities.
if (typeof document === 'undefined') {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': '\u00A0',
  }

  const decodeEntities = (html: string): string => {
    return html.replace(
      /&(?:#(\d+)|#x([0-9a-fA-F]+)|(\w+));/g,
      (match, dec, hex) => {
        if (dec) return String.fromCharCode(parseInt(dec, 10))
        if (hex) return String.fromCharCode(parseInt(hex, 16))
        return entityMap[match] || match
      }
    )
  }

  const createFakeElement = () => {
    let _textContent = ''
    return {
      get textContent() {
        return _textContent
      },
      set textContent(val: string) {
        _textContent = val
      },
      set innerHTML(html: string) {
        _textContent = decodeEntities(html.replace(/<[^>]*>/g, ''))
      },
      children: [{ getAttribute: () => '' }],
    }
  }

  ;(globalThis as any).document = {
    createElement: createFakeElement,
  }
}

import { createNpmFileSystem } from '@volar/jsdelivr'
import {
  type LanguageServiceEnvironment,
  createTypeScriptWorkerLanguageService,
} from '@volar/monaco/worker'
import {
  type VueCompilerOptions,
  createVueLanguagePlugin,
  getDefaultCompilerOptions,
  generateGlobalTypes,
  getGlobalTypesFileName,
} from '@vue/language-core'
import { createVueLanguageServicePlugins } from '@vue/language-service'
import type * as monaco from 'monaco-editor-core'
// @ts-expect-error - worker module
import * as worker from 'monaco-editor-core/esm/vs/editor/editor.worker'
import { create as createTypeScriptDirectiveCommentPlugin } from 'volar-service-typescript/lib/plugins/directiveComment'
import { create as createTypeScriptSemanticPlugin } from 'volar-service-typescript/lib/plugins/semantic'
import { URI } from 'vscode-uri'
import type { WorkerHost, WorkerMessage } from './env'

export interface CreateData {
  tsconfig: {
    compilerOptions?: import('typescript').CompilerOptions
    vueCompilerOptions?: Partial<VueCompilerOptions>
  }
  dependencies: Record<string, string>
}

const asFileName = (uri: URI) => uri.path
const asUri = (fileName: string): URI => URI.file(fileName)

let ts: typeof import('typescript')
let locale: string | undefined

self.onmessage = async (msg: MessageEvent<WorkerMessage>) => {
  if (msg.data?.event === 'init') {
    locale = msg.data.tsLocale
    ts = await importTsFromCdn(msg.data.tsVersion)
    self.postMessage('inited')
    return
  }

  worker.initialize(
    (
      ctx: monaco.worker.IWorkerContext<WorkerHost>,
      { tsconfig, dependencies }: CreateData,
    ) => {
      const env: LanguageServiceEnvironment = {
        workspaceFolders: [URI.file('/')],
        locale,
        fs: createNpmFileSystem(
          (uri) => {
            if (uri.scheme === 'file') {
              if (uri.path === '/node_modules') {
                return ''
              } else if (uri.path.startsWith('/node_modules/')) {
                return uri.path.slice('/node_modules/'.length)
              }
            }
          },
          (pkgName) => dependencies[pkgName],
          (path, content) => {
            ctx.host.onFetchCdnFile(
              asUri('/node_modules/' + path).toString(),
              content,
            )
          },
        ),
      }

      const { options: compilerOptions } = ts.convertCompilerOptionsFromJson(
        tsconfig?.compilerOptions || {},
        '',
      )

      // Vue 2.7 compiler options
      const vueCompilerOptions: VueCompilerOptions = {
        ...getDefaultCompilerOptions(),
        ...tsconfig.vueCompilerOptions,
        target: 2.7, // Critical: Set Vue 2.7 target
      }

      // Setup global types
      setupGlobalTypes(vueCompilerOptions, env)

      const workerService = createTypeScriptWorkerLanguageService({
        typescript: ts,
        compilerOptions,
        workerContext: ctx,
        env,
        uriConverter: {
          asFileName,
          asUri,
        },
        languagePlugins: [
          createVueLanguagePlugin(
            ts,
            compilerOptions,
            vueCompilerOptions,
            asFileName,
          ),
        ],
        languageServicePlugins: [
          createTypeScriptSemanticPlugin(ts),
          createTypeScriptDirectiveCommentPlugin(),
          ...getVueLanguageServicePlugins(),
        ],
      })

      return workerService

      function setupGlobalTypes(
        options: VueCompilerOptions,
        env: LanguageServiceEnvironment,
      ) {
        const globalTypes = generateGlobalTypes(options)
        const globalTypesPath =
          '/node_modules/' + getGlobalTypesFileName(options)
        options.globalTypesPath = () => globalTypesPath
        const { stat, readFile } = env.fs!
        const ctime = Date.now()
        env.fs!.stat = async (uri) => {
          if (uri.path === globalTypesPath) {
            return {
              type: 1,
              ctime: ctime,
              mtime: ctime,
              size: globalTypes.length,
            }
          }
          return stat(uri)
        }
        env.fs!.readFile = async (uri) => {
          if (uri.path === globalTypesPath) {
            return globalTypes
          }
          return readFile(uri)
        }
      }

      function getVueLanguageServicePlugins() {
        // Create Vue language service plugins with empty implementations for unsupported features
        const plugins = createVueLanguageServicePlugins(ts, {
          getComponentDirectives() {
            return []
          },
          getComponentEvents() {
            return []
          },
          getComponentNames() {
            return []
          },
          getComponentProps() {
            return []
          },
          getComponentSlots() {
            return []
          },
          getElementAttrs() {
            return []
          },
          getElementNames() {
            return []
          },
          isRefAtPosition() {
            return false
          },
          async getQuickInfoAtPosition() {
            return undefined
          },
          collectExtractProps() {
            throw new Error('Not implemented')
          },
          getImportPathForFile() {
            throw new Error('Not implemented')
          },
          getDocumentHighlights() {
            throw new Error('Not implemented')
          },
          getEncodedSemanticClassifications() {
            throw new Error('Not implemented')
          },
          getReactiveReferences() {
            throw new Error('Not implemented')
          },
        })

        // Filter out plugins that don't work well in web environment
        const ignorePlugins = new Set([
          'vue-extract-file',
          'vue-document-drop',
          'vue-document-highlights',
          'typescript-semantic-tokens',
          'vue-component-semantic-tokens',
        ])

        return plugins.filter(
          (plugin) => !ignorePlugins.has(plugin.name!),
        )
      }
    },
  )
}

async function importTsFromCdn(tsVersion: string) {
  const _module = globalThis.module
  ;(globalThis as any).module = { exports: {} }
  const tsUrl = `https://cdn.jsdelivr.net/npm/typescript@${tsVersion}/lib/typescript.js`
  await import(/* @vite-ignore */ tsUrl)
  const ts = globalThis.module.exports
  globalThis.module = _module
  return ts as typeof import('typescript')
}
