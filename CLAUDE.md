# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 2.7 REPL - A browser-based Vue 2.7 component editor with live preview. This is a Vue2 counterpart to the official Vue3 REPL (https://github.com/vuejs/repl).

The project depends on three companion packages (all published on npm):
- `vue2-jsx-browser` - Browser JSX compilation for Vue 2
- `vue2-sfc-compiler` - SFC parsing and compilation
- `vue2-sfc-runner` - Runtime for executing compiled Vue 2 SFCs

## Commands

```bash
pnpm dev          # Start dev server on port 5173
pnpm build        # Build library (outputs to dist/)
pnpm build-preview # Build demo site
pnpm lint         # ESLint check
pnpm format       # Prettier formatting
pnpm typecheck    # TypeScript type checking (vue-tsc --noEmit)
```

## Architecture

### Build Outputs

The library builds to four entry points:
- `repl-vue2.js/.cjs` - Full REPL component with UI
- `core.js` - Headless core (state management + compilation, no UI)
- `codemirror-editor.js` - CodeMirror 5 editor implementation
- `monaco-editor.js` - Monaco editor with Volar language services

### Core Components

**Store (`src/store.ts`)**: Central reactive state managing files, compilation, and serialization. Uses Vue 2.7 Composition API. Key concepts:
- Files stored as `Record<string, File>` with compiled JS/CSS output
- Supports URL serialization via lz-string compression
- Optional file change tracking for save indicators

**Compiler (`src/compiler/`)**: Uses `vue2-sfc-runner` for SFC compilation. Outputs CommonJS format (`module.exports`, `require()`) for the preview iframe's module simulator.

**Preview (`src/output/`)**:
- `PreviewProxy.ts` - IFrame postMessage communication
- `moduleCompiler.ts` - Bundles compiled files into preview modules
- `srcdoc.html` - Preview page template with module system implementation

**Editors (`src/editor/`)**:
- `codemirror/` - Lightweight CodeMirror 5 integration
- `monaco/` - Full Monaco editor with Volar for Vue/TS language services. Key files:
  - `env.ts` - Monaco environment and Volar initialization
  - `vue.worker.ts` - Web Worker for language services
  - Uses `@volar/jsdelivr` for CDN-based type definitions

### Vite Configuration Notes

- Uses `@vitejs/plugin-vue2` for Vue 2.7 support
- Alias workaround for `@vue/compiler-dom` to fix Web Worker compatibility (see comment in vite.config.ts:24-32)
- External deps: `vue`, `codemirror`, `monaco-editor`

## Code Style

- TypeScript with strict mode
- Use `type` imports: `import { type Foo }` or `import type { Foo }`
- Prefer `const` over `let`
- Sort imports (declaration sort is ignored)
- Vue: self-closing HTML tags, no multi-word component name requirement
- No semicolons, single quotes (Prettier config)

## Runtime Dependencies

The REPL preview requires Babel loaded via CDN for TypeScript/JSX:
```html
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js"></script>
```

Optional SCSS/LESS support loaded from CDN as needed.
