#!/usr/bin/env bash
# macOS double-clickable launcher for SciScribe

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$PATH"
[ -f ~/.zshrc ] && source ~/.zshrc >/dev/null 2>&1 || true
[ -f ~/.bash_profile ] && source ~/.bash_profile >/dev/null 2>&1 || true

# Change directory to exact location of this script
cd "$(dirname "$0")"

echo "==================================================="
echo "            SciScribe (macOS Launcher)             "
echo "==================================================="

# Check if server is already running on port 5173
if nc -z localhost 5173 2>/dev/null || curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "SciScribe server is already running on port 5173."
    echo "Opening your default web browser..."
    open http://localhost:5173
    echo "==================================================="
    exit 0
fi

echo "Starting local web server..."
npm run dev &
SERVER_PID=$!

echo "Waiting for server to become ready..."
for i in $(seq 1 30); do
    if nc -z localhost 5173 2>/dev/null || curl -s http://localhost:5173 >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

echo "Opening http://localhost:5173 in your default web browser..."
open http://localhost:5173

echo "==================================================="
echo " SciScribe is running! (Process ID: $SERVER_PID)"
echo " Keep this Terminal window open while using SciScribe,"
echo " or press Ctrl+C to shut down the server when done."
echo "==================================================="

# Keep script running so Ctrl+C stops the background server
wait $SERVER_PID
