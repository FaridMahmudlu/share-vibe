@echo off
REM ShareVibe Automatic Deployment Script for Windows
REM This batch file orchestrates the entire deployment process

setlocal enabledelayedexpansion

echo.
echo =========================================
echo   ShareVibe VDS Deployment Automation
echo =========================================
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo ERROR: package.json not found. Are you in the ShareVibe directory?
    pause
    exit /b 1
)

echo [1/3] Building production bundle...
call npm run build

if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [2/3] Production build complete. Ready to deploy.
echo.
echo =========================================
echo   DEPLOYMENT CONFIGURATION
echo =========================================
echo Server: 185.34.101.235
echo Domain: https://sharevibe.co
echo Deploy Path: /var/www/sharevibe/html/
echo.

echo [3/3] Starting deployment script...
echo.

REM Run PowerShell deployment script
powershell -NoProfile -ExecutionPolicy Bypass -File ".\deploy.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo =========================================
echo   DEPLOYMENT SUCCESSFUL!
echo =========================================
echo.
echo Your site is now live at:
echo   https://sharevibe.co
echo.
echo Admin panel:
echo   https://sharevibe.co/?screen=owner
echo.
pause
