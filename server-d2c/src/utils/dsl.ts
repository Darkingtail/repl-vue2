/**
 * Find a node by ID in a DSL tree structure
 */
export function findNodeById(node: any, targetId: string): any {
  if (!node) return null

  // Check if this node matches
  if (node.id === targetId) {
    return node
  }

  // Search in children
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId)
      if (found) return found
    }
  }

  return null
}

/**
 * Collect node IDs from a DSL tree (for debugging)
 */
export function collectNodeIds(node: any, ids: string[] = [], limit = 10): string[] {
  if (!node || ids.length >= limit) return ids
  if (node.id) ids.push(node.id)
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (ids.length >= limit) break
      collectNodeIds(child, ids, limit)
    }
  }
  return ids
}

/**
 * Extract a specific node from DSL by node ID
 *
 * Note: MasterGo DSL structure can be:
 * 1. Flat object with numeric keys (0, 723951, 723952...)
 * 2. Tree with document.children structure
 */
export function extractNodeFromDsl(dsl: any, nodeId: string): any {
  if (!dsl || !nodeId) return dsl

  const document = dsl.document || dsl

  // Debug: show DSL structure
  const topKeys = Object.keys(dsl)
  console.log(`[DSL] DSL is object with ${topKeys.length} keys`)
  console.log(`[DSL] First few keys: ${topKeys.slice(0, 5).join(', ')}`)

  // Check first item structure
  const firstKey = topKeys[0]
  if (firstKey && dsl[firstKey]) {
    const firstItem = dsl[firstKey]
    console.log(`[DSL] First item keys: ${Object.keys(firstItem).join(', ')}`)
    if (firstItem.id) console.log(`[DSL] First item id: ${firstItem.id}`)
    if (firstItem.guid) console.log(`[DSL] First item guid: ${firstItem.guid}`)
    if (firstItem.name) console.log(`[DSL] First item name: ${firstItem.name}`)
  }

  console.log(`[DSL] Looking for nodeId: ${nodeId}`)

  // Try different key formats
  const nodeIdWithoutPrefix = nodeId.includes(':') ? nodeId.split(':')[1] : nodeId
  const nodeIdNumeric = nodeIdWithoutPrefix.replace(/^0+/, '') // Remove leading zeros

  console.log(`[DSL] Trying keys: "${nodeId}", "${nodeIdWithoutPrefix}", "${nodeIdNumeric}"`)
  console.log(`[DSL] Key "${nodeId}" exists: ${nodeId in dsl}`)
  console.log(`[DSL] Key "${nodeIdWithoutPrefix}" exists: ${nodeIdWithoutPrefix in dsl}`)
  console.log(`[DSL] Key "${nodeIdNumeric}" exists: ${nodeIdNumeric in dsl}`)

  // Direct lookup by key
  let found = dsl[nodeId] || dsl[nodeIdWithoutPrefix] || dsl[nodeIdNumeric]

  if (!found) {
    // Try tree search as fallback
    found = findNodeById(document, nodeId)
  }

  if (found) {
    console.log(`[DSL] Found node ${nodeId}, extracted size: ${JSON.stringify(found).length} bytes`)
    return { document: found }
  }

  console.log(`[DSL] Node ${nodeId} not found, returning full DSL`)
  return dsl
}

/**
 * Get DSL size in KB
 */
export function getDslSize(dsl: any): number {
  const bytes = JSON.stringify(dsl).length
  return Math.round(bytes / 1024 * 10) / 10
}
