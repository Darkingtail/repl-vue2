/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.html?raw' {
  const content: string
  export default content
}

declare module 'codemirror' {
  export * from '@types/codemirror'
}

// Babel standalone
declare module '@babel/standalone' {
  export function transform(
    code: string,
    options: {
      presets?: any[]
      plugins?: any[]
      filename?: string
    }
  ): { code: string | null }

  export function registerPreset(name: string, preset: any): void
  export function registerPlugin(name: string, plugin: any): void

  export const availablePresets: Record<string, any>
  export const availablePlugins: Record<string, any>
}

// Global Babel (loaded via CDN)
declare global {
  interface Window {
    Babel?: typeof import('@babel/standalone')
    less?: {
      render(source: string): Promise<{ css: string }>
    }
    Sass?: {
      compile(source: string, callback: (result: {
        status: number
        text?: string
        message?: string
        formatted?: string
      }) => void): void
    }
  }
}

export {}
