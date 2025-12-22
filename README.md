# Vue 2.7 REPL

A browser-based Vue 2.7 component editor with live preview. Supports Options API, Composition API, `<script setup>`, TypeScript, and JSX.

## Features

- **Vue 2.7 Support**: Full support for Vue 2.7 features including Composition API and `<script setup>`
- **Multiple API Styles**: Options API, Composition API, and `<script setup>`
- **TypeScript**: Full TypeScript support in `<script lang="ts">`
- **JSX/TSX**: Vue 2 JSX support with fixed Babel plugin
- **Style Preprocessors**: SCSS/LESS support (loaded via CDN)
- **Scoped CSS**: Full scoped styles support
- **Multiple Files**: Multi-file project support with import resolution
- **Import Maps**: Customize external dependencies via import maps
- **URL Sharing**: Serialize/deserialize state for URL sharing
- **Theme Support**: Light and dark themes
- **Editor Options**: CodeMirror (default) or Monaco editor
- **Remote Components**: Save components to server and load them remotely
- **File Change Tracking**: Track unsaved changes with visual indicators

## Installation

```bash
npm install repl-vue2
# or
pnpm add repl-vue2
```

## Quick Start

```vue
<template>
  <Repl :editor="CodeMirrorEditor" :store="store" />
</template>

<script>
import { Repl, useStore } from 'repl-vue2'
import CodeMirrorEditor from 'repl-vue2/codemirror-editor'
import 'repl-vue2/style.css'

export default {
  components: { Repl },
  setup() {
    const store = useStore()
    return { store, CodeMirrorEditor }
  },
}
</script>
```

## Required CDN Scripts

The REPL requires Babel to be loaded for TypeScript and JSX compilation:

```html
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js"></script>

<!-- Optional: LESS support -->
<script src="https://cdn.jsdelivr.net/npm/less@4/dist/less.min.js"></script>

<!-- Optional: SCSS support (large file ~3MB) -->
<script src="https://cdn.jsdelivr.net/npm/sass.js@0.11/dist/sass.sync.js"></script>
```

## Props

| Prop                | Type                         | Default        | Description                             |
| ------------------- | ---------------------------- | -------------- | --------------------------------------- |
| `editor`            | Component                    | **required**   | Editor component (CodeMirror or Monaco) |
| `store`             | ReplStore                    | `useStore()`   | Store instance                          |
| `theme`             | `'light' \| 'dark'`          | `'light'`      | Color theme                             |
| `layout`            | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction                        |
| `layoutReverse`     | boolean                      | `false`        | Swap editor and preview position        |
| `showCompileOutput` | boolean                      | `true`         | Show JS/CSS tabs in output              |
| `showImportMap`     | boolean                      | `true`         | Show import-map.json file               |
| `previewOptions`    | object                       | `{}`           | Preview customization options           |

## Store API

```ts
import { useStore } from 'repl-vue2'
import { ref } from 'vue'

// Basic usage
const store = useStore()

// With file change tracking (shows modification indicators)
const store = useStore({
  trackFileChanges: ref(true),
})

// Files
store.addFile('src/MyComponent.vue')
store.deleteFile('src/MyComponent.vue')
store.setActive('src/App.vue')

// Get/Set files
const files = store.getFiles()
await store.setFiles({ 'App.vue': '<template>...</template>' })

// Import Map
store.setImportMap({
  imports: {
    lodash: 'https://cdn.jsdelivr.net/npm/lodash-es/+esm',
  },
})

// URL serialization
const hash = store.serialize()
store.deserialize(hash)

// File change tracking (when trackFileChanges is enabled)
store.markAsSaved('src/App.vue')    // Mark single file as saved
store.markAllAsSaved()              // Mark all files as saved
store.isModified('src/App.vue')     // Check if file has unsaved changes
store.getModifiedFiles()            // Get all modified files
store.clearSavedState()             // Clear all saved state
```

## Remote Components

The REPL supports saving compiled components to a server and loading them remotely in browser applications.

### UMD Transformer

Convert compiled Vue components to UMD format for browser usage:

```ts
import { toUMD, extractComponentName } from 'repl-vue2/umd-transformer'

// Convert compiled code to UMD
const result = toUMD({
  componentName: 'MyComponent',
  js: compiledJs,
  css: compiledCss,
})

// result.code contains UMD formatted code
// Load in browser via <script> or AMD loader
```

### Component Server

A simple server is included for development:

```bash
cd server
pnpm install
pnpm dev
```

Server API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/save` | POST | Save component (source + compiled) |
| `/api/components` | GET | List available components |
| `/api/source/:name` | GET | Get component source code |
| `/api/sources` | GET | Get multiple component sources |
| `/components/:domain/:name/:file` | GET | Serve compiled UMD files |

### Loading Remote Components

```js
// AMD loader simulation
window.define = function(deps, factory) {
  window.__amdResult__ = factory()
}
window.define.amd = true

// Load component
const script = document.createElement('script')
script.src = 'http://localhost:3456/components/default/MyComponent/MyComponent.umd.min.js'
script.onload = () => {
  const component = window.__amdResult__
  // Use with Vue
  new Vue({
    el: '#app',
    render: h => h(component)
  })
}
document.head.appendChild(script)
```

## Headless Mode (Core Only)

For embedding in custom UIs or low-code platforms:

```ts
import {
  useStore,
  compileFile,
  compileModulesForPreview,
  PreviewProxy,
} from 'repl-vue2/core'

// Create store
const store = useStore()

// Compile a single file
const { js, css, errors } = await compileFile(filename, code)

// Compile all files for preview
const { modules, mainModule, css } = compileModulesForPreview(store)
```

## Compilation Output Format

The REPL compiles `.vue` files to **CommonJS** format:

```js
// Compiled output example
const { ref } = require('vue')
module.exports = {
  setup() { ... }
}
```

- **REPL iframe preview**: Uses a module system simulator to handle `require()`
- **Browser direct usage**: Requires UMD transformation (see UMD Transformer above)

## Supported Features

| Feature | Support |
|---------|---------|
| `<template>` | ✅ |
| `<script setup>` | ✅ |
| Options API | ✅ |
| Composition API | ✅ |
| TypeScript | ✅ |
| SCSS/LESS | ✅ |
| Scoped CSS | ✅ |
| Multi-file | ✅ |
| `.jsx` files | ✅ |
| `.tsx` files | ✅ |
| `<script lang="jsx">` | ✅ |
| Remote Components | ✅ |
| File Change Tracking | ✅ |

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (playground)
pnpm dev

# Start remote dev server
pnpm dev:remote

# Start component server
cd server && pnpm dev

# Build library
pnpm build

# Build preview site
pnpm build-preview

# Lint
pnpm lint

# Format
pnpm format
```

## Project Structure

```
repl-vue2/
├── src/                    # Core REPL source
│   ├── components/         # Vue components (Repl, Editor, Output, etc.)
│   ├── editor/            # Editor implementations (CodeMirror, Monaco)
│   ├── output/            # Preview and module compilation
│   ├── compiler.ts        # SFC compiler
│   └── store.ts           # State management
├── packages/
│   └── umd-transformer/   # UMD format converter
├── server/                # Component server
├── test/                  # Playground demo
└── test-remote/           # Remote component demo
```

## License

MIT
