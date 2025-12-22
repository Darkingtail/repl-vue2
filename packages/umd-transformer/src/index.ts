/**
 * UMD Transformer
 *
 * 将 Vue 2 编译后的 CommonJS 代码转换为 UMD 格式
 * 兼容 AMD (require.js) / CommonJS / 全局变量
 * 可直接被低代码平台加载使用
 */

export interface TransformOptions {
  /** 组件名称（将注册到 window[componentName]） */
  componentName: string
  /** 编译后的 JS 代码（CommonJS 格式） */
  js: string
  /** 编译后的 CSS 代码 */
  css?: string
  /** 组件标识符，默认 '__sfc__' */
  componentIdentifier?: string
}

export interface TransformResult {
  /** UMD 格式的代码 */
  code: string
  /** 组件名称 */
  name: string
}

/**
 * 将编译后的组件代码转换为 UMD 格式
 */
export function toUMD(options: TransformOptions): TransformResult {
  const {
    componentName,
    js,
    css = '',
    componentIdentifier = '__sfc__',
  } = options

  // 清理 CommonJS 模块代码
  const cleanedCode = cleanCommonJSCode(js)

  const code = generateUMDWrapper({
    componentName,
    componentCode: cleanedCode,
    css,
    componentIdentifier,
  })

  return {
    code,
    name: componentName,
  }
}

/**
 * 清理 CommonJS 模块代码，移除模块系统相关语句
 */
function cleanCommonJSCode(js: string): string {
  return js
    // 移除 "use strict"
    .replace(/"use strict";?\s*/g, '')
    // 移除 Object.defineProperty(exports, "__esModule", ...)
    .replace(
      /Object\.defineProperty\s*\(\s*exports\s*,\s*["']__esModule["']\s*,\s*\{[^}]*\}\s*\)\s*;?/g,
      ''
    )
    // 移除 exports["default"] = ... 或 exports.default = ...
    .replace(/exports\s*(\["default"\]|\.default)\s*=\s*[^;]+;?/g, '')
    // 移除 module.exports = ...
    .replace(/module\.exports\s*=\s*[^;]+;?/g, '')
    // 替换 require("vue") 为全局 Vue
    .replace(/var\s+_vue\s*=\s*require\s*\(\s*["']vue["']\s*\)\s*;?/g, 'var _vue = Vue;')
    .replace(/require\s*\(\s*["']vue["']\s*\)/g, 'Vue')
    // 替换 _vue["default"] 或 _vue.default 为 Vue
    .replace(/_vue\s*\[\s*["']default["']\s*\]/g, 'Vue')
    .replace(/_vue\.default/g, 'Vue')
    // 替换本地组件 require（如 require("./Comp.vue")）为全局变量引用
    // 模式: var _Comp = _interopRequireDefault(require("./Comp.vue"));
    // 转换为: var _Comp = { "default": window.Comp || {} };
    .replace(
      /var\s+(_\w+)\s*=\s*_interopRequireDefault\s*\(\s*require\s*\(\s*["']\.\/(\w+)\.vue["']\s*\)\s*\)\s*;?/g,
      'var $1 = { "default": window.$2 || {} };'
    )
    // 移除 var _default = __sfc__; 或类似语句
    .replace(/var\s+_default\s*=\s*[^;]*;?/g, '')
    // 移除 exports.default = _default 或类似语句
    .replace(/exports\.default\s*=\s*_default\s*;?/g, '')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface UMDWrapperOptions {
  componentName: string
  componentCode: string
  css: string
  componentIdentifier: string
}

/**
 * 生成 UMD 包装代码
 */
function generateUMDWrapper(options: UMDWrapperOptions): string {
  const { componentName, componentCode, css, componentIdentifier } = options

  const styleInjection = css
    ? `
  // Inject styles
  var __css__ = ${JSON.stringify(css)};
  if (typeof document !== 'undefined') {
    var existingStyle = document.querySelector('style[data-v-component="${componentName}"]');
    if (existingStyle) {
      existingStyle.textContent = __css__;
    } else {
      var style = document.createElement('style');
      style.setAttribute('data-v-component', '${componentName}');
      style.textContent = __css__;
      document.head.appendChild(style);
    }
  }
`
    : ''

  return `(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD (require.js)
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root['${componentName}'] = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';
${styleInjection}
  // Component definition
  ${componentCode}

  // Register as global Vue component if Vue is available
  if (typeof Vue !== 'undefined' && Vue.component) {
    Vue.component('${componentName}', ${componentIdentifier});
  }

  return ${componentIdentifier};
});
`
}

/**
 * 从文件名提取组件名称
 * @example extractComponentName('src/HelloWorld.vue') => 'HelloWorld'
 * @example extractComponentName('MyComponent.vue') => 'MyComponent'
 */
export function extractComponentName(filename: string): string {
  return filename
    .replace(/^src\//, '')
    .replace(/\.(vue|jsx|tsx)$/, '')
    .split('/')
    .pop() || 'Component'
}

/**
 * 批量转换多个组件
 */
export function toUMDBatch(
  components: Array<{
    filename: string
    js: string
    css?: string
  }>
): TransformResult[] {
  return components.map(({ filename, js, css }) =>
    toUMD({
      componentName: extractComponentName(filename),
      js,
      css,
    })
  )
}
