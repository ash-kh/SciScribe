#!/usr/bin/env bash
# macOS double-clickable script to stop SciScribe background server

echo "Checking for running SciScribe / Vite servers on port 5173..."
PID=$(lsof -ti:5173 2>/dev/null)

if [ -z "$PID" ]; then
    echo "No SciScribe server is currently running on port 5173."
else
    echo "Stopping server (PID: $PID)..."
    kill -9 $PID 2>/dev/null
    echo "SciScribe server stopped successfully."
fi

echo "You can close this window."
sleep 3
