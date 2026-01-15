@echo off
title Hata Kayitlarini Bulucu
echo ==================================================
echo HATA KAYITLARI ARANIYOR...
echo ==================================================

set "FOUND=0"

:: 1. Masaustu Raporu (Kritik Cokmeler)
set "DESKTOP_REPORT=%USERPROFILE%\Desktop\BORSA_HATA_RAPORU.txt"
if exist "%DESKTOP_REPORT%" (
    echo [BULUNDU] KRITIK HATA: Masaustunde rapor var!
    echo Dosya: %DESKTOP_REPORT%
    start notepad "%DESKTOP_REPORT%"
    set "FOUND=1"
)

:: 2. AppData Loglari (Kurulum Sonrasi Calisma)
set "APP_LOG=%APPDATA%\BorsaApp\storage\app_errors.log"
if exist "%APP_LOG%" (
    echo [BULUNDU] LOG: AppData klasorunde loglar var.
    echo Dosya: %APP_LOG%
    start notepad "%APP_LOG%"
    set "FOUND=1"
)

:: 3. Proje Loglari (Gelistirme Modu)
set "DEV_LOG=%~dp0..\storage\app_errors.log"
if exist "%DEV_LOG%" (
    echo [BULUNDU] LOG: Proje klasorunde loglar var.
    echo Dosya: %DEV_LOG%
    start notepad "%DEV_LOG%"
    set "FOUND=1"
)

if "%FOUND%"=="0" (
    echo [BILGI] Hicbir hata kaydi bulunamadi.
    echo Uygulama sessizce kapanmis veya henuz log olusmamis olabilir.
    echo.
    echo Eger tarayici penceresi hala aciksa ve beyaz ekrandaysa:
    echo Lutfen tarayicida F12 tusuna basip "Console" sekmesine bakin.
)

echo.
echo Islem tamamlandi.
pause
