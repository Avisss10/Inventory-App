@echo off
title Build Inventory-App

echo.
echo ========================================
echo   BUILD INVENTORY-APP.EXE
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Cek pkg...
call npx pkg --version >nul 2>&1
if %errorlevel% neq 0 (
    echo pkg tidak ditemukan, install dulu...
    call npm install -g pkg
)

echo [2/3] Compile exe...
call npx pkg . --output "../Inventory-App.exe"

if %errorlevel% neq 0 (
    echo.
    echo [GAGAL] Compile gagal! Cek error di atas.
    pause
    exit /b 1
)

echo [3/3] Selesai!
echo.
echo File: %~dp0Inventory-App.exe
echo.
echo ========================================
echo   PASTIKAN folder "frontend" ada
echo   di samping Inventory-App.exe
echo ========================================
echo.
pause
