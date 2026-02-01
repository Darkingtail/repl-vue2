import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist'] },
  eslint.configs.recommended,
  tseslint.configs.base,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  },
  {
    rules: {
      'no-debugger': 'error',
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'clear', 'log'] }],
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'prefer-const': 'error',
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'no-duplicate-imports': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': [
        'error',
        {
          html: { component: 'always', normal: 'always', void: 'any' },
          math: 'always',
          svg: 'always',
        },
      ],
    },
  },
)
