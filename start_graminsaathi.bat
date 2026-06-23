@echo off
title Gramin Saathi - Python Backend (Port 8000)
echo =====================================================
echo  Gramin Saathi - Local Python Backend Starting
echo  Local API URL: http://localhost:8000
echo =====================================================
echo.

cd /d "%~dp0..\GraminSaathi\backend"
"%~dp0..\GraminSaathi\venv\Scripts\uvicorn.exe" main:app --port 8000
pause
