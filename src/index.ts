/**
 * Vue 2.7 REPL
 *
 * A browser-based Vue 2.7 component editor with live preview.
 * Supports Options API, Composition API, <script setup>, TypeScript, and JSX.
 */

// Main component
export { default as Repl } from './components/Repl.vue'

// UI Components
export { default as SplitPane } from './components/SplitPane.vue'
export { default as Message } from './components/Message.vue'
export { default as EditorContainer } from './components/editor/EditorContainer.vue'
export { default as FileSelector } from './components/editor/FileSelector.vue'
export { default as Output } from './components/output/Output.vue'
export { default as Preview } from './components/output/Preview.vue'

// Re-export core
export * from './core'
