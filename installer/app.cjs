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
const https = require('node:https');

// ── Safe console (GUI subsystem has no valid stdout) ───────────
const safeLog = (...args) => { try { console.log(...args) } catch {} };
const safeError = (...args) => { try { console.error(...args) } catch {} };
console.log = safeLog;
console.error = safeError;

// ── Resolve base directory ──────────────────────────────────────
// In SEA (CJS): __dirname → directory of the executable
// In dev:       __dirname → directory of this script
// This is where dist/, tray.ps1, and icon.ico live.
const BASE_DIR = __dirname;
const DIST_DIR = join(BASE_DIR, 'dist');
const TRAY_SCRIPT = join(BASE_DIR, 'tray.ps1');
const ICON_PATH = join(BASE_DIR, 'icon.ico');
const PORT = 5174;
const APP_VERSION = '0.0.6';
const GITHUB_REPO = 'Koipoppy/ChillPass-Web';

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

// ── Version compare ─────────────────────────────────────────────
function compareVersion(a, b) {
  const pa = String(a || '0.0.0').replace(/^v/, '').split('.').map(Number);
  const pb = String(b || '0.0.0').replace(/^v/, '').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const av = pa[i] || 0, bv = pb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

// ── GitHub HTTPS request (with proxy fallback) ─────────────────
function httpsGetJson(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ChillPass-Updater/1.0',
        Accept: 'application/vnd.github+json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => {
        data += c;
        if (data.length > 5 * 1024 * 1024) { req.destroy(); reject(new Error('Response too large')); }
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        } else { reject(new Error(`HTTP ${res.statusCode}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timeout')));
  });
}

async function fetchLatestRelease() {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  const urls = [
    apiUrl,
    `https://gh-proxy.com/${apiUrl}`,
  ];
  for (const url of urls) {
    try { return await httpsGetJson(url); } catch { /* try next */ }
  }
  return null;
}

// ── API endpoints ──────────────────────────────────────────────
function sendJson(res, obj, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function handleApi(req, res, urlPath) {
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
      if (err) safeLog(`[OpenPath] ${err.message}`);
    });
    sendJson(res, { ok: true });
    return true;
  }
  // 检查更新（后端请求 GitHub，避免浏览器跨域/网络限制）
  if (urlPath === '/api/checkForUpdates' && req.method === 'GET') {
    const release = await fetchLatestRelease();
    if (!release) {
      sendJson(res, { error: '无法获取版本信息，请检查网络连接后重试' }, 502);
      return true;
    }
    const latestVersion = String(release.tag_name || '0.0.0').replace(/^v/, '');
    const asset = (release.assets || []).find(
      (a) => /\.exe$/i.test(a.name) && !/\.blockmap$/i.test(a.name),
    );
    const hasUpdate = compareVersion(latestVersion, APP_VERSION) > 0;
    sendJson(res, {
      updateAvailable: hasUpdate,
      latestVersion,
      currentVersion: APP_VERSION,
      downloadUrl: asset ? asset.browser_download_url : (release.html_url || ''),
      releaseNotes: release.body || '',
      releaseDate: release.published_at || '',
    });
    return true;
  }
  // 自动更新：启动 updater.ps1 -Silent（下载安装包 → 静默安装 → 重启）
  if (urlPath === '/api/startUpdate' && req.method === 'POST') {
    const updater = join(BASE_DIR, 'updater.ps1');
    if (!existsSync(updater)) {
      sendJson(res, { error: '未找到更新程序（updater.ps1）' }, 500);
      return true;
    }
    const psArgs = [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-File', updater,
      '-Silent',
    ];
    const child = spawn('powershell.exe', psArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', (err) => safeLog(`[StartUpdate] ${err.message}`));
    child.unref();
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
      if (await handleApi(req, res, urlPath)) return;
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
