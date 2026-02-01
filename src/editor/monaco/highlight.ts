import * as monaco from 'monaco-editor-core'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine-javascript.mjs'
import { shikiToMonaco } from '@shikijs/monaco'

import langVue from 'shiki/langs/vue.mjs'
import langVueHtml from 'shiki/langs/vue-html.mjs'
import langTsx from 'shiki/langs/tsx.mjs'
import langJsx from 'shiki/langs/jsx.mjs'
import langCss from 'shiki/langs/css.mjs'
import langScss from 'shiki/langs/scss.mjs'
import langHtml from 'shiki/langs/html.mjs'
import langJs from 'shiki/langs/javascript.mjs'
import langTs from 'shiki/langs/typescript.mjs'
import langJson from 'shiki/langs/json.mjs'
import themeDark from 'shiki/themes/dark-plus.mjs'
import themeLight from 'shiki/themes/light-plus.mjs'

let registered = false
let currentTheme: { light: string; dark: string } | null = null

export function registerHighlighter() {
  if (!registered) {
    const highlighter = createHighlighterCoreSync({
      themes: [themeDark, themeLight],
      langs: [
        langVue,
        langVueHtml,
        langTsx,
        langJsx,
        langCss,
        langScss,
        langHtml,
        langJs,
        langTs,
        langJson,
      ],
      engine: createJavaScriptRegexEngine(),
    })
    monaco.languages.register({ id: 'vue' })
    shikiToMonaco(highlighter, monaco)
    registered = true
    currentTheme = {
      light: themeLight.name!,
      dark: themeDark.name!,
    }
  }

  return currentTheme!
}

export function setEditorTheme(editor: monaco.editor.IStandaloneCodeEditor, isDark: boolean) {
  const theme = registerHighlighter()
  editor.updateOptions({
    theme: isDark ? theme.dark : theme.light,
  })
}
