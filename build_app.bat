@echo off
set "PROJECT_ROOT=%~dp0"
set "ICON_PATH=%PROJECT_ROOT%icon.ico"

echo ==========================================
echo 0. Gerekli Kutuphaneler Yukleniyor...
echo ==========================================
cd /d "%PROJECT_ROOT%"

echo NPM paketleri yukleniyor (Bu islem biraz surebilir)...
call npm install
if %errorlevel% neq 0 (
    echo HATA: NPM install basarisiz oldu. Node.js yuklu mu?
    pause
    exit /b %errorlevel%
)

echo.
echo PyInstaller ve Python kutuphaneleri yukleniyor...
pip install PyInstaller flask flask-cors yfinance

echo.
echo ==========================================
echo 1. React Uygulamasi Derleniyor (Build)...
echo ==========================================
call npm run build
if %errorlevel% neq 0 (
    echo HATA: React build islemi basarisiz oldu.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo 2. EXE Dosyasi Olusturuluyor...
echo ==========================================
cd chart_server

if exist "%ICON_PATH%" (
    echo Ozel ikon bulundu: %ICON_PATH%
    call pyinstaller --noconfirm --onefile --windowed --name "BorsaApp" --add-data "../dist;dist" --icon="%ICON_PATH%" app.py
) else (
    echo Ozel ikon bulunamadi, varsayilan ikon kullaniliyor...
    call pyinstaller --noconfirm --onefile --windowed --name "BorsaApp" --add-data "../dist;dist" --icon=NONE app.py
)

echo.
echo 3. Dosya Ana Dizine Tasiniyor...
move /Y "dist\BorsaApp.exe" "%PROJECT_ROOT%BorsaApp.exe"

echo.
echo ISLEM TAMAMLANDI! BorsaApp.exe ana klasore tasindi.
cd /d "%PROJECT_ROOT%"
start "" "."
pause