@echo off
REM ===========================================================================
REM  MalCard dev -- fallback stop (Windows)
REM
REM  start.bat already stops everything on Ctrl+C. Use this only if something was
REM  left running (e.g. the start window was force-closed): it kills whatever is
REM  listening on the backend (8000) and frontend (5173) ports and any leftover
REM  cloudflared tunnel.
REM ===========================================================================
setlocal enabledelayedexpansion
for %%P in (8000 5173) do (
  set "FOUND="
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
    echo [stop] port %%P -^> PID %%a
    taskkill /F /PID %%a >nul 2>&1
    set "FOUND=1"
  )
  if not defined FOUND echo [stop] port %%P: nothing listening
)
taskkill /F /IM cloudflared.exe >nul 2>&1 && echo [stop] cloudflared stopped
echo [stop] done.
endlocal
