@echo off
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ==========================================
echo Borsa Uygulamasi - Ilk Kurulum
echo ==========================================

:: 1. Node.js Kontrolu
echo.
echo [1/2] Node.js kontrol ediliyor...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js bilgisayarinizda yuklu degil!
    echo.
    echo Bu uygulamanin calismasi icin Node.js gereklidir.
    echo Otomatik olarak indirme sayfasi aciliyor...
    echo Lutfen "LTS" surumunu indirip kurun (Next > Next diyerek).
    echo Kurulum bittikten sonra bu dosyayi tekrar calistirin.
    echo.
    timeout /t 5
    start https://nodejs.org/
    pause
    exit
)
echo [OK] Node.js bulundu.

:: 2. Bagimliliklari Yukle
echo.
echo [2/2] Gerekli kutuphaneler yukleniyor (npm install)...
echo Bu islem internet hizina gore birkac dakika surebilir...
call npm install

echo.
echo ISLEM TAMAMLANDI! Artik uygulamayi calistirabilirsiniz.
pause
