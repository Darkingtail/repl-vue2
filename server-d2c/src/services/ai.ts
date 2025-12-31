import axios from 'axios'
import { AI_API_BASE_URL, AI_API_PATH, AI_API_KEY, AI_MODEL } from '../config'
import { getLibraryPrompt } from '../config/component-libraries'

const VUE2_BASE_PROMPT = `你是一个专业的前端开发者，擅长 Vue 2。请根据提供的设计稿生成 Vue 2 SFC 代码。

要求：
1. 使用 Vue 2 Options API（export default { data, methods, computed 等 }）
2. 不要使用 TypeScript，使用纯 JavaScript
3. 样式使用 SCSS（<style lang="scss" scoped>），精确还原设计稿的颜色、字体、间距
4. 组件结构清晰
5. 如果有交互元素，添加适当的事件处理
6. 响应式设计（如果适用）
7. 代码简洁、可维护

只输出 .vue 文件内容，不要解释。代码用 \`\`\`vue 包裹。`

/**
 * Build system prompt with component library
 */
function buildSystemPrompt(componentLibrary?: string, customLibraryPrompt?: string): string {
  const libraryPrompt = getLibraryPrompt(componentLibrary || 'none', customLibraryPrompt)
  if (libraryPrompt) {
    return VUE2_BASE_PROMPT + '\n\n' + libraryPrompt
  }
  return VUE2_BASE_PROMPT
}

export interface GenerateResult {
  code: string
  raw: string
  model: string
  usage?: any
}

export interface GenerateOptions {
  prompt?: string
  componentLibrary?: string
  customLibraryPrompt?: string
}

/**
 * Generate Vue 2 code from image
 */
export async function generateFromImage(
  image: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  if (!AI_API_KEY) {
    throw new Error('AI API key not configured (set AI_API_KEY in .env)')
  }

  const { prompt, componentLibrary, customLibraryPrompt } = options
  const systemPrompt = buildSystemPrompt(componentLibrary, customLibraryPrompt)

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: image.startsWith('data:') ? image : `data:image/png;base64,${image}`
          }
        },
        {
          type: 'text',
          text: prompt || '请根据这个设计图生成 Vue 2 组件代码'
        }
      ]
    }
  ]

  console.log(`[AI] Component library: ${componentLibrary || 'none'}`)
  return callAI(messages)
}

/**
 * Generate Vue 2 code from DSL
 */
export async function generateFromDsl(
  dsl: any,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  if (!AI_API_KEY) {
    throw new Error('AI API key not configured (set AI_API_KEY in .env)')
  }

  const { prompt, componentLibrary, customLibraryPrompt } = options
  const systemPrompt = buildSystemPrompt(componentLibrary, customLibraryPrompt)
  const dslString = typeof dsl === 'string' ? dsl : JSON.stringify(dsl, null, 2)

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请根据以下 MasterGo 设计 DSL 生成 Vue 2 组件代码：

\`\`\`json
${dslString}
\`\`\`

${prompt || ''}`
    }
  ]

  console.log(`[AI] Component library: ${componentLibrary || 'none'}`)
  return callAI(messages)
}

/**
 * Call AI API (OpenAI compatible)
 */
async function callAI(messages: any[]): Promise<GenerateResult> {
  const inputSize = JSON.stringify(messages).length
  console.log(`[AI] Generating code with model: ${AI_MODEL}`)
  console.log(`[AI] API URL: ${AI_API_BASE_URL}${AI_API_PATH}/chat/completions`)
  console.log(`[AI] Input size: ${(inputSize / 1024).toFixed(1)}KB`)

  const response = await axios.post(
    `${AI_API_BASE_URL}${AI_API_PATH}/chat/completions`,
    {
      model: AI_MODEL,
      messages,
      max_tokens: 4096,
    },
    {
      headers: {
        // Note: Some private APIs don't need Bearer prefix
        'Authorization': `${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const content = response.data.choices[0]?.message?.content || ''

  // Extract Vue code from response
  const vueCodeMatch = content.match(/```vue\n([\s\S]*?)```/)
  const code = vueCodeMatch ? vueCodeMatch[1].trim() : content

  console.log(`[AI] Code generated successfully (${code.length} chars)`)

  return {
    code,
    raw: content,
    model: AI_MODEL,
    usage: response.data.usage
  }
}
