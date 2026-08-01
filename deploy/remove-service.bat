@echo off
cd /d "%~dp0.."
set SERVICE_NAME=ChillPassWeb
set NSSM=%~dp0nssm.exe

if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found.
    pause
    exit /b 1
)

echo [INFO] Stopping service...
%NSSM% stop %SERVICE_NAME%

echo [INFO] Removing service...
%NSSM% remove %SERVICE_NAME% confirm

echo [INFO] Service removed.
pause