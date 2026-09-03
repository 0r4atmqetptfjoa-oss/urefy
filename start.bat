@echo off
title Aetheris Sovereign Platform Launcher
echo ======================================================================
echo    A E T H E R I S   S O V E R E I G N   P L A T F O R M
echo    Zero-Knowledge, Zero-Trust Hybrid Communication & Archival
echo ======================================================================
echo.

echo Starting Aetheris Edge Server on port 4000...
start "Aetheris Edge Server" cmd /k "npm run server"

timeout /t 2 /nobreak >nul

echo Starting Aetheris Autonomous Archivist Daemon...
start "Aetheris Archivist Daemon" cmd /k "npm run daemon"

timeout /t 2 /nobreak >nul

echo Starting Aetheris Sovereign Client UI on port 3000...
start "Aetheris Client UI" cmd /k "npm run client"

echo.
echo ======================================================================
echo   Aetheris is fully running!
echo   Open your browser at: http://localhost:3000
echo   WebSocket Relay at:   ws://localhost:4000
echo ======================================================================
pause
