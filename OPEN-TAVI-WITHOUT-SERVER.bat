@echo off
cd /d "%~dp0"
if not exist "game\index.html" (echo Missing files. Extract the entire ZIP first.& pause & exit /b 1)
echo Opening offline preview. Ollama connection requires START-TAVI-WORLD.bat.
echo NOTE: Browser storage differs between file and localhost; this preview does not read the server save.
start "" "%~dp0game\index.html"