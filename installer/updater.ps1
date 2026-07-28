<#
.SYNOPSIS
    ChillPass Web 自动更新检查器
.DESCRIPTION
    检查 GitHub Releases 是否有新版本，如有则下载并静默安装。
    支持交互模式（WinForms GUI）和静默模式（-Silent）。
.PARAMETER Silent
    静默模式：不显示 GUI，直接检查并更新。
.PARAMETER CheckOnly
    仅检查是否有更新，不安装。输出 JSON 格式结果。
.EXAMPLE
    .\updater.ps1              # 交互模式，显示 GUI
    .\updater.ps1 -Silent      # 静默模式，自动更新
    .\updater.ps1 -CheckOnly   # 仅检查，输出 JSON
#>
param(
    [switch]$Silent,
    [switch]$CheckOnly
)

# ── 配置 ──────────────────────────────────────────────────────────
$GITHUB_REPO = "Koipoppy/ChillPass-Web"
$API_URL = "https://api.github.com/repos/$GITHUB_REPO/releases/latest"
$REG_KEY = "HKCU:\Software\ChillPass"
$APP_EXE = "chillpass.exe"
$INSTALLER_PATTERN = "ChillPass-Setup-*.exe"
$USER_AGENT = "ChillPass-Updater/1.0"

# ── 读取已安装版本 ────────────────────────────────────────────────
function Get-InstalledVersion {
    try {
        $props = Get-ItemProperty $REG_KEY -ErrorAction Stop
        return $props.Version
    } catch {
        return $null
    }
}

function Get-InstallDir {
    try {
        $props = Get-ItemProperty $REG_KEY -ErrorAction Stop
        return $props.InstallDir
    } catch {
        return $null
    }
}

# ── 版本比较 ──────────────────────────────────────────────────────
function Compare-Version([string]$a, [string]$b) {
    # 去除 v 前缀
    $a = $a -replace '^v', ''
    $b = $b -replace '^v', ''
    $aParts = $a.Split('.') | ForEach-Object { [int]$_ }
    $bParts = $b.Split('.') | ForEach-Object { [int]$_ }
    $maxLen = [Math]::Max($aParts.Count, $bParts.Count)
    for ($i = 0; $i -lt $maxLen; $i++) {
        $aVal = if ($i -lt $aParts.Count) { $aParts[$i] } else { 0 }
        $bVal = if ($i -lt $bParts.Count) { $bParts[$i] } else { 0 }
        if ($aVal -gt $bVal) { return 1 }
        if ($aVal -lt $bVal) { return -1 }
    }
    return 0
}

# ── 检查 GitHub Releases ──────────────────────────────────────────
function Get-LatestRelease {
    param([int]$TimeoutSec = 30)
    try {
        $response = Invoke-RestMethod -Uri $API_URL -Headers @{
            "User-Agent" = $USER_AGENT
            "Accept" = "application/vnd.github+json"
        } -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $response
    } catch {
        # 尝试通过代理
        try {
            $proxyUrl = "https://gh-proxy.com/$API_URL"
            $response = Invoke-RestMethod -Uri $proxyUrl -Headers @{
                "User-Agent" = $USER_AGENT
            } -TimeoutSec $TimeoutSec -ErrorAction Stop
            return $response
        } catch {
            return $null
        }
    }
}

function Find-InstallerAsset {
    param($Release)
    if (-not $Release -or -not $Release.assets) { return $null }
    return $Release.assets | Where-Object { $_.name -like $INSTALLER_PATTERN } | Select-Object -First 1
}

# ── 下载安装程序 ──────────────────────────────────────────────────
function Download-Installer {
    param(
        [string]$Url,
        [string]$OutputPath,
        $ProgressCallback = $null
    )

    # 优先直接下载，失败则通过代理
    $urls = @($Url)
    if ($Url -match '^https://github\.com/') {
        $urls += "https://gh-proxy.com/$Url"
    }

    foreach ($tryUrl in $urls) {
        try {
            if ($ProgressCallback) {
                # 带进度的下载
                $ProgressPreference = 'Continue'
                $task = Invoke-WebRequest -Uri $tryUrl -OutFile $OutputPath -UseBasicParsing `
                    -TimeoutSec 300 -PassThru -ErrorAction Stop
            } else {
                $ProgressPreference = 'SilentlyContinue'
                Invoke-WebRequest -Uri $tryUrl -OutFile $OutputPath -UseBasicParsing `
                    -TimeoutSec 300 -ErrorAction Stop
            }
            if (Test-Path $OutputPath) {
                return $true
            }
        } catch {
            continue
        }
    }
    return $false
}

# ── 执行更新 ──────────────────────────────────────────────────────
function Invoke-Update {
    param(
        [string]$InstallerPath,
        [string]$InstallDir,
        [bool]$Restart = $true
    )

    # 关闭运行中的 ChillPass
    $procs = Get-Process -Name "chillpass" -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # 静默安装
    $args = @("/S")
    $proc = Start-Process -FilePath $InstallerPath -ArgumentList $args -Wait -PassThru -NoNewWindow

    # 清理安装包
    Remove-Item $InstallerPath -Force -ErrorAction SilentlyContinue

    # 重启应用
    if ($Restart -and $InstallDir) {
        $exePath = Join-Path $InstallDir $APP_EXE
        if (Test-Path $exePath) {
            Start-Process $exePath
        }
    }

    return $proc.ExitCode -eq 0
}

# ── CheckOnly 模式 ────────────────────────────────────────────────
if ($CheckOnly) {
    $installedVer = Get-InstalledVersion
    $release = Get-LatestRelease
    if (-not $release) {
        @{ status = "error"; message = "无法获取版本信息" } | ConvertTo-Json
        exit 1
    }
    $latestVer = $release.tag_name
    $asset = Find-InstallerAsset -Release $release
    $hasUpdate = if ($installedVer) { (Compare-Version $latestVer $installedVer) -gt 0 } else { $true }

    @{
        status = "ok"
        installedVersion = $installedVer
        latestVersion = $latestVer
        hasUpdate = $hasUpdate
        downloadUrl = if ($asset) { $asset.browser_download_url } else { $null }
        releaseUrl = $release.html_url
        releaseNotes = $release.body
    } | ConvertTo-Json -Depth 5
    exit 0
}

# ── 静默模式 ──────────────────────────────────────────────────────
if ($Silent) {
    $installedVer = Get-InstalledVersion
    $installDir = Get-InstallDir

    $release = Get-LatestRelease
    if (-not $release) {
        Write-Host "[Updater] 无法检查更新（网络问题）。"
        exit 1
    }

    $latestVer = $release.tag_name
    if ($installedVer -and (Compare-Version $latestVer $installedVer) -le 0) {
        Write-Host "[Updater] 已是最新版本 ($installedVer)。"
        exit 0
    }

    Write-Host "[Updater] 发现新版本: $latestVer (当前: $installedVer)"
    $asset = Find-InstallerAsset -Release $release
    if (-not $asset) {
        Write-Host "[Updater] 未找到安装包，请手动下载: $($release.html_url)"
        exit 1
    }

    $tempFile = Join-Path $env:TEMP "ChillPass-Setup-$latestVer.exe"
    Write-Host "[Updater] 正在下载..."
    $ProgressPreference = 'SilentlyContinue'
    $ok = Download-Installer -Url $asset.browser_download_url -OutputPath $tempFile
    if (-not $ok) {
        Write-Host "[Updater] 下载失败。"
        exit 1
    }

    Write-Host "[Updater] 正在安装更新..."
    $success = Invoke-Update -InstallerPath $tempFile -InstallDir $installDir -Restart $true
    if ($success) {
        Write-Host "[Updater] 更新完成！"
        exit 0
    } else {
        Write-Host "[Updater] 更新失败。"
        exit 1
    }
}

# ── 交互模式（WinForms GUI）──────────────────────────────────────
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Threading

# 创建窗体
$form = New-Object System.Windows.Forms.Form
$form.Text = "ChillPass 更新检查"
$form.Size = New-Object System.Drawing.Size(480, 340)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Icon = [System.Drawing.SystemIcons]::Application
$form.BackColor = [System.Drawing.Color]::FromArgb(245, 247, 250)

# 标题
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "ChillPass 更新检查"
$titleLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.Location = New-Object System.Drawing.Point(20, 15)
$titleLabel.Size = New-Object System.Drawing.Size(440, 35)
$form.Controls.Add($titleLabel)

# 当前版本
$lblCurrent = New-Object System.Windows.Forms.Label
$lblCurrent.Text = "当前版本: 检查中..."
$lblCurrent.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10)
$lblCurrent.Location = New-Object System.Drawing.Point(20, 60)
$lblCurrent.Size = New-Object System.Drawing.Size(440, 25)
$form.Controls.Add($lblCurrent)

# 最新版本
$lblLatest = New-Object System.Windows.Forms.Label
$lblLatest.Text = "最新版本: ---"
$lblLatest.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10)
$lblLatest.Location = New-Object System.Drawing.Point(20, 88)
$lblLatest.Size = New-Object System.Drawing.Size(440, 25)
$form.Controls.Add($lblLatest)

# 状态
$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = ""
$lblStatus.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 9)
$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
$lblStatus.Location = New-Object System.Drawing.Point(20, 120)
$lblStatus.Size = New-Object System.Drawing.Size(440, 40)
$form.Controls.Add($lblStatus)

# 进度条
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(20, 170)
$progressBar.Size = New-Object System.Drawing.Size(440, 20)
$progressBar.Style = "Continuous"
$progressBar.Visible = $false
$form.Controls.Add($progressBar)

# 检查更新按钮
$btnCheck = New-Object System.Windows.Forms.Button
$btnCheck.Text = "检查更新"
$btnCheck.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10)
$btnCheck.Location = New-Object System.Drawing.Point(20, 210)
$btnCheck.Size = New-Object System.Drawing.Size(130, 38)
$btnCheck.FlatStyle = "Flat"
$btnCheck.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
$btnCheck.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($btnCheck)

# 下载并安装按钮
$btnUpdate = New-Object System.Windows.Forms.Button
$btnUpdate.Text = "下载并安装"
$btnUpdate.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10)
$btnUpdate.Location = New-Object System.Drawing.Point(160, 210)
$btnUpdate.Size = New-Object System.Drawing.Size(130, 38)
$btnUpdate.FlatStyle = "Flat"
$btnUpdate.BackColor = [System.Drawing.Color]::FromArgb(0, 153, 76)
$btnUpdate.ForeColor = [System.Drawing.Color]::White
$btnUpdate.Enabled = $false
$btnUpdate.Visible = $false
$form.Controls.Add($btnUpdate)

# 关闭按钮
$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Text = "关闭"
$btnClose.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10)
$btnClose.Location = New-Object System.Drawing.Point(330, 210)
$btnClose.Size = New-Object System.Drawing.Size(130, 38)
$btnClose.FlatStyle = "Flat"
$form.Controls.Add($btnClose)

# 打开下载页面链接
$linkRelease = New-Object System.Windows.Forms.LinkLabel
$linkRelease.Text = "前往 GitHub Releases 页面手动下载"
$linkRelease.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 9)
$linkRelease.Location = New-Object System.Drawing.Point(20, 260)
$linkRelease.Size = New-Object System.Drawing.Size(440, 25)
$linkRelease.LinkColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
$linkRelease.Visible = $false
$form.Controls.Add($linkRelease)

# 全局变量
$script:latestVersion = $null
$script:downloadUrl = $null
$script:releaseUrl = $null
$script:installDir = Get-InstallDir

# 显示当前版本
$installedVer = Get-InstalledVersion
if ($installedVer) {
    $lblCurrent.Text = "当前版本: v$installedVer"
} else {
    $lblCurrent.Text = "当前版本: 未安装"
}

# ── 检查更新按钮事件 ──
$btnCheck.Add_Click({
    $btnCheck.Enabled = $false
    $lblStatus.Text = "正在检查更新..."
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
    $form.Refresh()

    # 在后台线程检查
    $job = Start-Job -ScriptBlock {
        param($apiUrl, $ua)
        try {
            $r = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = $ua; "Accept" = "application/vnd.github+json" } -TimeoutSec 30
            return @{ ok = $true; tag = $r.tag_name; url = $r.html_url; assets = ($r.assets | ForEach-Object { @{ name = $_.name; url = $_.browser_download_url } }) } | ConvertTo-Json -Depth 5
        } catch {
            try {
                $proxyUrl = "https://gh-proxy.com/$apiUrl"
                $r = Invoke-RestMethod -Uri $proxyUrl -Headers @{ "User-Agent" = $ua } -TimeoutSec 30
                return @{ ok = $true; tag = $r.tag_name; url = $r.html_url; assets = ($r.assets | ForEach-Object { @{ name = $_.name; url = $_.browser_download_url } }) } | ConvertTo-Json -Depth 5
            } catch {
                return @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json
            }
        }
    } -ArgumentList $API_URL, $USER_AGENT

    # 等待结果
    $result = Receive-Job $job -Wait -AutoRemoveJob
    $data = $result | ConvertFrom-Json

    if (-not $data.ok) {
        $lblStatus.Text = "检查失败: 网络错误，请稍后重试"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(200, 40, 40)
        $btnCheck.Enabled = $true
        return
    }

    $script:latestVersion = $data.tag
    $script:releaseUrl = $data.url
    $lblLatest.Text = "最新版本: $($data.tag)"

    # 查找安装包
    $asset = $data.assets | Where-Object { $_.name -like $INSTALLER_PATTERN } | Select-Object -First 1
    if ($asset) {
        $script:downloadUrl = $asset.url
    }

    # 比较版本
    if (-not $installedVer) {
        $lblStatus.Text = "未检测到已安装的 ChillPass，可以直接下载安装。"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
        $btnUpdate.Text = "下载并安装"
        $btnUpdate.Enabled = $true
        $btnUpdate.Visible = $true
    } elseif ((Compare-Version $data.tag $installedVer) -gt 0) {
        $lblStatus.Text = "发现新版本！点击「下载并安装」进行更新。"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 153, 76)
        $btnUpdate.Enabled = $true
        $btnUpdate.Visible = $true
    } else {
        $lblStatus.Text = "已是最新版本，无需更新。"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
        $btnUpdate.Visible = $false
    }

    $linkRelease.Visible = $true
    $btnCheck.Enabled = $true
})

# ── 下载并安装按钮事件 ──
$btnUpdate.Add_Click({
    if (-not $script:downloadUrl) {
        $lblStatus.Text = "未找到安装包，请手动下载。"
        $linkRelease.Visible = $true
        return
    }

    $btnUpdate.Enabled = $false
    $btnCheck.Enabled = $false
    $progressBar.Visible = $true
    $progressBar.Style = "Marquee"
    $lblStatus.Text = "正在下载安装程序..."
    $form.Refresh()

    $tempFile = Join-Path $env:TEMP "ChillPass-Setup-$($script:latestVersion).exe"

    # 在后台下载
    $dlJob = Start-Job -ScriptBlock {
        param($url, $outFile)
        $ProgressPreference = 'SilentlyContinue'
        $urls = @($url)
        if ($url -match '^https://github\.com/') {
            $urls += "https://gh-proxy.com/$url"
        }
        foreach ($u in $urls) {
            try {
                Invoke-WebRequest -Uri $u -OutFile $outFile -UseBasicParsing -TimeoutSec 300 -ErrorAction Stop
                if (Test-Path $outFile) { return $true }
            } catch { continue }
        }
        return $false
    } -ArgumentList $script:downloadUrl, $tempFile

    # 等待下载完成
    $dlResult = Receive-Job $dlJob -Wait -AutoRemoveJob

    if (-not $dlResult) {
        $progressBar.Visible = $false
        $lblStatus.Text = "下载失败，请检查网络或手动下载。"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(200, 40, 40)
        $btnUpdate.Enabled = $true
        $btnCheck.Enabled = $true
        $linkRelease.Visible = $true
        return
    }

    $progressBar.Style = "Continuous"
    $progressBar.Value = 100
    $lblStatus.Text = "下载完成，正在安装更新..."
    $form.Refresh()

    # 执行更新
    $success = Invoke-Update -InstallerPath $tempFile -InstallDir $script:installDir -Restart $true

    $progressBar.Visible = $false
    if ($success) {
        $lblStatus.Text = "更新完成！ChillPass 已重新启动。"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 153, 76)
        $btnUpdate.Visible = $false
        $btnCheck.Enabled = $true
        # 更新当前版本显示
        $newVer = Get-InstalledVersion
        if ($newVer) { $lblCurrent.Text = "当前版本: v$newVer" }
    } else {
        $lblStatus.Text = "更新失败，请尝试手动下载安装。"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(200, 40, 40)
        $btnUpdate.Enabled = $true
        $btnCheck.Enabled = $true
        $linkRelease.Visible = $true
    }
})

# ── 链接事件 ──
$linkRelease.Add_LinkClicked({
    if ($script:releaseUrl) {
        Start-Process $script:releaseUrl
    } else {
        Start-Process "https://github.com/$GITHUB_REPO/releases"
    }
})

# ── 关闭按钮事件 ──
$btnClose.Add_Click({
    $form.Close()
})

# 自动检查一次
$form.Add_Shown({
    $form.Refresh()
    $btnCheck.PerformClick()
})

# 显示窗体
[System.Windows.Forms.Application]::Run($form)
