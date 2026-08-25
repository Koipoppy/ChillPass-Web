/**
 * build-sea.mjs — Builds chillpass.exe via Node.js Single Executable Application (SEA)
 *
 * Steps:
 *   1. Copy app.mjs into build/sea/
 *   2. Generate sea-config.json
 *   3. Run: node --experimental-sea-config sea-config.json  →  sea-prep.blob
 *   4. Copy node.exe → chillpass.exe
 *   5. Remove digital signature (signtool if available)
 *   6. Inject blob:  postject chillpass.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse ...
 *   7. Set icon & version info (rcedit if available)
 *
 * Usage:  node installer/build-sea.mjs
 */
import { existsSync, readFileSync, openSync, readSync, writeSync, closeSync } from 'node:fs'
import { copyFile, mkdir, writeFile, rm, stat } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync, spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const BUILD_DIR = join(PROJECT_ROOT, 'build', 'sea')
const APP_SRC = join(__dirname, 'app.cjs')
const APP_DST = join(BUILD_DIR, 'app.cjs')
const SEA_CONFIG = join(BUILD_DIR, 'sea-config.json')
const SEA_BLOB = join(BUILD_DIR, 'sea-prep.blob')
const EXE_PATH = join(BUILD_DIR, 'chillpass.exe')
const ICON_PATH = join(PROJECT_ROOT, 'public', 'icon.ico')
const POSTJECT_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'))
const APP_VERSION = pkg.version

function log(msg) { console.log(`[SEA] ${msg}`) }

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${result.status})`)
  }
  return result
}

// On Windows, .cmd files need shell:true or direct path
function runShell(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${result.status})`)
  }
  return result
}

// Find postject binary in node_modules/.bin
function findPostject() {
  const binDir = join(PROJECT_ROOT, 'node_modules', '.bin')
  if (process.platform === 'win32') {
    const cmd = join(binDir, 'postject.cmd')
    if (existsSync(cmd)) return { cmd, useShell: true }
  }
  const sh = join(binDir, 'postject')
  if (existsSync(sh)) return { cmd: sh, useShell: false }
  return null
}

// Switch the exe PE subsystem from Console (3) to Windows GUI (2),
// so no console window appears when the user launches the app.
function setGuiSubsystem(exePath) {
  const fd = openSync(exePath, 'r+')
  try {
    const head = Buffer.alloc(0x400)
    readSync(fd, head, 0, 0x400, 0)
    const peOffset = head.readUInt32LE(0x3C)
    if (head.toString('ascii', peOffset, peOffset + 2) !== 'PE') {
      throw new Error('Not a valid PE file')
    }
    // Optional header: PE signature(4) + COFF header(20); Subsystem at +68 (0x44)
    const subOffset = peOffset + 4 + 20 + 68
    const oldSub = head.readUInt16LE(subOffset)
    if (oldSub !== 2) {
      head.writeUInt16LE(2, subOffset)
      writeSync(fd, head, 0, subOffset + 2, 0)
      log(`  PE subsystem: ${oldSub} → 2 (GUI, console window hidden)`)
    } else {
      log('  PE subsystem already GUI (2)')
    }
  } finally {
    closeSync(fd)
  }
}

async function main() {
  log(`Building chillpass.exe v${APP_VERSION}`)

  // ── 1. Prepare build directory ──────────────────────────────
  log('Preparing build directory...')
  await rm(BUILD_DIR, { recursive: true, force: true })
  await mkdir(BUILD_DIR, { recursive: true })
  await copyFile(APP_SRC, APP_DST)

  // ── 2. Generate sea-config.json ─────────────────────────────
  log('Generating sea-config.json...')
  const seaConfig = {
    main: 'app.cjs',
    output: 'sea-prep.blob',
    disableExperimentalSEAWarning: true,
  }
  await writeFile(SEA_CONFIG, JSON.stringify(seaConfig, null, 2))

  // ── 3. Generate SEA blob ────────────────────────────────────
  log('Generating SEA blob...')
  run('node', ['--experimental-sea-config', 'sea-config.json'], { cwd: BUILD_DIR })

  if (!existsSync(SEA_BLOB)) {
    throw new Error('SEA blob was not generated. Ensure Node.js >= 22.')
  }
  const blobStats = await stat(SEA_BLOB)
  log(`Blob generated: ${(blobStats.size / 1024).toFixed(0)} KB`)

  // ── 4. Copy node.exe → chillpass.exe ────────────────────────
  log('Copying node.exe → chillpass.exe...')
  const nodeExe = process.execPath
  await copyFile(nodeExe, EXE_PATH)

  // ── 5. Remove digital signature ─────────────────────────────
  log('Removing digital signature from exe...')
  try {
    execSync(`signtool remove /s "${EXE_PATH}"`, { stdio: 'pipe' })
    log('  Signature removed via signtool.')
  } catch {
    log('  signtool not found, will use postject directly.')
  }

  // ── 6. Inject blob into exe ─────────────────────────────────
  log('Injecting SEA blob into exe...')

  // Find postject binary
  const postject = findPostject()
  if (postject) {
    log(`  Using postject: ${postject.cmd}`)
    if (postject.useShell) {
      runShell(postject.cmd, [
        `"${EXE_PATH}"`, 'NODE_SEA_BLOB', `"${SEA_BLOB}"`,
        '--sentinel-fuse', POSTJECT_FUSE,
      ])
    } else {
      run(postject.cmd, [
        EXE_PATH, 'NODE_SEA_BLOB', SEA_BLOB,
        '--sentinel-fuse', POSTJECT_FUSE,
      ])
    }
  } else {
    // Fallback: use npx (with --yes to auto-install)
    log('  postject not in node_modules, using npx...')
    runShell('npx', [
      '--yes', 'postject',
      `"${EXE_PATH}"`, 'NODE_SEA_BLOB', `"${SEA_BLOB}"`,
      '--sentinel-fuse', POSTJECT_FUSE,
    ])
  }

  // ── 7. Set icon and version info ────────────────────────────
  log('Setting exe icon and version info...')
  let iconSet = false

  const rceditPaths = [
    join(__dirname, 'rcedit-x64.exe'),
    join(__dirname, 'rcedit.exe'),
    join(__dirname, 'tools', 'rcedit-x64.exe'),
  ]
  const rcedit = rceditPaths.find(p => existsSync(p))

  if (rcedit) {
    try {
      // Add 15s timeout — rcedit can hang on some Windows configs
      const rceditResult = spawnSync(rcedit, [
        EXE_PATH,
        '--set-icon', ICON_PATH,
        '--set-version-string', 'FileDescription', 'ChillPass Web',
        '--set-version-string', 'ProductName', 'ChillPass',
        '--set-version-string', 'OriginalFilename', 'chillpass.exe',
        '--set-version-string', 'CompanyName', 'ChillPass',
        '--set-version-string', 'LegalCopyright', 'MIT License',
        '--set-file-version', APP_VERSION,
        '--set-product-version', APP_VERSION,
      ], { stdio: 'inherit', shell: false, timeout: 15000 })
      if (rceditResult.status === 0) {
        log('  Icon and version info set via rcedit.')
        iconSet = true
      } else {
        log(`  rcedit exited with code ${rceditResult.status} (signal: ${rceditResult.signal})`)
      }
    } catch (e) {
      log(`  rcedit failed: ${e.message}`)
    }
  }

  if (!iconSet) {
    log('  rcedit not found — exe will use default Node.js icon.')
    log('  Shortcuts will still use the correct icon (set by NSIS).')
  }

  // ── 8. Switch to GUI subsystem (hide console window) ────────
  log('Switching to GUI subsystem (hide console window)...')
  try {
    setGuiSubsystem(EXE_PATH)
  } catch (e) {
    log(`  Failed to switch subsystem: ${e.message}`)
  }

  // ── Done ────────────────────────────────────────────────────
  const exeStats = await stat(EXE_PATH)
  log(`✓ Built: ${EXE_PATH}`)
  log(`  Size: ${(exeStats.size / 1024 / 1024).toFixed(1)} MB`)
  log(`  Version: ${APP_VERSION}`)
}

main().catch(err => {
  console.error(`\n[SEA] ERROR: ${err.message}`)
  process.exit(1)
})
