# ChillPass Web 一键部署脚本
# 用于从 ChillPassWeb 复制源码到 chillpasslink 并完成部署配置
# 以管理员身份运行（因为需要配置防火墙）

param(
    [string]$SourceDir = "C:\Users\chenyuchong\Products\ChillPassWeb",
    [string]$TargetDir = "C:\Users\chenyuchong\Products\chillpasslink",
    [string]$DeepSeekApiKey = ""
)

Write-Host "=== ChillPass Web 一键部署工具 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 复制文件
Write-Host "[1/6] 复制项目文件..." -ForegroundColor Yellow
$exclude = @('node_modules', 'dist', 'build', 'release', 'installer', 'server.mjs', 'tray.ps1', 'start-dev.bat', 'start-server.bat', '使用说明.md', '.git', 'package-lock.json')
Get-ChildItem -Path $SourceDir -Exclude $exclude | Copy-Item -Destination $TargetDir -Recurse -Force
Copy-Item -Path "$SourceDir\package-lock.json" -Destination "$TargetDir\package-lock.json" -Force

# 2. 生成安全的 JWT_SECRET
Write-Host "[2/6] 生成安全配置..." -ForegroundColor Yellow
$bytes = [byte[]]::new(32)
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
$jwtSecret = -join ($bytes | ForEach-Object { $_.ToString('x2') })

@"
PORT=3001
JWT_SECRET=$jwtSecret
CHILLPASS_DB_PATH=./data/chillpass.db
UPLOAD_DIR=./data/uploads
DEEPSEEK_API_KEY=$DeepSeekApiKey
"@ | Out-File -FilePath "$TargetDir\server\.env" -Encoding UTF8

# 3. 修改 vite.config.ts
Write-Host "[3/6] 修改 Vite 配置 (base: '/' )..." -ForegroundColor Yellow
$viteConfig = Get-Content "$TargetDir\vite.config.ts" -Raw
$viteConfig = $viteConfig.Replace("base: './'", "base: '/'")
Set-Content -Path "$TargetDir\vite.config.ts" -Value $viteConfig -Encoding UTF8

# 4. 安装依赖
Write-Host "[4/6] 安装前端依赖..." -ForegroundColor Yellow
Set-Location $TargetDir
npm install --no-fund --no-audit

Write-Host "[4/6] 安装后端依赖..." -ForegroundColor Yellow
Set-Location "$TargetDir\server"
npm install --no-fund --no-audit

# 5. 构建前端
Write-Host "[5/6] 构建前端..." -ForegroundColor Yellow
Set-Location $TargetDir
npx vite build

# 6. 创建目录和配置防火墙
Write-Host "[6/6] 创建必要目录..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$TargetDir\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$TargetDir\data" | Out-Null

# 防火墙配置
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    $existingRule = Get-NetFirewallRule -DisplayName "ChillPass Web 3001" -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        New-NetFirewallRule -DisplayName "ChillPass Web 3001" `
            -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any | Out-Null
        Write-Host "  [OK] 防火墙规则已添加" -ForegroundColor Green
    } else {
        Write-Host "  [INFO] 防火墙规则已存在" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARN] 未以管理员运行，请手动配置防火墙或运行 deploy\firewall.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 部署完成！ ===" -ForegroundColor Green
Write-Host ""
Write-Host "启动命令:   cd $TargetDir && node server\src\index.js" -ForegroundColor Cyan
Write-Host "访问地址:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "一键启动:   双击 deploy\start.bat" -ForegroundColor Cyan
Write-Host "安装服务:   双击 deploy\install-service.bat（需要先下载 NSSM）" -ForegroundColor Cyan
Write-Host "防火墙配置: 以管理员身份运行 deploy\firewall.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "分享给同学: http://<本机IP>:3001" -ForegroundColor Magenta