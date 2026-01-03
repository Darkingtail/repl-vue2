# Vue 2.7 REPL 实现原理

本文档详细介绍 Vue 2.7 REPL 的核心架构和实现原理。

## 目录

- [项目结构](#项目结构)
- [文件说明](#文件说明)
- [整体架构](#整体架构)
- [核心模块](#核心模块)
- [编译流程](#编译流程)
- [模块系统](#模块系统)
- [预览渲染](#预览渲染)
- [数据流](#数据流)

---

## 项目结构

```
repl-vue2/
├── src/                          # 核心源码
│   ├── index.ts                  # 主入口，导出 Repl 组件和 useStore
│   ├── core.ts                   # 核心 API 入口（无 UI 依赖）
│   ├── store.ts                  # 状态管理（文件、编译结果、错误）
│   ├── types.ts                  # TypeScript 类型定义
│   ├── utils.ts                  # 工具函数（路径处理、序列化等）
│   ├── env.d.ts                  # 全局类型声明（window.Babel 等）
│   │
│   ├── compiler/                 # 编译器模块
│   │   ├── index.ts              # 编译器入口，导出 compileFile
│   │   ├── transform.ts          # SFC/TS/JSX 编译核心逻辑
│   │   ├── shared.ts             # 编译器共享工具函数
│   │   └── vue-jsx.ts            # Vue 2 JSX 插件封装
│   │
│   ├── output/                   # 输出/预览模块
│   │   ├── index.ts              # 输出模块入口
│   │   ├── moduleCompiler.ts     # 将编译结果转换为模块格式
│   │   ├── PreviewProxy.ts       # iframe 通信代理
│   │   └── srcdoc.html           # 预览 iframe 的 HTML 模板
│   │
│   ├── components/               # Vue 组件
│   │   ├── Repl.vue              # 主组件，组合编辑器和输出
│   │   ├── SplitPane.vue         # 可拖拽分割面板
│   │   ├── Message.vue           # 错误/警告消息组件
│   │   ├── editor/               # 编辑器相关组件
│   │   │   ├── EditorContainer.vue   # 编辑器容器
│   │   │   └── FileSelector.vue      # 文件选择器/标签页
│   │   └── output/               # 输出相关组件
│   │       ├── Output.vue        # 输出面板（预览/JS/CSS 切换）
│   │       └── Preview.vue       # 预览 iframe 容器
│   │
│   ├── editor/                   # 编辑器实现
│   │   ├── codemirror/           # CodeMirror 5 编辑器
│   │   │   ├── index.ts          # 入口
│   │   │   └── CodeMirrorEditor.vue
│   │   └── monaco/               # Monaco 编辑器
│   │       ├── index.ts          # 入口
│   │       └── MonacoEditor.vue
│   │
│   └── template/                 # 默认模板
│       ├── welcome.vue           # 初始 App.vue 模板
│       └── new-sfc.vue           # 新建 .vue 文件模板
│
├── packages/                     # 内部包
│   └── vue2-jsx-browser/         # 浏览器兼容的 Vue 2 JSX 插件
│       ├── src/
│       │   ├── index.ts          # 入口，导出 createVue2JsxPreset
│       │   └── index.d.ts        # 类型定义
│       ├── tsup.config.ts        # 打包配置
│       └── package.json
│
├── test/                         # 开发测试页面
│   └── index.html                # 本地开发入口
│
├── docs/                         # 文档
│   └── ARCHITECTURE.md           # 本文档
│
└── dist/                         # 构建输出
    ├── repl-vue2.js              # ESM 主包
    ├── repl-vue2.cjs             # CommonJS 主包
    ├── core.js                   # 核心 API（无 UI）
    ├── codemirror-editor.js      # CodeMirror 编辑器
    ├── monaco-editor.js          # Monaco 编辑器
    └── repl-vue2.css             # 样式
```

---

## 文件说明

### 核心文件

| 文件 | 作用 |
|------|------|
| `src/index.ts` | 主入口，导出 `Repl` 组件、`useStore`、类型定义 |
| `src/core.ts` | 无 UI 依赖的核心 API，用于 headless 模式 |
| `src/store.ts` | 响应式状态管理，处理文件增删改、编译触发、URL 序列化 |
| `src/types.ts` | TypeScript 类型定义（OutputModes 等） |
| `src/utils.ts` | 工具函数：路径处理、Base64 编解码、文件名解析 |

### 编译器文件

| 文件 | 作用 |
|------|------|
| `compiler/index.ts` | 编译器入口，重新导出 `compileFile` |
| `compiler/transform.ts` | **核心编译逻辑**：解析 SFC、编译 Script/Template/Style、转换 TS/JSX |
| `compiler/shared.ts` | 共享工具：生成 scoped ID、CSS 注入代码、样式编译 |
| `compiler/vue-jsx.ts` | 封装 `vue2-jsx-browser` 的 Babel 插件 |

### 输出文件

| 文件 | 作用 |
|------|------|
| `output/index.ts` | 输出模块入口 |
| `output/moduleCompiler.ts` | 将编译后的文件转换为 iframe 可执行的模块格式 |
| `output/PreviewProxy.ts` | 主页面与 iframe 的 postMessage 通信封装 |
| `output/srcdoc.html` | 预览 iframe 的完整 HTML，包含模块系统和 Vue 运行时 |

### 组件文件

| 文件 | 作用 |
|------|------|
| `components/Repl.vue` | 主组件，组合编辑器和输出，接收 props 配置 |
| `components/SplitPane.vue` | 可拖拽的分割面板，支持水平/垂直布局 |
| `components/Message.vue` | 显示编译错误和警告 |
| `components/editor/EditorContainer.vue` | 编辑器容器，管理文件选择和编辑器切换 |
| `components/editor/FileSelector.vue` | 文件标签页，支持新建、删除、重命名 |
| `components/output/Output.vue` | 输出面板，切换预览/JS/CSS 视图 |
| `components/output/Preview.vue` | 预览 iframe 容器，管理 PreviewProxy |

### 编辑器文件

| 文件 | 作用 |
|------|------|
| `editor/codemirror/CodeMirrorEditor.vue` | CodeMirror 5 编辑器封装，轻量级 |
| `editor/monaco/MonacoEditor.vue` | Monaco 编辑器封装，功能丰富 |

### vue2-jsx-browser 包

| 文件 | 作用 |
|------|------|
| `packages/vue2-jsx-browser/src/index.ts` | 将 Vue 2 官方 JSX 插件打包为浏览器兼容版本 |

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Vue 2.7 REPL                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │    Editor    │    │    Store     │    │       Output         │   │
│  │  (CodeMirror │◄──►│  (Reactive   │◄──►│  ┌────────────────┐  │   │
│  │   / Monaco)  │    │    State)    │    │  │ Preview iframe │  │   │
│  └──────────────┘    └──────┬───────┘    │  │  (Sandbox)     │  │   │
│                             │            │  └────────────────┘  │   │
│                             ▼            │                      │   │
│                      ┌──────────────┐    │  ┌────────────────┐  │   │
│                      │   Compiler   │    │  │ JS/CSS Output  │  │   │
│                      │  (Browser)   │    │  └────────────────┘  │   │
│                      └──────────────┘    └──────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心特点

1. **纯浏览器端编译** - 无需服务器，所有编译在浏览器中完成
2. **沙箱隔离** - 预览在独立的 iframe 中运行，隔离错误
3. **响应式状态** - 使用 Vue 2 的响应式系统管理文件和编译状态
4. **模块化设计** - 编辑器、编译器、预览器可独立使用

---

## 核心模块

### 1. Store (`src/store.ts`)

Store 是整个 REPL 的状态管理中心，使用 Vue 2 的 `reactive` API。

```ts
interface ReplStore {
  // 状态
  files: Record<string, File> // 所有文件
  activeFilename: string // 当前编辑的文件
  mainFile: string // 入口文件 (App.vue)
  errors: (string | Error)[] // 编译错误

  // 方法
  addFile(filename: string): void
  deleteFile(filename: string): void
  compileFile(file: File): Promise<Error[]>
  serialize(): string // 序列化为 URL hash
  deserialize(hash: string): void // 从 URL 恢复
}
```

**关键实现：**

```ts
// 监听文件变化，自动触发编译
watch(
  [activeFilename, () => files.value[activeFilename.value]?.code],
  ([filename, code]) => {
    const file = files.value[filename]
    if (file && code !== undefined) {
      doCompileFile(file).then((errs) => {
        errors.value = errs
      })
    }
  },
  { immediate: true },
)
```

### 2. Compiler (`src/compiler/transform.ts`)

浏览器端的 Vue SFC 编译器，核心依赖：

- `@vue/compiler-sfc` - Vue 官方 SFC 解析器
- `@babel/standalone` - 浏览器版 Babel (TypeScript/JSX)

```ts
async function compileFile(
  filename: string,
  code: string,
): Promise<{
  js: string
  css: string
  errors: (string | Error)[]
}>
```

### 3. Module Compiler (`src/output/moduleCompiler.ts`)

将编译后的代码转换为预览 iframe 可执行的模块格式。

```ts
function compileModulesForPreview(store: ReplStore): {
  modules: Record<string, string> // 模块名 -> CommonJS 代码
  mainModule: string // 入口模块名
  css: string // 合并的 CSS
}
```

### 4. Preview Proxy (`src/output/PreviewProxy.ts`)

主页面与 iframe 之间的通信桥梁。

```ts
class PreviewProxy {
  eval(data: { modules; mainModule; css }): void // 发送代码到 iframe
  onError(callback): void // 接收运行时错误
  onConsole(callback): void // 接收 console 输出
}
```

### 5. Preview iframe (`src/output/srcdoc.html`)

沙箱化的预览环境，包含：

- Vue 2 UMD 版本
- CommonJS 模块系统模拟
- 错误捕获和 console 代理

---

## 编译流程

### SFC 编译流程

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  App.vue    │────►│    parse()   │────►│ compileScript│────►│ transformTS  │
│  (source)   │     │  @vue/sfc    │     │  + template  │     │   (Babel)    │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                     │
                    ┌──────────────┐     ┌─────────────┐             │
                    │   CommonJS   │◄────│ toCommonJS  │◄────────────┘
                    │   Output     │     │   (Babel)   │
                    └──────────────┘     └─────────────┘
```

### 详细步骤

#### 1. 解析 SFC

```ts
import { parse } from '@vue/compiler-sfc'

const { descriptor, errors } = parse(code, { filename })
// descriptor.script      - <script> 块
// descriptor.scriptSetup - <script setup> 块
// descriptor.template    - <template> 块
// descriptor.styles      - <style> 块数组
```

#### 2. 编译 Script

```ts
import { compileScript, rewriteDefault } from '@vue/compiler-sfc'

// compileScript 处理 <script setup> 语法
const compiled = compileScript(descriptor, {
  id,
  inlineTemplate: false, // Vue 2 不支持内联模板
})

// 将 export default 重写为变量声明
let content = rewriteDefault(compiled.content, '__sfc__')
```

#### 3. TypeScript/JSX 转换

使用 `@babel/standalone` 在浏览器中编译：

```ts
function transformTS(src: string, filename: string, options: { lang: string }) {
  const babel = window.Babel

  const presets = []
  const plugins = []

  // TypeScript
  if (lang === 'ts' || lang === 'tsx') {
    presets.push(['typescript', { isTSX: lang === 'tsx' }])
  }

  // Vue 2 JSX
  if (lang === 'jsx' || lang === 'tsx') {
    const jsxPreset = createVue2JsxPreset(null, {})
    plugins.push(...jsxPreset.plugins)
  }

  return babel.transform(src, { presets, plugins }).code
}
```

#### 4. 转换为 CommonJS

```ts
function toCommonJS(esCode: string): string {
  return babel.transform(esCode, {
    presets: [['env', { modules: 'cjs' }]],
  }).code
}
```

**输出示例：**

```js
// 输入 (ES Module)
import { ref } from 'vue'
export default {
  setup() {
    return { count: ref(0) }
  },
}

// 输出 (CommonJS)
;('use strict')
var _vue = require('vue')
module.exports = {
  setup() {
    return { count: (0, _vue.ref)(0) }
  },
}
```

#### 5. 编译样式

```ts
// Scoped CSS 处理
import { compileStyle } from '@vue/compiler-sfc'

const { code, errors } = compileStyle({
  source: styleContent,
  id, // 用于生成 scoped 属性选择器
  scoped: true,
})
```

---

## 模块系统

### 为什么用 CommonJS？

1. **浏览器兼容性** - ESM 需要 HTTP 服务器，而 CommonJS 可以通过 `new Function()` 直接执行
2. **同步加载** - REPL 场景下所有模块已知，无需异步
3. **简单实现** - 模块系统只需 30 行代码

### iframe 中的模块系统实现

```js
// srcdoc.html 中的模块系统

const modules = {} // 模块工厂函数
const moduleCache = {} // 已实例化的模块缓存

// 注册模块
function define(name, factory) {
  modules[name] = factory
}

// 加载模块
function require(name) {
  // Vue 特殊处理
  if (name === 'vue') {
    return {
      default: window.Vue,
      ref: Vue.ref,
      reactive: Vue.reactive,
      // ... 导出所有 Vue 2.7 Composition API
    }
  }

  // 缓存检查
  if (moduleCache[name]) {
    return moduleCache[name].exports
  }

  // 创建模块
  const module = { exports: {} }
  moduleCache[name] = module
  modules[name](require, module, module.exports)
  return module.exports
}
```

### 模块注册流程

```js
// 主页面发送模块到 iframe
previewProxy.eval({
  modules: {
    'App.vue': '"use strict"; var _vue = require("vue"); ...',
    'Child.vue': '"use strict"; ...',
  },
  mainModule: 'App.vue',
  css: '.scoped[data-v-xxx] { color: red; }',
})

// iframe 接收并执行
window.addEventListener('message', (e) => {
  if (e.data.type === 'eval') {
    // 1. 注册所有模块
    for (const [name, code] of Object.entries(e.data.modules)) {
      const fn = new Function('require', 'module', 'exports', code)
      define(name, fn)
    }

    // 2. 加载入口模块
    const Component = require(e.data.mainModule)

    // 3. 挂载 Vue 实例
    new Vue({ render: (h) => h(Component.default) }).$mount('#app')
  }
})
```

---

## 预览渲染

### 沙箱隔离

iframe 使用 `srcdoc` 属性注入 HTML，与主页面完全隔离：

```html
<iframe :srcdoc="srcdocContent" sandbox="allow-scripts"></iframe>
```

**隔离的好处：**

1. 用户代码错误不会影响 REPL 本身
2. CSS 样式不会泄漏
3. 全局变量隔离

### 通信机制

```
┌─────────────────┐                      ┌─────────────────┐
│    Main Page    │                      │  Preview iframe │
│                 │                      │                 │
│  PreviewProxy   │─── postMessage ───►  │  window.onmsg   │
│                 │    { type: 'eval',   │                 │
│                 │      modules, css }  │                 │
│                 │                      │                 │
│  onError()      │◄── postMessage ────  │  window.onerror │
│  onConsole()    │    { type: 'error' } │  console.log    │
└─────────────────┘                      └─────────────────┘
```

### 错误处理

```js
// iframe 中捕获错误
window.onerror = function (msg, source, line, col, error) {
  parent.postMessage(
    {
      type: 'error',
      value: { message: msg, line, stack: error?.stack },
    },
    '*',
  )
}[
  // console 代理
  ('log', 'warn', 'error')
].forEach((method) => {
  console[method] = (...args) => {
    parent.postMessage(
      {
        type: 'console',
        level: method,
        args: args.map(String),
      },
      '*',
    )
  }
})
```

---

## 数据流

### 完整的数据流图

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. 用户编辑代码                                                          │
│    Editor (CodeMirror/Monaco) ───► store.files[filename].code          │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Store 监听变化，触发编译                                               │
│    watch([activeFilename, code]) ───► compileFile()                     │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. 编译 SFC                                                              │
│    parse() ─► compileScript() ─► transformTS() ─► toCommonJS()          │
│    compileStyle() ─► scoped CSS                                          │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. 更新编译结果                                                          │
│    file.compiled.js = compiledCode                                       │
│    file.compiled.css = compiledCss                                       │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. 预览组件监听编译结果变化                                               │
│    watch(store.files) ───► compileModulesForPreview()                   │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. 发送到 iframe                                                         │
│    previewProxy.eval({ modules, mainModule, css })                       │
└───────────────────────────────────────────────┬─────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. iframe 执行                                                           │
│    define() ─► require() ─► new Vue().$mount('#app')                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 关键技术点

### 1. 使用 @babel/standalone 替代 Node.js 版 Babel

```html
<!-- 在 HTML 中加载 -->
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js"></script>
```

```ts
// 在代码中使用
const babel = window.Babel
babel.transform(code, { presets: ['typescript'] })
```

### 2. Vue 2 JSX 浏览器兼容

官方 `@vue/babel-preset-jsx` 依赖 Node.js，无法在浏览器使用。

**解决方案：** 创建 `vue2-jsx-browser` 包，打包所有插件为浏览器兼容版本。

### 3. Vue 2.7 Composition API 导出

Vue 2.7 的 UMD 版本将 Composition API 挂载在 `Vue` 对象上：

```js
// 在 require('vue') 时构造正确的导出
return {
  default: Vue,
  ref: Vue.ref,
  reactive: Vue.reactive,
  computed: Vue.computed,
  // ...
}
```

### 4. URL 状态持久化

```ts
// 序列化
const hash = '#' + btoa(JSON.stringify(files))
history.replaceState(null, '', hash)

// 反序列化
const files = JSON.parse(atob(location.hash.slice(1)))
```

---

## 与 Vue 3 REPL 的区别

| 特性     | Vue 3 REPL | Vue 2.7 REPL       |
| -------- | ---------- | ------------------ |
| Vue 版本 | Vue 3      | Vue 2.7            |
| 模板编译 | 内联编译   | 运行时编译         |
| 模块格式 | ES Modules | CommonJS           |
| JSX 支持 | Vue 3 JSX  | Vue 2 JSX (自定义) |
| 预览隔离 | iframe     | iframe             |

---

## 扩展阅读

- [@vue/compiler-sfc](https://github.com/vuejs/core/tree/main/packages/compiler-sfc)
- [@babel/standalone](https://babeljs.io/docs/babel-standalone)
- [Vue 2.7 Composition API](https://blog.vuejs.org/posts/vue-2-7-naruto.html)
