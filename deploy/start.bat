@echo off
cd /d "%~dp0.."
title ChillPass Web Server

echo ============================================
echo   ChillPass Web Server Launcher
echo ============================================
echo.

REM Build frontend if dist is missing
if not exist "dist\index.html" (
    echo [INFO] Building frontend...
    call npx.cmd vite build
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Frontend build failed!
        pause
        exit /b 1
    )
    echo [INFO] Frontend build complete.
)

echo [INFO] Starting ChillPass server...
echo [INFO] Port: 3001
echo [INFO] Local:  http://localhost:3001
echo [INFO] Press Ctrl+C to stop.
echo.

node server\src\index.js

pause