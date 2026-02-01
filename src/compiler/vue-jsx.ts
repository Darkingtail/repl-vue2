/**
 * Browser-compatible Vue 2 JSX Babel plugins bundle
 *
 * Re-exports from vue2-sfc-runner package for browser use with @babel/standalone.
 *
 * Note: h injection is handled in transform.ts by adding `var h = require('vue').h;`
 * at the top of compiled JSX/TSX files.
 */
export { createVue2JsxPreset } from 'vue2-sfc-runner'

export type { Vue2JsxPresetOptions, Vue2JsxPreset } from 'vue2-sfc-runner'
