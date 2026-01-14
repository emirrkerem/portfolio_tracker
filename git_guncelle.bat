@echo off
cd /d "%~dp0"
title Git Guncelleme Araci
color 0f

:: Uzak sunucu adresini tanimla
git remote remove origin >nul 2>&1
git remote add origin https://github.com/emirrkerem/portfolio_tracker.git

echo ==========================================
echo GIT GUNCELLEME ARACI
echo ==========================================
echo.
echo [BILGI] Mevcut degisiklikler:
git status -s
echo.
echo ------------------------------------------
echo Hangi dosyalari eklemek istersiniz?
echo   .       -> Tum dosyalari ekler (Varsayilan)
echo   *.tsx   -> Sadece .tsx dosyalarini ekler
echo   *.css   -> Sadece .css dosyalarini ekler
echo ------------------------------------------
echo.

set /p TARGET="Eklenecekler (Bos birakirsaniz hepsi eklenir): "
if "%TARGET%"=="" set TARGET=.

echo.
echo [1/3] Dosyalar ekleniyor (%TARGET%)...
git add %TARGET%

echo.
set /p MSG="[2/3] Commit mesaji girin: "
if "%MSG%"=="" set MSG="Guncelleme"

git commit -m "%MSG%"

echo.
echo [3/3] Uzak sunucuya gonderiliyor (Push)...
git push -u origin HEAD

echo.
echo Islem tamamlandi.
pause