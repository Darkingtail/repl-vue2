# repl-vue2 Roadmap

## Monaco Editor + Vue/TS 语言服务集成

### 目标
为 repl-vue2 添加完整的 Monaco 编辑器支持，包括 Vue 2.7 和 TypeScript 语言服务。

### 参考实现
- Vue 3 官方 REPL: https://github.com/vuejs/repl
- 关键目录: `src/monaco/`

### 核心依赖

```json
{
  "dependencies": {
    "monaco-editor-core": "^0.52.2",
    "@volar/monaco": "2.4.23",
    "@volar/jsdelivr": "2.4.23",
    "@volar/typescript": "2.4.23",
    "@vue/language-core": "3.0.8",
    "@vue/language-service": "3.0.8",
    "@vue/typescript-plugin": "3.0.8",
    "volar-service-typescript": "0.0.65",
    "@shikijs/monaco": "^3.9.2",
    "shiki": "^3.9.2",
    "vscode-uri": "^3.1.0"
  }
}
```

### 实现步骤

#### Phase 1: 基础 Monaco 集成 (1-2天)
- [ ] 安装 `monaco-editor-core` 依赖
- [ ] 创建基础 Monaco 编辑器组件
- [ ] 配置 Monaco 语言注册 (vue, js, ts, css)
- [ ] 实现语法高亮 (使用 Shiki)
- [ ] 配置 Vite worker 打包

#### Phase 2: 语言服务 Worker (2-3天)
- [ ] 创建 `src/editor/monaco/vue.worker.ts`
- [ ] 配置 TypeScript 从 CDN 加载
- [ ] 集成 `@volar/jsdelivr` 文件系统
- [ ] 配置 Vue 2.7 编译器选项
- [ ] 创建 `WorkerHost` 处理 CDN 文件获取

#### Phase 3: Volar 集成 (2-3天)
- [ ] 创建 `src/editor/monaco/env.ts` - Monaco 环境配置
- [ ] 实现 `initMonaco()` 初始化函数
- [ ] 实现 `reloadLanguageTools()` 语言工具重载
- [ ] 配置 Volar 的 markers, auto-insertion, providers
- [ ] 测试 Vue 2.7 SFC 解析

#### Phase 4: 功能完善 (1-2天)
- [ ] 实现 Go to Definition
- [ ] 实现 Hover 信息展示
- [ ] 实现自动补全
- [ ] 实现错误诊断显示
- [ ] 支持 `.d.ts` 类型文件

#### Phase 5: 优化与测试 (1天)
- [ ] 性能优化 (懒加载、缓存)
- [ ] 主题切换支持 (light/dark)
- [ ] 编辑器配置项暴露
- [ ] 兼容性测试

### Vue 2.7 特殊配置

```typescript
// vue.worker.ts 中需要配置
const vueCompilerOptions = {
  target: 2.7,  // Vue 2.7 模式
  // 其他 Vue 2 特定选项
}
```

### 关键文件结构

```
src/editor/monaco/
├── Monaco.vue          # 编辑器组件
├── env.ts              # Monaco 环境配置
├── vue.worker.ts       # 语言服务 Worker
├── utils.ts            # 工具函数
├── highlight.ts        # 语法高亮 (Shiki)
├── language-configs.ts # 语言配置
└── index.ts            # 导出
```

### 风险与挑战

1. **Volar Vue 2 支持**: Volar 主要为 Vue 3 设计，Vue 2.7 支持可能不完整
2. **Worker 打包**: Vite 打包 Web Worker 需要特殊配置
3. **CDN 依赖**: 类型定义从 jsdelivr 获取，需要处理网络问题
4. **包体积**: Monaco + Volar 会显著增加包体积 (~2-3MB)

### 备选方案

如果完整方案遇到阻碍：
- **方案 B**: 仅使用 Monaco 基础功能 + Shiki 语法高亮，不含类型检查
- **方案 C**: 使用 CodeMirror 6 + 自定义 Vue 2 语法支持

### 预估工时

| 阶段 | 工时 |
|------|------|
| Phase 1 | 1-2天 |
| Phase 2 | 2-3天 |
| Phase 3 | 2-3天 |
| Phase 4 | 1-2天 |
| Phase 5 | 1天 |
| **总计** | **7-11天** |

---

## 其他待办功能

### D2C (Design to Code)
- [x] MasterGo MCP 集成
- [x] AI 代码生成服务
- [ ] 前端 UI 集成
- [ ] DSL 预览功能

### 编辑器增强
- [ ] 多文件支持改进
- [ ] 文件树组件
- [ ] 搜索替换功能
- [ ] 代码格式化 (Prettier)

### 预览增强
- [ ] 响应式预览
- [ ] 控制台输出
- [ ] 错误边界改进
