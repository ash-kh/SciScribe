@echo off
setlocal enabledelayedexpansion
title SciScribe Windows Launcher

:: Set working directory to script folder
cd /d "%~dp0"

echo ===================================================
echo             SciScribe (Windows Launcher)          
echo ===================================================

:: Check if server is already running on port 5173
netstat -o -n -a | findstr /R /C:":5173 " >nul 2>&1
if %errorlevel% equ 0 (
    echo SciScribe server is already running on port 5173.
    echo Opening your default web browser...
    start http://localhost:5173
    exit /b 0
)

echo Starting local web server...
start /min "SciScribe Dev Server" npm run dev

echo Waiting for server to become ready...
:wait_loop
timeout /t 1 /nobreak >nul
netstat -o -n -a | findstr /R /C:":5173 " >nul 2>&1
if %errorlevel% neq 0 (
    set /a attempts+=1
    if !attempts! lss 15 goto wait_loop
)

echo Opening http://localhost:5173 in your default web browser...
start http://localhost:5173

echo ===================================================
echo  SciScribe is running!
echo  You can close this window or use Stop-SciScribe.bat
echo ===================================================
timeout /t 3 >nul
