/**
 * ChillPass 浏览器版 - 零依赖静态文件服务器
 * 使用 Node.js 内置模块，无需安装任何 npm 包
 * 支持单页应用（SPA）路由回退
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { exec } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, 'dist')
const PORT = 5174

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`
  exec(cmd, () => {})
}

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url?.split('?')[0] || '/')

    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
    let filePath = join(DIST_DIR, safePath)

    let stats
    try {
      stats = await stat(filePath)
    } catch {
      filePath = join(DIST_DIR, 'index.html')
      stats = await stat(filePath)
    }

    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html')
      stats = await stat(filePath)
    }

    const ext = extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    const data = await readFile(filePath)

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    })
    res.end(data)
  } catch {
    try {
      const fallback = await readFile(join(DIST_DIR, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(fallback)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 - 文件未找到。请先运行构建。')
    }
  }
})

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`
  console.log('')
  console.log('  ============================================')
  console.log('                                             ')
  console.log('   ChillPass 期末冲刺助手 已启动             ')
  console.log('                                             ')
  console.log(`   访问地址: ${url}          `)
  console.log('                                             ')
  console.log('   浏览器将自动打开，如未打开请手动访问       ')
  console.log('                                             ')
  console.log('   按 Ctrl+C 停止服务器                      ')
  console.log('                                             ')
  console.log('  ============================================')
  console.log('')

  // 自动打开浏览器
  setTimeout(() => openBrowser(url), 500)
})
