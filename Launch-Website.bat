@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   APLYD Website - Local Preview Launcher
echo ============================================
echo.

where node >nul 2>nul
if not errorlevel 1 goto node_ok
echo [!] Node.js was not found on this computer.
echo     Install it from https://nodejs.org (LTS version), then double-click this file again.
echo.
pause
exit /b 1

:node_ok
if exist "dist\index.html" goto build_ok

echo [*] No build found yet - preparing the site. This only happens once.
echo.
if exist "node_modules" goto do_build
echo [*] Installing dependencies, this may take a few minutes...
call npm install
if not errorlevel 1 goto do_build
echo.
echo [!] npm install failed. See the errors above.
pause
exit /b 1

:do_build
echo [*] Building the site...
call npm run build
if not errorlevel 1 goto build_ok
echo.
echo [!] Build failed. See the errors above.
pause
exit /b 1

:build_ok
echo.
echo [*] Starting local server at http://localhost:4321 ...
echo     Keep this window open while you browse the site.
echo     Press Ctrl+C here (then close the window) to stop the server.
echo.

start /b "" npx --yes serve dist -l 4321
timeout /t 3 /nobreak >nul
start "" http://localhost:4321

pause >nul
