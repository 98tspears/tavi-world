@echo off
setlocal
cd /d "%~dp0"
if not exist "game\index.html" (
 echo [ERROR] Tavi World game files are missing.
 echo Right-click the ZIP and choose Extract All, then run this file from the extracted folder.
 pause
 exit /b 1
)
echo Starting Tavi World. Keep this window open while playing.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-TaviWorld.ps1"
echo.
echo If Tavi World did not open, read OPEN-ME-FIRST.txt.
pause