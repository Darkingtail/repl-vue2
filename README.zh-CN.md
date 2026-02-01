# Vue 2.7 REPL

[English](./README.md) | [GitHub](https://github.com/Darkingtail/repl-vue2) | [在线演示](https://repl-vue2.vercel.app/)

基于浏览器的 Vue 2.7 组件编辑器，支持实时预览。支持 Options API、Composition API、`<script setup>`、TypeScript 和 JSX。

## 特性

- **Vue 2.7 支持**：完整支持 Vue 2.7 特性，包括 Composition API 和 `<script setup>`
- **多种 API 风格**：Options API、Composition API 和 `<script setup>`
- **TypeScript**：完整支持 `<script lang="ts">`
- **JSX/TSX**：Vue 2 JSX 支持，修复了 Babel 插件问题
- **样式预处理器**：支持 SCSS/LESS（通过 CDN 加载）
- **Scoped CSS**：完整支持 scoped 样式
- **多文件支持**：多文件项目，支持 import 解析
- **Import Maps**：通过 import maps 自定义外部依赖
- **URL 分享**：状态序列化/反序列化，支持 URL 分享
- **主题支持**：亮色和暗色主题
- **编辑器选项**：CodeMirror（默认）或 Monaco 编辑器
- **文件修改追踪**：可视化显示未保存的修改

## 安装

```bash
npm install repl-vue2
# 或
pnpm add repl-vue2
```

## 快速开始

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

## 必需的 CDN 脚本

REPL 需要加载 Babel 以支持 TypeScript 和 JSX 编译：

```html
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js"></script>

<!-- 可选：LESS 支持 -->
<script src="https://cdn.jsdelivr.net/npm/less@4/dist/less.min.js"></script>

<!-- 可选：SCSS 支持（文件较大 ~3MB） -->
<script src="https://cdn.jsdelivr.net/npm/sass.js@0.11/dist/sass.sync.js"></script>
```

## Props

| 属性                | 类型                         | 默认值         | 说明                             |
| ------------------- | ---------------------------- | -------------- | -------------------------------- |
| `editor`            | Component                    | **必需**       | 编辑器组件（CodeMirror 或 Monaco） |
| `store`             | ReplStore                    | `useStore()`   | Store 实例                       |
| `theme`             | `'light' \| 'dark'`          | `'light'`      | 颜色主题                         |
| `layout`            | `'horizontal' \| 'vertical'` | `'horizontal'` | 布局方向                         |
| `layoutReverse`     | boolean                      | `false`        | 交换编辑器和预览位置             |
| `showCompileOutput` | boolean                      | `true`         | 显示 JS/CSS 标签页               |
| `showImportMap`     | boolean                      | `true`         | 显示 import-map.json 文件        |
| `previewOptions`    | object                       | `{}`           | 预览自定义选项                   |

## Store API

```ts
import { useStore } from 'repl-vue2'
import { ref } from 'vue'

// 基本用法
const store = useStore()

// 启用文件修改追踪（显示修改标记）
const store = useStore({
  trackFileChanges: ref(true),
})

// 文件操作
store.addFile('src/MyComponent.vue')
store.deleteFile('src/MyComponent.vue')
store.setActive('src/App.vue')

// 获取/设置文件
const files = store.getFiles()
await store.setFiles({ 'App.vue': '<template>...</template>' })

// Import Map
store.setImportMap({
  imports: {
    lodash: 'https://cdn.jsdelivr.net/npm/lodash-es/+esm',
  },
})

// URL 序列化
const hash = store.serialize()
store.deserialize(hash)

// 文件修改追踪（启用 trackFileChanges 时）
store.markAsSaved('src/App.vue')    // 标记单个文件为已保存
store.markAllAsSaved()              // 标记所有文件为已保存
store.isModified('src/App.vue')     // 检查文件是否有未保存的修改
store.getModifiedFiles()            // 获取所有已修改的文件
store.clearSavedState()             // 清除所有保存状态
```

## 无头模式（仅核心）

用于嵌入自定义 UI 或低代码平台：

```ts
import {
  useStore,
  compileFile,
  compileModulesForPreview,
  PreviewProxy,
} from 'repl-vue2/core'

// 创建 store
const store = useStore()

// 编译单个文件
const { js, css, errors } = await compileFile(filename, code)

// 编译所有文件用于预览
const { modules, mainModule, css } = compileModulesForPreview(store)
```

## 编译输出格式

REPL 将 `.vue` 文件编译为 **CommonJS** 格式：

```js
// 编译输出示例
const { ref } = require('vue')
module.exports = {
  setup() { ... }
}
```

REPL 的 iframe 预览使用模块系统模拟器来处理 `require()`。

## 支持的特性

| 特性 | 支持 |
|------|------|
| `<template>` | ✅ |
| `<script setup>` | ✅ |
| Options API | ✅ |
| Composition API | ✅ |
| TypeScript | ✅ |
| SCSS/LESS | ✅ |
| Scoped CSS | ✅ |
| 多文件 | ✅ |
| `.jsx` 文件 | ✅ |
| `.tsx` 文件 | ✅ |
| `<script lang="jsx">` | ✅ |
| 文件修改追踪 | ✅ |

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器（playground）
pnpm dev

# 构建库
pnpm build

# 构建预览站点
pnpm build-preview

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 项目结构

```
repl-vue2/
├── src/                    # REPL 核心源码
│   ├── components/         # Vue 组件（Repl、Editor、Output 等）
│   ├── editor/            # 编辑器实现（CodeMirror、Monaco）
│   ├── output/            # 预览和模块编译
│   ├── compiler/          # SFC 编译器
│   └── store.ts           # 状态管理
└── test/                  # Playground 演示
```

## 许可证

MIT
