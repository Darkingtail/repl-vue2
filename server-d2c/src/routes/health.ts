import { Router } from 'express'
import {
  isMasterGoConfigured,
  isAIConfigured,
  AI_API_BASE_URL,
  AI_API_PATH,
  AI_MODEL
} from '../config'
import { isMCPConnected, listMCPTools } from '../services/mastergo'

const router = Router()

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    mastergo: isMasterGoConfigured(),
    mcpConnected: isMCPConnected(),
    ai: isAIConfigured(),
    apiBaseUrl: AI_API_BASE_URL,
    apiPath: AI_API_PATH,
    model: AI_MODEL
  })
})

/**
 * GET /api/mcp/tools
 * List available MCP tools
 */
router.get('/mcp/tools', async (req, res) => {
  try {
    const tools = await listMCPTools()
    res.json({ success: true, tools })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list MCP tools',
      details: error.message
    })
  }
})

export default router
