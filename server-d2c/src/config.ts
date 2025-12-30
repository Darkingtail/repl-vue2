import 'dotenv/config'

// MasterGo configuration
export const MG_TOKEN = process.env.MG_MCP_TOKEN || ''
export const MASTERGO_API_URL = 'https://mastergo.com'

// AI API configuration (OpenAI compatible format)
export const AI_API_BASE_URL = process.env.AI_API_BASE_URL || 'https://openrouter.ai'
export const AI_API_PATH = process.env.AI_API_PATH || '/api/v1'
export const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || ''
export const AI_MODEL = process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4'

// Server configuration
export const PORT = process.env.PORT || 3001

// Validation
export const isMasterGoConfigured = (): boolean => !!MG_TOKEN
export const isAIConfigured = (): boolean => !!AI_API_KEY
