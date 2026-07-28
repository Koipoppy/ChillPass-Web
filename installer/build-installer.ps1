<#
.SYNOPSIS
    ChillPass Web 安装程序构建脚本
.DESCRIPTION
    一键构建完整安装程序：
      1. 安装 npm 依赖
      2. 构建前端 (vite build → dist/)
      3. 构建 SEA exe (chillpass.exe)
      4. 下载工具 (NSIS, rcedit) — 仅首次
      5. 暂存文件
      6. 编译 NSIS 安装程序 → release/ChillPass-Setup-x.x.x.exe
.PARAMETER SkipBuild
    跳过前端构建（使用已有的 dist/）
.PARAMETER SkipSea
    跳过 SEA 构建（使用已有的 build/sea/chillpass.exe）
.EXAMPLE
    .\build-installer.ps1
    .\build-installer.ps1 -SkipBuild -SkipSea
#>
param(
    [switch]$SkipBuild,
    [switch]$SkipSea
)

$ErrorActionPreference = "Stop"

# ── 路径 ──────────────────────────────────────────────────────────
$ProjectRoot  = "c:\Users\chenyuchong\Products\ChillPassWeb"
$InstallerDir = Join-Path $ProjectRoot "installer"
$BuildDir     = Join-Path $ProjectRoot "build"
$StagingDir   = Join-Path $BuildDir "staging"
$ReleaseDir   = Join-Path $ProjectRoot "release"
$ToolsDir     = Join-Path $InstallerDir "tools"
$WorkDir      = "c:\Users\chenyuchong\.trae-cn\work\6a60bf7c06a7dfc8538a6e27"

# 读取版本号
$Pkg = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
$Version = $Pkg.version

function Write-Step($msg) { Write-Host "`n━━━ $msg ━━━" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "  ✗ $msg" -ForegroundColor Red }

# ── 工具查找与下载 ────────────────────────────────────────────────

function Find-OrDownload-Nsis {
    # 1. PATH
    $inPath = Get-Command makensis.exe -ErrorAction SilentlyContinue
    if ($inPath) { return $inPath.Source }

    # 2. 已知位置
    $candidates = @(
        Join-Path $ToolsDir "nsis\nsis-3.10\makensis.exe"
        Join-Path $WorkDir "nsis\nsis-3.10\makensis.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }

    # 3. 下载
    Write-Host "  NSIS 未找到，正在下载..." -ForegroundColor Yellow
    $nsisZip = Join-Path $WorkDir "nsis-download.zip"
    $nsisExtract = Join-Path $ToolsDir "nsis"
    New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null

    & curl.exe -L --max-time 120 -o $nsisZip "https://downloads.sourceforge.net/project/nsis/NSIS%203/3.10/nsis-3.10.zip" 2>$null
    $sz = (Get-Item $nsisZip -ErrorAction SilentlyContinue).Length
    if (-not $sz -or $sz -lt 1000000) {
        throw "NSIS 下载失败 (文件大小: $sz bytes)"
    }
    Expand-Archive $nsisZip $nsisExtract -Force
    $makensis = Join-Path $nsisExtract "nsis-3.10\makensis.exe"
    if (-not (Test-Path $makensis)) { throw "NSIS 解压后未找到 makensis.exe" }
    return $makensis
}

function Find-OrDownload-Rcedit {
    $rceditPath = Join-Path $ToolsDir "rcedit-x64.exe"
    if (Test-Path $rceditPath) { return $rceditPath }

    # 也检查 installer 目录
    $altPath = Join-Path $InstallerDir "rcedit-x64.exe"
    if (Test-Path $altPath) { return $altPath }

    Write-Host "  rcedit 未找到，正在下载..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null

    $urls = @(
        "https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe"
        "https://gh-proxy.com/https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe"
    )

    foreach ($url in $urls) {
        try {
            & curl.exe -L --max-time 60 -o $rceditPath $url 2>$null
            if ((Test-Path $rceditPath) -and (Get-Item $rceditPath).Length -gt 100000) {
                return $rceditPath
            }
        } catch { continue }
    }

    Write-Host "  rcedit 下载失败，exe 将使用默认图标（快捷方式仍使用正确图标）" -ForegroundColor Yellow
    return $null
}

# ════════════════════════════════════════════════════════════════
# 主流程
# ════════════════════════════════════════════════════════════════
Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ChillPass Web 安装程序构建 v$Version              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan

# ── Step 0: 检查 Node.js ──────────────────────────────────────────
Write-Step "检查环境"
$nodeVer = node --version 2>&1
if ($LASTEXITCODE -ne 0) { throw "Node.js 未安装" }
Write-OK "Node.js $nodeVer"

# ── Step 1: 安装依赖 ──────────────────────────────────────────────
Write-Step "安装 npm 依赖"
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Push-Location $ProjectRoot
    npm install
    Pop-Location
    Write-OK "依赖安装完成"
} else {
    Write-OK "node_modules 已存在，跳过"
}

# 安装 postject（SEA 注入工具）
$postjectDir = Join-Path $ProjectRoot "node_modules\postject"
if (-not (Test-Path $postjectDir)) {
    Write-Host "  安装 postject..."
    Push-Location $ProjectRoot
    npm install postject --save-dev --no-save 2>&1 | Out-Null
    Pop-Location
}
Write-OK "postject 就绪"

# ── Step 2: 构建前端 ──────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step "构建前端 (vite build)"
    Push-Location $ProjectRoot
    npm run build
    Pop-Location
    if (-not (Test-Path (Join-Path $ProjectRoot "dist\index.html"))) {
        throw "前端构建失败: dist/index.html 不存在"
    }
    Write-OK "前端构建完成 → dist/"
} else {
    Write-Host "  跳过前端构建" -ForegroundColor Yellow
}

# ── Step 3: 构建 SEA exe ──────────────────────────────────────────
if (-not $SkipSea) {
    Write-Step "构建 SEA exe (chillpass.exe)"

    # 下载 rcedit（用于设置 exe 图标）
    $rcedit = Find-OrDownload-Rcedit
    if ($rcedit) {
        # 复制到 installer 目录供 build-sea.mjs 使用
        $rceditDest = Join-Path $InstallerDir "rcedit-x64.exe"
        if ($rcedit -ne $rceditDest) {
            Copy-Item $rcedit $rceditDest -Force
        }
        Write-OK "rcedit 就绪"
    }

    Push-Location $ProjectRoot
    node installer/build-sea.mjs
    Pop-Location

    $seaExe = Join-Path $BuildDir "sea\chillpass.exe"
    if (-not (Test-Path $seaExe)) {
        throw "SEA 构建失败: $seaExe 不存在"
    }
    Write-OK "SEA exe 构建完成 → build/sea/chillpass.exe"
} else {
    Write-Host "  跳过 SEA 构建" -ForegroundColor Yellow
}

# ── Step 4: 暂存文件 ──────────────────────────────────────────────
Write-Step "暂存文件"
if (Test-Path $StagingDir) { Remove-Item $StagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

# 复制所有 NSIS 需要的文件到暂存目录
Copy-Item (Join-Path $BuildDir "sea\chillpass.exe")   $StagingDir
Copy-Item (Join-Path $ProjectRoot "tray.ps1")         $StagingDir
Copy-Item (Join-Path $ProjectRoot "public\icon.ico")  $StagingDir
Copy-Item (Join-Path $InstallerDir "updater.ps1")     $StagingDir
# 复制 installer.nsi 并确保 UTF-8 BOM 编码（NSIS Unicode 需要）
$nsiSrc = Join-Path $InstallerDir "installer.nsi"
$nsiDst = Join-Path $StagingDir "installer.nsi"
$nsiContent = [System.IO.File]::ReadAllText($nsiSrc, [System.Text.Encoding]::UTF8)
$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($nsiDst, $nsiContent, $utf8Bom)

Copy-Item (Join-Path $ProjectRoot "dist")             $StagingDir -Recurse

Write-OK "暂存目录: $StagingDir"
Get-ChildItem $StagingDir | ForEach-Object { Write-Host "    $($_.Name)" }

# ── Step 5: 编译 NSIS 安装程序 ────────────────────────────────────
Write-Step "编译 NSIS 安装程序"
$makensis = Find-OrDownload-Nsis
Write-Host "  makensis: $makensis"

Push-Location $StagingDir
& $makensis "installer.nsi"
$nsisExit = $LASTEXITCODE
Pop-Location

if ($nsisExit -ne 0) {
    throw "NSIS 编译失败 (exit code: $nsisExit)"
}

$installerName = "ChillPass-Setup-$Version.exe"
$installerPath = Join-Path $StagingDir $installerName
if (-not (Test-Path $installerPath)) {
    throw "安装程序未生成: $installerPath"
}
Write-OK "安装程序编译完成: $installerName"

# ── Step 6: 输出到 release 目录 ───────────────────────────────────
Write-Step "输出安装程序"
New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
$finalPath = Join-Path $ReleaseDir $installerName
Move-Item $installerPath $finalPath -Force

$size = (Get-Item $finalPath).Length / 1MB
Write-OK "安装程序: $finalPath"
Write-Host "  大小: $("{0:N1}" -f $size) MB"

# ── 完成 ──────────────────────────────────────────────────────────
Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   构建完成！                                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "`n  安装程序路径: $finalPath" -ForegroundColor Yellow
Write-Host "  版本: v$Version`n"
