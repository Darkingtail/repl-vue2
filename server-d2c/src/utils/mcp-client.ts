import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import * as readline from 'readline'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: any
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

interface MCPToolResult {
  content: Array<{
    type: string
    text?: string
  }>
  isError?: boolean
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }>()
  private initialized = false
  private buffer = ''

  constructor(
    private token: string,
    private apiUrl: string = 'https://mastergo.com',
    private debug: boolean = false
  ) {
    super()
  }

  async connect(): Promise<void> {
    if (this.process) {
      return // Already connected
    }

    return new Promise((resolve, reject) => {
      this.log('Spawning MCP process...')

      // Spawn the MasterGo MCP process
      this.process = spawn('npx', [
        '-y',
        '@mastergo/magic-mcp',
        `--token=${this.token}`,
        `--url=${this.apiUrl}`,
        ...(this.debug ? ['--debug'] : [])
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      })

      // Handle stdout with readline for line-by-line parsing
      const rl = readline.createInterface({
        input: this.process.stdout!,
        crlfDelay: Infinity
      })

      rl.on('line', (line) => {
        this.handleLine(line)
      })

      // Handle stderr (for logging)
      this.process.stderr?.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg) {
          this.log(`[MCP stderr] ${msg}`)
        }
      })

      // Handle process exit
      this.process.on('exit', (code) => {
        this.log(`MCP process exited with code ${code}`)
        this.process = null
        this.initialized = false
        this.emit('disconnected')
      })

      this.process.on('error', (err) => {
        this.log(`MCP process error: ${err.message}`)
        reject(err)
      })

      // Wait a bit for the process to start, then initialize
      setTimeout(async () => {
        try {
          await this.initialize()
          resolve()
        } catch (err) {
          reject(err)
        }
      }, 1000)
    })
  }

  private handleLine(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) return

    // Try to parse as JSON
    try {
      const message = JSON.parse(trimmed)
      this.handleMessage(message)
    } catch {
      // Not JSON, might be log output
      this.log(`[MCP stdout] ${trimmed}`)
    }
  }

  private handleMessage(message: any): void {
    if (message.jsonrpc !== '2.0') {
      this.log(`Non JSON-RPC message: ${JSON.stringify(message)}`)
      return
    }

    // Response to a request
    if ('id' in message && (message.result !== undefined || message.error)) {
      const pending = this.pendingRequests.get(message.id)
      if (pending) {
        this.pendingRequests.delete(message.id)
        if (message.error) {
          pending.reject(new Error(`MCP Error: ${message.error.message}`))
        } else {
          pending.resolve(message.result)
        }
      }
    }
    // Notification (no id)
    else if (!('id' in message) && message.method) {
      this.emit('notification', message)
    }
  }

  private async initialize(): Promise<void> {
    this.log('Initializing MCP connection...')

    // Send initialize request
    const result = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'd2c-server',
        version: '1.0.0'
      }
    })

    this.log(`MCP initialized: ${JSON.stringify(result.serverInfo || {})}`)

    // Send initialized notification
    this.notify('notifications/initialized', {})

    this.initialized = true
    this.emit('connected')
  }

  private request(method: string, params?: any, timeout = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('MCP process not connected'))
        return
      }

      const id = ++this.requestId
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params
      }

      // Set timeout
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`MCP request timeout: ${method}`))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        }
      })

      // Send request (newline-delimited JSON)
      const message = JSON.stringify(request) + '\n'
      this.log(`[MCP send] ${message.trim()}`)
      this.process.stdin.write(message)
    })
  }

  private notify(method: string, params?: any): void {
    if (!this.process?.stdin) return

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    }

    const message = JSON.stringify(notification) + '\n'
    this.log(`[MCP notify] ${message.trim()}`)
    this.process.stdin.write(message)
  }

  async callTool(name: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.initialized) {
      await this.connect()
    }

    this.log(`Calling tool: ${name} with args: ${JSON.stringify(args)}`)

    const result = await this.request('tools/call', {
      name,
      arguments: args
    }, 60000) // 60s timeout for tool calls

    return result as MCPToolResult
  }

  async listTools(): Promise<any[]> {
    if (!this.initialized) {
      await this.connect()
    }

    const result = await this.request('tools/list')
    return result.tools || []
  }

  async getDsl(fileId: string, layerId?: string, shortLink?: string): Promise<any> {
    let args: Record<string, string>

    // Prefer fileId + layerId when both are available
    if (fileId && layerId) {
      args = { fileId, layerId }
    } else if (shortLink) {
      // Use shortLink as fallback (for links without layer_id in query params)
      args = { shortLink }
    } else {
      throw new Error('Either provide both fileId and layerId, or provide a shortLink')
    }

    const result = await this.callTool('mcp__getDsl', args)

    // Extract DSL from result
    if (result.isError) {
      throw new Error(`Failed to get DSL: ${result.content[0]?.text || 'Unknown error'}`)
    }

    const textContent = result.content.find(c => c.type === 'text')
    if (!textContent?.text) {
      throw new Error('No DSL content returned')
    }

    // Parse DSL JSON (DSL might be embedded in a larger response)
    try {
      const parsed = JSON.parse(textContent.text)
      // The response might have dsl property or be the DSL itself
      return parsed.dsl || parsed
    } catch {
      // Return as-is if not JSON
      return textContent.text
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.log('Disconnecting MCP...')
      this.process.kill()
      this.process = null
      this.initialized = false
    }
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[MCPClient] ${message}`)
    }
  }

  isConnected(): boolean {
    return this.initialized && this.process !== null
  }
}

// Singleton instance
let mcpClient: MCPClient | null = null

export function getMCPClient(token: string, apiUrl?: string, debug?: boolean): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient(token, apiUrl, debug)
  }
  return mcpClient
}

export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.disconnect()
    mcpClient = null
  }
}
