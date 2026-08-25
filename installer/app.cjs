/**
 * ChillPass Web - SEA (Single Executable Application) Entry Point
 *
 * CommonJS version — Node.js SEA requires CJS for reliable embedding.
 * Starts the local HTTP server, opens the browser, and launches the
 * system tray script.
 *
 * Only uses Node.js built-in modules — no npm dependencies.
 */
'use strict';

const { createServer } = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { extname, join, normalize, dirname } = require('node:path');
const { exec, spawn } = require('node:child_process');
const os = require('node:os');

// ── Resolve base directory ──────────────────────────────────────
// In SEA (CJS): __dirname → directory of the executable
// In dev:       __dirname → directory of this script
// This is where dist/, tray.ps1, and icon.ico live.
const BASE_DIR = __dirname;
const DIST_DIR = join(BASE_DIR, 'dist');
const TRAY_SCRIPT = join(BASE_DIR, 'tray.ps1');
const ICON_PATH = join(BASE_DIR, 'icon.ico');
const PORT = 5174;
const APP_VERSION = '0.0.5';

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
};

function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

// ── Launch system tray ──────────────────────────────────────────
let trayProcess = null;

function launchTray() {
  if (process.platform !== 'win32') return;
  if (!existsSync(TRAY_SCRIPT)) {
    console.log('[Tray] tray.ps1 not found, skipping tray icon.');
    return;
  }

  const psArgs = [
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-WindowStyle', 'Hidden',
    '-File', TRAY_SCRIPT,
    '-ParentPid', String(process.pid),
    '-Url', `http://localhost:${PORT}`,
    '-Icon', ICON_PATH,
  ];

  trayProcess = spawn('powershell.exe', psArgs, {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
  });

  trayProcess.on('error', (err) => {
    console.log(`[Tray] Failed to launch: ${err.message}`);
  });

  trayProcess.unref();
}

// ── Graceful shutdown ───────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down...`);
  if (trayProcess && !trayProcess.killed) {
    try { trayProcess.kill(); } catch (e) {}
  }
  server.close(() => process.exit(0));
  // Force exit after 3s if server.close hangs
  setTimeout(() => process.exit(0), 3000);
}

// ── API endpoints ──────────────────────────────────────────────
function sendJson(res, obj, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function handleApi(req, res, urlPath) {
  // 获取应用版本
  if (urlPath === '/api/getAppVersion' && req.method === 'GET') {
    sendJson(res, { version: APP_VERSION });
    return true;
  }
  // 获取应用路径信息
  if (urlPath === '/api/getAppPaths' && req.method === 'GET') {
    sendJson(res, {
      installPath: BASE_DIR,
      exePath: process.execPath,
      userDataPath: '浏览器 IndexedDB / localStorage',
      tempPath: os.tmpdir(),
    });
    return true;
  }
  // 在资源管理器中定位安装位置（选中 exe）
  if (urlPath === '/api/openInstallPath' && req.method === 'POST') {
    const exe = process.execPath;
    exec(`explorer.exe /select,"${exe}"`, (err) => {
      if (err) console.log(`[OpenPath] ${err.message}`);
    });
    sendJson(res, { ok: true });
    return true;
  }
  return false;
}

// ── HTTP server ─────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url ? req.url.split('?')[0] : '/');

    // API routes take priority
    if (urlPath.startsWith('/api/')) {
      if (handleApi(req, res, urlPath)) return;
      sendJson(res, { error: 'Not Found' }, 404);
      return;
    }

    // Security: prevent path traversal
    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(DIST_DIR, safePath);

    let stats;
    try {
      stats = await stat(filePath);
    } catch {
      // SPA fallback: serve index.html for unknown routes
      filePath = join(DIST_DIR, 'index.html');
      stats = await stat(filePath);
    }

    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html');
      stats = await stat(filePath);
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const data = await readFile(filePath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    res.end(data);
  } catch {
    // Final fallback
    try {
      const fallback = await readFile(join(DIST_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fallback);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - 文件未找到。请先运行构建。');
    }
  }
});

// ── Start ───────────────────────────────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  端口 ${PORT} 已被占用，可能已有实例在运行。`);
    console.log(`  正在打开浏览器访问现有实例...`);
    openBrowser(`http://localhost:${PORT}`);
    setTimeout(() => process.exit(0), 1500);
  } else {
    console.error(`服务器错误: ${err.message}`);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  ============================================');
  console.log('                                             ');
  console.log('   ChillPass 期末冲刺助手 已启动             ');
  console.log(`   版本: ${APP_VERSION}                      `);
  console.log('                                             ');
  console.log(`   访问地址: ${url}          `);
  console.log('                                             ');
  console.log('   浏览器将自动打开，如未打开请手动访问       ');
  console.log('                                             ');
  console.log('   按 Ctrl+C 停止服务器                      ');
  console.log('                                             ');
  console.log('  ============================================');
  console.log('');

  // Launch system tray
  launchTray();

  // Auto-open browser after 500ms
  setTimeout(() => openBrowser(url), 500);
});

// Handle termination signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
