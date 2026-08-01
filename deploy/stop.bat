@echo off
cd /d "%~dp0.."
set SERVICE_NAME=ChillPassWeb
set NSSM=%~dp0nssm.exe

if exist "%NSSM%" (
    %NSSM% stop %SERVICE_NAME%
    echo [INFO] Service %SERVICE_NAME% stopped.
) else (
    echo [INFO] NSSM not found. Close the server window manually.
)
pause