@echo off
setlocal
title Borsa Uygulamasi Kurulumu

echo ==========================================
echo Borsa Uygulamasi - Ilk Kurulum
echo ==========================================
echo.

:: Bulundugumuz dizine git
cd /d "%~dp0"

:: 1. Node.js Kontrolu
echo [1/2] Node.js kontrol ediliyor...
node -v >nul 2>&1
if %errorlevel% neq 0 goto NODE_NOT_FOUND

echo [OK] Node.js bulundu.
echo.

:: 2. Bagimliliklari Yukle
echo [2/2] Gerekli kutuphaneler yukleniyor (npm install)...
echo Bu islem internet hizina gore birkac dakika surebilir...
echo.

call npm install
if %errorlevel% neq 0 goto NPM_ERROR

echo.
color 2f
echo ==========================================
echo ISLEM BASARIYLA TAMAMLANDI!
echo ==========================================
echo Artik uygulamayi calistirabilirsiniz.
pause
exit /b

:NODE_NOT_FOUND
color 4f
echo.
echo [HATA] Node.js bilgisayarinizda yuklu degil veya bulunamadi!
echo.
echo Bu uygulamanin calismasi icin Node.js gereklidir.
echo Otomatik olarak indirme sayfasi aciliyor...
echo Lutfen "LTS" surumunu indirip kurun.
echo Kurulum bittikten sonra bu dosyayi tekrar calistirin.
echo.
timeout /t 5
start "" "https://nodejs.org/"
pause
exit /b

:NPM_ERROR
color 4f
echo.
echo [HATA] Kutuphaneler yuklenirken bir sorun olustu.
echo Internet baglantinizi kontrol edip tekrar deneyin.
echo Eger hata devam ederse, Node.js'i yeniden yuklemeyi deneyin.
pause
exit /b