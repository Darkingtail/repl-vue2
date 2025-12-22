import express from 'express'
import cors from 'cors'
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3456

// 组件存储根目录
const COMPONENTS_DIR = join(__dirname, 'public/components')

// 确保目录存在
if (!existsSync(COMPONENTS_DIR)) {
  mkdirSync(COMPONENTS_DIR, { recursive: true })
}

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 静态文件服务
app.use('/components', express.static(COMPONENTS_DIR))

/**
 * 保存组件接口
 * POST /api/save
 * Body: { name: string, source: string, compiled: string, appDomain?: string, dependencies?: string[] }
 */
app.post('/api/save', (req, res) => {
  try {
    const { name, source, compiled, appDomain = 'default', dependencies = [] } = req.body

    if (!name || !source || !compiled) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, source, compiled',
      })
    }

    // 创建目录结构: /components/{appDomain}/{name}/
    const componentDir = join(COMPONENTS_DIR, appDomain, name)
    if (!existsSync(componentDir)) {
      mkdirSync(componentDir, { recursive: true })
    }

    // 保存源文件
    const sourceFile = join(componentDir, `${name}.vue`)
    writeFileSync(sourceFile, source, 'utf-8')

    // 保存编译后的 UMD 文件
    const compiledFile = join(componentDir, `${name}.umd.min.js`)
    writeFileSync(compiledFile, compiled, 'utf-8')

    // 保存元数据（包含依赖信息）
    const metadataFile = join(componentDir, 'metadata.json')
    writeFileSync(metadataFile, JSON.stringify({
      name,
      dependencies,
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf-8')

    // 返回访问 URL
    const baseUrl = `http://localhost:${PORT}`
    const componentUrl = `/components/${appDomain}/${name}/${name}.umd.min.js`

    console.log(`[server] Component saved: ${name}`)
    console.log(`  Source: ${sourceFile}`)
    console.log(`  Compiled: ${compiledFile}`)
    console.log(`  Dependencies: ${dependencies.length > 0 ? dependencies.join(', ') : 'none'}`)
    console.log(`  URL: ${baseUrl}${componentUrl}`)

    res.json({
      success: true,
      name,
      appDomain,
      dependencies,
      url: componentUrl,
      fullUrl: `${baseUrl}${componentUrl}`,
    })
  } catch (error) {
    console.error('[server] Save error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * 获取组件列表
 * GET /api/components?appDomain=default
 */
app.get('/api/components', (req, res) => {
  try {
    const appDomain = String(req.query.appDomain || 'default')
    const domainDir = join(COMPONENTS_DIR, appDomain)

    if (!existsSync(domainDir)) {
      return res.json({ success: true, components: [] })
    }

    const components = readdirSync(domainDir)
      .filter((name) => statSync(join(domainDir, name)).isDirectory())
      .map((name) => {
        // 读取元数据获取依赖信息
        const metadataFile = join(domainDir, name, 'metadata.json')
        let dependencies: string[] = []
        if (existsSync(metadataFile)) {
          try {
            const metadata = JSON.parse(readFileSync(metadataFile, 'utf-8'))
            dependencies = metadata.dependencies || []
          } catch {
            // 忽略解析错误
          }
        }
        return {
          name,
          url: `/components/${appDomain}/${name}/${name}.umd.min.js`,
          dependencies,
        }
      })

    res.json({ success: true, components })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * 获取组件源代码
 * GET /api/source/:name?appDomain=default
 */
app.get('/api/source/:name', (req, res) => {
  try {
    const { name } = req.params
    const appDomain = String(req.query.appDomain || 'default')
    const sourceFile = join(COMPONENTS_DIR, appDomain, name, `${name}.vue`)

    if (!existsSync(sourceFile)) {
      return res.status(404).json({
        success: false,
        error: `Component "${name}" not found`,
      })
    }

    const source = readFileSync(sourceFile, 'utf-8')
    const metadataFile = join(COMPONENTS_DIR, appDomain, name, 'metadata.json')
    let dependencies: string[] = []
    if (existsSync(metadataFile)) {
      try {
        const metadata = JSON.parse(readFileSync(metadataFile, 'utf-8'))
        dependencies = metadata.dependencies || []
      } catch {
        // ignore
      }
    }

    res.json({
      success: true,
      name,
      source,
      dependencies,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * 批量获取组件源代码（包含依赖）
 * GET /api/sources?names=App,Comp&appDomain=default
 */
app.get('/api/sources', (req, res) => {
  try {
    const names = String(req.query.names || '').split(',').filter(Boolean)
    const appDomain = String(req.query.appDomain || 'default')

    if (names.length === 0) {
      return res.json({ success: true, files: {} })
    }

    const files: Record<string, string> = {}
    const loaded = new Set<string>()

    function loadComponent(name: string) {
      if (loaded.has(name)) return
      loaded.add(name)

      const sourceFile = join(COMPONENTS_DIR, appDomain, name, `${name}.vue`)
      if (!existsSync(sourceFile)) return

      // Load dependencies first
      const metadataFile = join(COMPONENTS_DIR, appDomain, name, 'metadata.json')
      if (existsSync(metadataFile)) {
        try {
          const metadata = JSON.parse(readFileSync(metadataFile, 'utf-8'))
          const deps = metadata.dependencies || []
          deps.forEach((dep: string) => loadComponent(dep))
        } catch {
          // ignore
        }
      }

      files[`${name}.vue`] = readFileSync(sourceFile, 'utf-8')
    }

    names.forEach(loadComponent)

    res.json({ success: true, files })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * 健康检查
 * GET /api/health
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                 REPL Component Server                     ║
╠═══════════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                         ║
║  API:      http://localhost:${PORT}/api/save                ║
║  Static:   http://localhost:${PORT}/components              ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

export { app }
