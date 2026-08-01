@echo off
chcp 65001 >nul 2>&1
echo ============================================
echo  ChillPass Firewall Port 3001 Opener
echo ============================================
echo.

:: Check admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Need admin permission!
    echo Right-click this file, select "Run as administrator"
    pause
    exit /b 1
)

echo [INFO] Adding firewall rule for port 3001...
netsh advfirewall firewall add rule name="ChillPass Web Port 3001" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1

if %errorLevel% equ 0 (
    echo [OK] Firewall rule added successfully!
    echo [OK] Other devices on the same network can now access:
    echo      http://10.250.149.202:3001
) else (
    echo [WARN] Rule may already exist or failed to add.
)

echo.
echo Press any key to close...
pause >nul
