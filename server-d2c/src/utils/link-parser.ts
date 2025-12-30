export interface ParsedMasterGoLink {
  fileId: string
  nodeId?: string
  fullUrl: string
  shortLink?: string  // /goto/xxx format
}

/**
 * Parse MasterGo link to extract file ID and node ID
 *
 * Supported formats:
 * - Format 1: https://mastergo.com/file/{fileId}?node_id={nodeId}
 * - Format 2: https://mastergo.com/goto/{shortCode}?file={fileId}&layer_id={nodeId}
 */
export function parseMasterGoLink(link: string): ParsedMasterGoLink | null {
  if (!link) return null

  let fileId: string | undefined
  let nodeId: string | undefined
  let shortLink: string | undefined

  // Check for shortLink format: /goto/{code}
  const gotoMatch = link.match(/\/goto\/([A-Za-z0-9]+)/)
  if (gotoMatch) {
    // Extract the full short link URL
    const urlMatch = link.match(/(https?:\/\/[^/]+\/goto\/[A-Za-z0-9]+)/)
    shortLink = urlMatch?.[1]
  }

  // Try format 1: /file/{fileId}
  const filePathMatch = link.match(/file\/([^?/]+)/)
  if (filePathMatch) {
    fileId = filePathMatch[1]
    const nodeMatch = link.match(/node_id=([^&\s]+)/)
    nodeId = nodeMatch?.[1]
  } else {
    // Try format 2: /goto/... with file= query param
    // Use \d+ to only capture numeric file ID (avoid Chinese text in share links)
    const fileParamMatch = link.match(/[?&]file=(\d+)/)
    if (fileParamMatch) {
      fileId = fileParamMatch[1]
      // layer_id is the node ID in this format
      const layerMatch = link.match(/layer_id=([^&\s]+)/)
      nodeId = layerMatch?.[1]
    }
  }

  // Need at least fileId or shortLink
  if (!fileId && !shortLink) {
    return null
  }

  // Construct full URL for MCP
  const fullUrl = nodeId && fileId
    ? `https://mastergo.com/file/${fileId}?node_id=${nodeId}`
    : fileId
      ? `https://mastergo.com/file/${fileId}`
      : link

  return {
    fileId: fileId || '',
    nodeId,
    fullUrl,
    shortLink
  }
}

/**
 * Validate MasterGo link format
 */
export function isValidMasterGoLink(link: string): boolean {
  return parseMasterGoLink(link) !== null
}
