param(
    [int]$ParentPid,
    [string]$Url,
    [string]$Icon
)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ni = New-Object System.Windows.Forms.NotifyIcon
if ($Icon -and (Test-Path $Icon)) {
    $ni.Icon = New-Object System.Drawing.Icon($Icon)
} else {
    $ni.Icon = [System.Drawing.SystemIcons]::Application
}
$ni.Text = "ChillPass"
$ni.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$open = $menu.Items.Add("Open in Browser")
$quit = $menu.Items.Add("Quit")

$open.Add_Click({
    Start-Process $Url
})

$quit.Add_Click({
    $ni.Visible = $false
    try { Stop-Process -Id $ParentPid -Force } catch {}
    [System.Windows.Forms.Application]::Exit()
})

$ni.ContextMenuStrip = $menu

# Auto-disappear when parent (server) process exits
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2000
$timer.Add_Tick({
    if (-not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) {
        $ni.Visible = $false
        $timer.Stop()
        [System.Windows.Forms.Application]::Exit()
    }
})
$timer.Start()

[System.Windows.Forms.Application]::Run()
$ni.Visible = $false
$ni.Dispose()
