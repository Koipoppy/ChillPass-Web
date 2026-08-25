/**
 * ChillPass Web - SEA (Single Executable Application) Entry Point
 *
 * This file is the entry point for the Node.js SEA build.
 * It starts the local HTTP server, opens the browser, and
 * launches the system tray script.
 *
 * Only uses Node.js built-in modules — no npm dependencies.
 */
import { createServer } from 'node:http'
import { readFile, stat, access } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec, spawn } from 'node:child_process'
import { platform } from 'node:os'

// ── Resolve base directory ──────────────────────────────────────
// In SEA: import.meta.url → file:///C:/.../chillpass.exe
// In dev: import.meta.url → file:///C:/.../app.mjs
// dirname() gives the folder containing the exe/script,
// which is where dist/, tray.ps1, and icon.ico live.
const BASE_DIR = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(BASE_DIR, 'dist')
const TRAY_SCRIPT = join(BASE_DIR, 'tray.ps1')
const ICON_PATH = join(BASE_DIR, 'icon.ico')
const PORT = 5174
const APP_VERSION = '0.0.5'

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
  '.pdf': 'application/pdf',
}

function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`
  exec(cmd, () => {})
}

// ── Launch system tray ──────────────────────────────────────────
let trayProcess = null

function launchTray() {
  if (process.platform !== 'win32') return
  if (!existsSync(TRAY_SCRIPT)) {
    console.log('[Tray] tray.ps1 not found, skipping tray icon.')
    return
  }

  const psArgs = [
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-WindowStyle', 'Hidden',
    '-File', TRAY_SCRIPT,
    '-ParentPid', String(process.pid),
    '-Url', `http://localhost:${PORT}`,
    '-Icon', ICON_PATH,
  ]

  trayProcess = spawn('powershell.exe', psArgs, {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
  })

  trayProcess.on('error', (err) => {
    console.log(`[Tray] Failed to launch: ${err.message}`)
  })

  trayProcess.unref()
}

// ── Graceful shutdown ───────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down...`)
  if (trayProcess && !trayProcess.killed) {
    try { trayProcess.kill() } catch {}
  }
  server.close(() => process.exit(0))
  // Force exit after 3s if server.close hangs
  setTimeout(() => process.exit(0), 3000)
}

// ── HTTP server ─────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url?.split('?')[0] || '/')

    // Security: prevent path traversal
    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
    let filePath = join(DIST_DIR, safePath)

    let stats
    try {
      stats = await stat(filePath)
    } catch {
      // SPA fallback: serve index.html for unknown routes
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
    // Final fallback
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

// ── Start ───────────────────────────────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  端口 ${PORT} 已被占用，可能已有实例在运行。`)
    console.log(`  正在打开浏览器访问现有实例...`)
    openBrowser(`http://localhost:${PORT}`)
    setTimeout(() => process.exit(0), 1500)
  } else {
    console.error(`服务器错误: ${err.message}`)
    process.exit(1)
  }
})

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`
  console.log('')
  console.log('  ============================================')
  console.log('                                             ')
  console.log('   ChillPass 期末冲刺助手 已启动             ')
  console.log(`   版本: ${APP_VERSION}                      `)
  console.log('                                             ')
  console.log(`   访问地址: ${url}          `)
  console.log('                                             ')
  console.log('   浏览器将自动打开，如未打开请手动访问       ')
  console.log('                                             ')
  console.log('   按 Ctrl+C 停止服务器                      ')
  console.log('                                             ')
  console.log('  ============================================')
  console.log('')

  // Launch system tray
  launchTray()

  // Auto-open browser after 500ms
  setTimeout(() => openBrowser(url), 500)
})

// Handle termination signals
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
