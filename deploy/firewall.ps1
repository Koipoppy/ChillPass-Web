# ChillPass Web 防火墙配置脚本
# 以管理员身份运行 PowerShell 并执行此脚本

Write-Host "=== 配置 Windows 防火墙 - 放行 ChillPass Web 端口 3001 ===" -ForegroundColor Cyan

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] 请以管理员身份运行此脚本！" -ForegroundColor Red
    Write-Host "       右键点击 PowerShell，选择"以管理员身份运行"" -ForegroundColor Yellow
    exit 1
}

# 检查规则是否已存在
$existingRule = Get-NetFirewallRule -DisplayName "ChillPass Web 3001" -ErrorAction SilentlyContinue
if ($existingRule) {
    Write-Host "[INFO] 防火墙规则已存在，跳过创建。" -ForegroundColor Yellow
} else {
    # 添加入站规则
    New-NetFirewallRule -DisplayName "ChillPass Web 3001" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3001 `
        -Action Allow `
        -Profile Any `
        -Description "ChillPass 期末冲刺助手 - 局域网访问端口" | Out-Null
    
    Write-Host "[OK] 防火墙规则已添加" -ForegroundColor Green
}

# 验证规则
Write-Host "[INFO] 当前防火墙规则：" -ForegroundColor Cyan
Get-NetFirewallRule -DisplayName "ChillPass*" | Format-Table Name, DisplayName, Enabled, Direction, Action -AutoSize

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green
Write-Host "现在可以通过 http://<本机IP>:3001 从局域网访问了" -ForegroundColor Cyan