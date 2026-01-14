@echo off
cd /d "%~dp0"
title Borsa Uygulamasi - Kurulum Dosyasi Olusturucu
color 0f

echo ==========================================
echo KURULUM DOSYASI OLUSTURUCU
echo ==========================================
echo.

:: 1. Inno Setup Kontrolu
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
) else (
    color 4f
    echo [HATA] Inno Setup bulunamadi!
    echo.
    echo Lutfen once Inno Setup programini indirip kurun:
    echo https://jrsoftware.org/isdl.php
    echo.
    pause
    start https://jrsoftware.org/isdl.php
    exit /b
)

:: 2. BorsaApp.exe Kontrolu
if not exist "BorsaApp.exe" (
    echo [BILGI] BorsaApp.exe bulunamadi, once derleme yapiliyor...
    call build_app.bat
    if errorlevel 1 (
        echo [HATA] Derleme basarisiz oldu.
        pause
        exit /b
    )
)

:: 3. Kurulum Dosyasini Olustur
echo.
echo [BILGI] Setup dosyasi hazirlaniyor...
"%ISCC%" setup.iss

if errorlevel 1 (
    color 4f
    echo.
    echo [HATA] Kurulum dosyasi olusturulurken hata oldu.
    pause
    exit /b
)

:: 4. Dosyayi Ana Dizine Tasi
if exist "Output\BorsaApp_Kurulum.exe" (
    move /Y "Output\BorsaApp_Kurulum.exe" "BorsaApp_Kurulum.exe"
    rmdir "Output" >nul 2>&1
)

echo.
color 2f
echo ==========================================
echo ISLEM BASARILI!
echo ==========================================
echo "BorsaApp_Kurulum.exe" dosyasi ana klasorde olusturuldu.
explorer /select,"BorsaApp_Kurulum.exe"
pause