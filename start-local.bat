@echo off
setlocal
cd /d "%~dp0"
rem Prefer npm shipped with Node.js over a stale global npm shim.
set "ADDBALL_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined ADDBALL_NODE set "ADDBALL_NODE=%%N"
if not defined ADDBALL_NODE (
  echo Node.js is required. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
for %%N in ("%ADDBALL_NODE%") do set "ADDBALL_NPM=%%~dpNnode_modules\npm\bin\npm-cli.js"
if not exist "%ADDBALL_NPM%" (
  echo npm was not found next to Node.js. Please repair your Node.js LTS installation.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  echo Installing dependencies...
  "%ADDBALL_NODE%" "%ADDBALL_NPM%" ci
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
echo Starting AddBall at http://127.0.0.1:5173
echo Keep this window open while playing. Close it to stop the server.
"%ADDBALL_NODE%" "%ADDBALL_NPM%" run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
if errorlevel 1 (
  echo Startup failed. If port 5173 is in use, close the previous server and retry.
  pause
)
