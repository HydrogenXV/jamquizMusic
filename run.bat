@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Starting SpotiQuiz on http://localhost:3001...
npm.cmd start
pause
