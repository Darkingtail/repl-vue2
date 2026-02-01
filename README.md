# Vue 2.7 REPL

[中文文档](./README.zh-CN.md)

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

The REPL iframe preview uses a module system simulator to handle `require()`.

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
| File Change Tracking | ✅ |

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (playground)
pnpm dev

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
│   ├── compiler/          # SFC compiler
│   └── store.ts           # State management
└── test/                  # Playground demo
```

## Contributors

<a href="https://github.com/Darkingtail">
  <img src="https://github.com/Darkingtail.png" width="50" height="50" alt="Darkingtail" style="border-radius: 50%;" />
</a>
<a href="https://github.com/shiqkuangsan">
  <img src="https://github.com/shiqkuangsan.png" width="50" height="50" alt="shiqkuangsan" style="border-radius: 50%;" />
</a>

## License

MIT
