#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "============================================"
echo "  APLYD Website - Local Preview Launcher"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "[!] Node.js was not found on this computer."
  echo "    Install it from https://nodejs.org (LTS version), then run this script again."
  echo ""
  exit 1
fi

# Build if needed
if [ ! -f "dist/index.html" ]; then
  echo "[*] No build found yet - preparing the site. This only happens once."
  echo ""

  if [ ! -d "node_modules" ]; then
    echo "[*] Installing dependencies, this may take a few minutes..."
    npm install
  fi

  echo "[*] Building the site..."
  npm run build
fi

echo ""
echo "[*] Starting local server at http://localhost:4321 ..."
echo "    Keep this window open while you browse the site."
echo "    Press Ctrl+C here to stop the server."
echo ""

npx --yes serve dist -l 4321 &
SERVER_PID=$!

sleep 3
open "http://localhost:4321" 2>/dev/null || echo "Please open http://localhost:4321 in your browser"

# Keep the server running
wait $SERVER_PID
