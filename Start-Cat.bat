@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Nie znaleziono Pythona. Zbuduj instalator przez build_windows.ps1 albo zainstaluj Pythona ze strony python.org.
  pause
  exit /b 1
)
py -3 cat_app.py
if errorlevel 1 pause
