@echo off
cd /d "%~dp0.."
set SERVICE_NAME=ChillPassWeb
set NSSM=%~dp0nssm.exe

if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found.
    echo   Download from: https://nssm.cc/release/nssm-2.24.zip
    echo   Extract and copy win64\nssm.exe to deploy\ folder
    pause
    exit /b 1
)

echo [INFO] Installing Windows service...
%NSSM% install %SERVICE_NAME% "node" "%~dp0..\server\src\index.js"
%NSSM% set %SERVICE_NAME% AppDirectory "%~dp0.."
%NSSM% set %SERVICE_NAME% DisplayName "ChillPass Web Service"
%NSSM% set %SERVICE_NAME% Description "ChillPass exam prep assistant - LAN sharing service"
%NSSM% set %SERVICE_NAME% Start SERVICE_AUTO_START
%NSSM% set %SERVICE_NAME% AppStdout "%~dp0..\logs\chillpass-stdout.log"
%NSSM% set %SERVICE_NAME% AppStderr "%~dp0..\logs\chillpass-stderr.log"
%NSSM% set %SERVICE_NAME% AppRotateFiles 1
%NSSM% set %SERVICE_NAME% AppRotateBytes 10485760

echo [INFO] Service installed. Starting...
%NSSM% start %SERVICE_NAME%

echo [INFO] Service status:
%NSSM% status %SERVICE_NAME%
echo.
echo [INFO] Service installed and running. It will auto-start on reboot.
pause