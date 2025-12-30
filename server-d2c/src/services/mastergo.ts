import { getMCPClient, closeMCPClient, MCPClient } from '../utils/mcp-client'
import { parseMasterGoLink, ParsedMasterGoLink } from '../utils/link-parser'
import { extractNodeFromDsl, getDslSize } from '../utils/dsl'
import { MG_TOKEN, MASTERGO_API_URL } from '../config'

let mcpClient: MCPClient | null = null

/**
 * Initialize MasterGo MCP client
 */
export async function initMasterGo(): Promise<void> {
  if (!MG_TOKEN) {
    console.log('[MasterGo] No token configured, MCP client not initialized')
    return
  }

  try {
    mcpClient = getMCPClient(MG_TOKEN, MASTERGO_API_URL, true)
    await mcpClient.connect()
    console.log('[MasterGo] MCP client connected')
  } catch (error: any) {
    console.error('[MasterGo] Failed to connect MCP client:', error.message)
  }
}

/**
 * Get DSL from MasterGo link using MCP
 */
export async function getDslFromLink(link: string): Promise<{
  dsl: any
  parsedLink: ParsedMasterGoLink
  dslSize: number
}> {
  // Parse link
  const parsedLink = parseMasterGoLink(link)
  if (!parsedLink) {
    throw new Error('Invalid MasterGo link format. Supported: /file/{id} or /goto/?file={id}')
  }

  console.log(`[MasterGo] Fetching DSL for file: ${parsedLink.fileId}, node: ${parsedLink.nodeId || 'root'}`)

  // Ensure MCP client is connected
  if (!mcpClient) {
    if (!MG_TOKEN) {
      throw new Error('MasterGo token not configured')
    }
    mcpClient = getMCPClient(MG_TOKEN, MASTERGO_API_URL, true)
    await mcpClient.connect()
  }

  // Get DSL via MCP (prefer fileId + layerId, fallback to shortLink)
  if (parsedLink.fileId && parsedLink.nodeId) {
    console.log(`[MasterGo] Calling MCP mcp__getDsl with fileId: ${parsedLink.fileId}, layerId: ${parsedLink.nodeId}`)
  } else if (parsedLink.shortLink) {
    console.log(`[MasterGo] Calling MCP mcp__getDsl with shortLink: ${parsedLink.shortLink}`)
  } else {
    console.log(`[MasterGo] Calling MCP mcp__getDsl with fileId: ${parsedLink.fileId} (no layerId)`)
  }
  const dsl = await mcpClient.getDsl(parsedLink.fileId, parsedLink.nodeId, parsedLink.shortLink)

  const fullDslSize = getDslSize(dsl)
  console.log(`[MasterGo] Full DSL fetched, size: ${fullDslSize}KB`)

  // Extract specific node if nodeId provided
  const extractedDsl = parsedLink.nodeId
    ? extractNodeFromDsl(dsl, parsedLink.nodeId)
    : dsl

  const extractedSize = getDslSize(extractedDsl)
  console.log(`[MasterGo] Extracted DSL size: ${extractedSize}KB`)

  return {
    dsl: extractedDsl,
    parsedLink,
    dslSize: extractedSize
  }
}

/**
 * List available MCP tools
 */
export async function listMCPTools(): Promise<any[]> {
  if (!mcpClient) {
    if (!MG_TOKEN) {
      throw new Error('MasterGo token not configured')
    }
    mcpClient = getMCPClient(MG_TOKEN, MASTERGO_API_URL, true)
    await mcpClient.connect()
  }

  return mcpClient.listTools()
}

/**
 * Check if MasterGo MCP is connected
 */
export function isMCPConnected(): boolean {
  return mcpClient?.isConnected() ?? false
}

/**
 * Disconnect MasterGo MCP client
 */
export async function disconnectMasterGo(): Promise<void> {
  await closeMCPClient()
  mcpClient = null
}
