import { Router } from 'express'
import { getDslFromLink } from '../services/mastergo'
import { generateFromDsl } from '../services/ai'
import { isAIConfigured, isMasterGoConfigured } from '../config'

const router = Router()

/**
 * POST /api/mastergo/dsl
 * Get DSL from MasterGo link
 */
router.post('/mastergo/dsl', async (req, res) => {
  try {
    const { link } = req.body

    if (!isMasterGoConfigured()) {
      return res.status(500).json({ error: 'MasterGo token not configured' })
    }

    if (!link) {
      return res.status(400).json({ error: 'Link is required' })
    }

    const { dsl, parsedLink, dslSize } = await getDslFromLink(link)

    res.json({
      success: true,
      dsl,
      dslSize,
      fileId: parsedLink.fileId,
      nodeId: parsedLink.nodeId
    })
  } catch (error: any) {
    console.error('[MasterGo] Error:', error.message)
    res.status(500).json({
      error: 'Failed to fetch DSL from MasterGo',
      details: error.message
    })
  }
})

/**
 * POST /api/mastergo/generate
 * Combined: MasterGo link -> DSL -> Vue 2 Code
 */
router.post('/mastergo/generate', async (req, res) => {
  try {
    const { link, prompt, componentLibrary, customLibraryPrompt } = req.body

    if (!isMasterGoConfigured()) {
      return res.status(500).json({ error: 'MasterGo token not configured' })
    }
    if (!isAIConfigured()) {
      return res.status(500).json({ error: 'AI API key not configured (set AI_API_KEY in .env)' })
    }
    if (!link) {
      return res.status(400).json({ error: 'MasterGo link is required' })
    }

    // Step 1: Get DSL from MasterGo
    console.log(`[D2C] Step 1/2: Fetching DSL...`)
    const { dsl, parsedLink, dslSize } = await getDslFromLink(link)
    console.log(`[D2C] DSL fetched, size: ${dslSize}KB`)

    // Step 2: Generate code with AI
    console.log(`[D2C] Step 2/2: Generating code...`)
    const options = { prompt, componentLibrary, customLibraryPrompt }
    const result = await generateFromDsl(dsl, options)
    console.log(`[D2C] Complete! Generated ${result.code.length} chars`)

    res.json({
      success: true,
      code: result.code,
      dsl,
      dslSize,
      model: result.model,
      usage: result.usage
    })
  } catch (error: any) {
    console.error('[D2C] Error:', error.message)
    res.status(500).json({
      error: 'Failed to generate code from MasterGo',
      details: error.message
    })
  }
})

export default router
