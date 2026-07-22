@echo off
title Stop SciScribe Server
echo Checking for running SciScribe / Vite servers on port 5173...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R /C:":5173 " 2^>nul') do (
    echo Stopping server (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
    echo SciScribe server stopped successfully.
)

echo Done.
timeout /t 3 >nul
