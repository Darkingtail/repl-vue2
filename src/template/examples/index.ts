/**
 * REPL Examples / Presets
 *
 * Each example is a collection of files that can be loaded into the REPL.
 */

// Import raw file contents
import welcomeApp from '../welcome.vue?raw'
import vue2FeaturesApp from './vue2-features/App.vue?raw'
import vue2FeaturesChild from './vue2-features/Child.tsx?raw'
import vue2FeaturesGrandChild from './vue2-features/GrandChild.vue?raw'

export interface Example {
  name: string
  description: string
  files: Record<string, string>
  mainFile: string
}

export const examples: Record<string, Example> = {
  welcome: {
    name: 'Welcome',
    description: 'Simple counter demo with TypeScript + SCSS',
    files: {
      'App.vue': welcomeApp,
    },
    mainFile: 'src/App.vue',
  },

  'vue2-features': {
    name: 'Vue 2 Features',
    description: 'Comprehensive Vue 2 features test (filters, .sync, slots, TSX, provide/inject, etc.)',
    files: {
      'App.vue': vue2FeaturesApp,
      'Child.tsx': vue2FeaturesChild,
      'GrandChild.vue': vue2FeaturesGrandChild,
    },
    mainFile: 'src/App.vue',
  },
}

export type ExampleKey = keyof typeof examples

export const exampleKeys = Object.keys(examples) as ExampleKey[]

export function getExample(key: ExampleKey): Example | undefined {
  return examples[key]
}
