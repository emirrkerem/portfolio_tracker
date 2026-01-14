@echo off
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ==========================================
echo Git Deposu Guncelleniyor...
echo ==========================================

echo.
echo [BILGI] Gonderilecek Git Adresi (Remote URL):
git remote get-url origin

echo.
echo Adres dogruysa devam etmek icin bir tusa basin...
echo (Yanlissa pencereyi kapatin)
pause >nul

echo.
echo 1. Degisiklikler ekleniyor (git add)...
git add .

echo.
echo 2. Degisiklikler kaydediliyor (git commit)...
set /p commit_msg="Commit mesaji girin (Varsayilan: Guncelleme): "
if "%commit_msg%"=="" set commit_msg=Guncelleme
git commit -m "%commit_msg%"

echo.
echo 3. Uzak sunucuya gonderiliyor (git push)...
git push

echo.
echo ISLEM TAMAMLANDI!
pause