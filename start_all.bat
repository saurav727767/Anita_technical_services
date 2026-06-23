@echo off
title Anita Technical Services - Unified Runner
echo =======================================================
echo  Starting Anita Technical Services & Gramin Saathi Services
echo =======================================================
echo.

:: Add Node.js paths explicitly to env path
set PATH=C:\Program Files\nodejs;C:\Users\saura\AppData\Roaming\npm;%PATH%

echo Starting Main Express Server in a new window (Port 3000)...
start "Anita Tech Express Server" cmd /k "cd /d "%~dp0" && set PATH=C:\Program Files\nodejs;%PATH% && node server.js"

echo Starting Gramin Saathi FastAPI Backend in a new window (Port 8000)...
start "Gramin Saathi Python Backend" "%~dp0start_graminsaathi.bat"
