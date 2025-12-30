import express from 'express'
import cors from 'cors'
import { PORT, isMasterGoConfigured, isAIConfigured, AI_API_BASE_URL, AI_MODEL } from './config'
import routes from './routes'
import { initMasterGo, disconnectMasterGo } from './services/mastergo'

const app = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Mount API routes
app.use('/api', routes)

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await disconnectMasterGo()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\nShutting down...')
  await disconnectMasterGo()
  process.exit(0)
})

// Start server
async function start() {
  // Initialize MasterGo MCP client
  if (isMasterGoConfigured()) {
    try {
      await initMasterGo()
    } catch (error: any) {
      console.error('[Startup] MCP initialization failed:', error.message)
    }
  }

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    D2C Proxy Server                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${String(PORT).padEnd(24)}║
║                                                               ║
║  Endpoints:                                                   ║
║    POST /api/mastergo/dsl      - Get DSL from MasterGo (MCP)  ║
║    POST /api/generate          - Generate code from image/DSL ║
║    POST /api/mastergo/generate - MasterGo link -> Code        ║
║    GET  /api/health            - Health check                 ║
║    GET  /api/mcp/tools         - List MCP tools               ║
║                                                               ║
║  Config:                                                      ║
║    MasterGo Token: ${isMasterGoConfigured() ? '✓ Configured' : '✗ Missing'}                            ║
║    AI API Key:     ${isAIConfigured() ? '✓ Configured' : '✗ Missing'}                            ║
║    AI API URL:     ${AI_API_BASE_URL.substring(0, 35).padEnd(35)}  ║
║    AI Model:       ${AI_MODEL.substring(0, 35).padEnd(35)}  ║
╚═══════════════════════════════════════════════════════════════╝
    `)
  })
}

start().catch(console.error)
