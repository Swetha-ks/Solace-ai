@echo off
title Solace AI launcher
cd /d "%~dp0"

echo ==========================================
echo   Solace AI - starting everything up...
echo ==========================================
echo.

echo [1/2] Starting the backend (API + database)...
start "Solace API" cmd /k "cd /d "%~dp0server" && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting the mobile app (Expo)...
echo.
echo   In the next window:
echo     - press  w  to open it in your browser
echo     - or scan the QR code with Expo Go on your phone
echo.
call npx expo start

pause
