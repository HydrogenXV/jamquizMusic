@echo off
set PATH=C:\Users\lucia\.gemini\tools\mingit\cmd;%PATH%
cd /d "%~dp0"

echo ========================================================
echo   SpotiQuiz - Push to GitHub (HydrogenXV/jamquizMusic)
echo ========================================================
echo.

git remote set-url origin https://github.com/HydrogenXV/jamquizMusic.git 2>nul || git remote add origin https://github.com/HydrogenXV/jamquizMusic.git
git add .
git commit -m "Update SpotiQuiz game files" 2>nul

echo.
echo Connecting to GitHub repository...
echo.
git push -u origin main
echo.
echo ========================================================
pause
