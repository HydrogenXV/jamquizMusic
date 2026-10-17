@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Starting SpotiQuiz Dev Server...
npm.cmd run dev
pause
