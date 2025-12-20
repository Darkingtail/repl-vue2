/**
 * Vue 2 JSX Babel plugins for browser use
 *
 * Note: These plugins need to be loaded via CDN or bundled separately.
 * This file provides the preset configuration.
 */

import type { PluginItem } from '@babel/core'

// We'll dynamically import these from CDN or use bundled versions
let babelSugarFunctionalVue: PluginItem | null = null
let babelSugarVModel: PluginItem | null = null
let babelSugarVOn: PluginItem | null = null
let babelPluginTransformVueJsx: PluginItem | null = null

/**
 * Load Vue 2 JSX plugins
 * These are loaded lazily to reduce initial bundle size
 */
export async function loadVue2JsxPlugins(): Promise<void> {
  if (babelPluginTransformVueJsx) return // Already loaded

  try {
    // Try to load from globals (CDN loaded)
    const win = window as any
    if (win.Vue2JsxPlugins) {
      babelSugarFunctionalVue = win.Vue2JsxPlugins.functional
      babelSugarVModel = win.Vue2JsxPlugins.vModel
      babelSugarVOn = win.Vue2JsxPlugins.vOn
      babelPluginTransformVueJsx = win.Vue2JsxPlugins.transform
      return
    }

    // Fallback: use inline simple JSX transform
    // This is a simplified version that handles basic JSX
    babelPluginTransformVueJsx = createSimpleVueJsxPlugin()
    babelSugarFunctionalVue = null
    babelSugarVModel = null
    babelSugarVOn = null
  } catch (e) {
    console.warn('[Vue2 REPL] Failed to load Vue 2 JSX plugins:', e)
  }
}

/**
 * Create a simple Vue 2 JSX transform plugin
 * This is a fallback when full plugins aren't available
 */
function createSimpleVueJsxPlugin(): PluginItem {
  return {
    name: 'vue2-jsx-simple',
    visitor: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      JSXElement(_path: any) {
        // Basic JSX to h() transform placeholder
        // Full implementation would use @vue/babel-plugin-transform-vue-jsx
        // The actual transform will be handled by babel preset
      }
    }
  }
}

/**
 * Get Vue 2 JSX preset plugins
 */
export function getVue2JsxPlugins(options: {
  functional?: boolean
  vModel?: boolean
  vOn?: boolean
} = {}): PluginItem[] {
  const { functional = true, vModel = true, vOn = true } = options

  const plugins: PluginItem[] = []

  if (functional && babelSugarFunctionalVue) {
    plugins.push(babelSugarFunctionalVue)
  }
  if (vModel && babelSugarVModel) {
    plugins.push(babelSugarVModel)
  }
  if (vOn && babelSugarVOn) {
    plugins.push(babelSugarVOn)
  }
  if (babelPluginTransformVueJsx) {
    plugins.push(babelPluginTransformVueJsx)
  }

  return plugins
}

/**
 * Check if JSX plugins are loaded
 */
export function isJsxPluginsLoaded(): boolean {
  return babelPluginTransformVueJsx !== null
}
