import { Router } from 'express'
import { generateFromImage, generateFromDsl } from '../services/ai'
import { isAIConfigured } from '../config'
import { getLibraryOptions } from '../config/component-libraries'

const router = Router()

/**
 * GET /api/libraries
 * Get available component library options
 */
router.get('/libraries', (_req, res) => {
  res.json({
    success: true,
    libraries: getLibraryOptions()
  })
})

/**
 * POST /api/generate
 * Generate Vue 2 code from image or DSL
 */
router.post('/generate', async (req, res) => {
  try {
    const { image, dsl, prompt, componentLibrary, customLibraryPrompt } = req.body

    if (!isAIConfigured()) {
      return res.status(500).json({ error: 'AI API key not configured (set AI_API_KEY in .env)' })
    }

    if (!image && !dsl) {
      return res.status(400).json({ error: 'Either image or dsl is required' })
    }

    const options = { prompt, componentLibrary, customLibraryPrompt }
    let result

    if (image) {
      // Generate from image
      result = await generateFromImage(image, options)
    } else {
      // Generate from DSL
      result = await generateFromDsl(dsl, options)
    }

    res.json({
      success: true,
      code: result.code,
      raw: result.raw,
      model: result.model,
      usage: result.usage
    })
  } catch (error: any) {
    console.error('[Generate] Error:', error.message)
    res.status(500).json({
      error: 'Failed to generate code',
      details: error.message
    })
  }
})

export default router
