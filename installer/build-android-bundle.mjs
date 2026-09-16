/**
 * 打包安卓热更新资源包 dist.zip
 *
 * 与 Windows 安装包发布在同一个 Release 下。Web 层改动只需要替换这个 zip：
 * 安卓端由 live-update 插件下载后热替换 WebView 资源，不需要重新打包 APK、
 * 也不需要重新安装，因此 Windows 发版后安卓可以自动跟上，无需二次开发。
 *
 * 插件会递归查找 index.html 并以其所在目录作为资源根，
 * 这里把 dist/ 的内容平铺到 zip 根目录，少一层嵌套。
 *
 * 用法: node installer/build-android-bundle.mjs
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const DIST_DIR = join(PROJECT_ROOT, 'dist')
const RELEASE_DIR = join(PROJECT_ROOT, 'release')

const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'))
const APP_VERSION = pkg.version

function log(msg) {
  console.log(`[bundle] ${msg}`)
}

/** 递归收集目录下的所有文件 */
function collectFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full))
    } else {
      out.push(full)
    }
  }
  return out
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`未找到 ${DIST_DIR}，请先运行 npm run build`)
  }

  const files = collectFiles(DIST_DIR)
  if (files.length === 0) {
    throw new Error('dist/ 为空，请先运行 npm run build')
  }

  const zip = new JSZip()
  for (const file of files) {
    // zip 内部一律用正斜杠，Windows 上的反斜杠会让解压出问题
    const relPath = relative(DIST_DIR, file).split(sep).join('/')
    zip.file(relPath, readFileSync(file))
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })

  // 发行包里必须能找到 index.html，否则插件会拒绝加载
  const names = files.map(f => relative(DIST_DIR, f).split(sep).join('/'))
  if (!names.includes('index.html')) {
    throw new Error('dist/ 根目录缺少 index.html，热更新包无法被插件识别')
  }

  mkdirSync(RELEASE_DIR, { recursive: true })
  const outFile = join(RELEASE_DIR, 'dist.zip')
  writeFileSync(outFile, buffer)

  const sha256 = createHash('sha256').update(buffer).digest('hex')

  log(`版本: v${APP_VERSION}`)
  log(`文件数: ${files.length}`)
  log(`输出: ${outFile}`)
  log(`大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
  log(`SHA-256: ${sha256}`)
  log('')
  log(`发布时把这个 dist.zip 与 ChillPass-Setup-${APP_VERSION}.exe 一起传进同一个 Release，`)
  log('安卓端检查更新时会自动取用。')
}

main().catch(err => {
  console.error(`[bundle] 失败: ${err.message}`)
  process.exit(1)
})
