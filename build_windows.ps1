$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "=== CAT — KITTY EDITION 1.0.0: build Windows ===" -ForegroundColor Cyan

$PyLauncher = Get-Command py -ErrorAction SilentlyContinue
$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $PyLauncher -and -not $Python) {
    throw "Nie znaleziono Pythona. Zainstaluj stabilną wersję z https://www.python.org/downloads/windows/ i zaznacz opcję PATH."
}

if ($PyLauncher) {
    & py -3 -m venv .venv
} else {
    & python -m venv .venv
}
if ($LASTEXITCODE -ne 0) { throw "Nie udało się utworzyć środowiska Python (.venv)." }
$VenvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) { throw "Nie udało się utworzyć środowiska .venv" }

& $VenvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "Aktualizacja pip nie powiodła się." }
& $VenvPython -m pip install pyinstaller pillow
if ($LASTEXITCODE -ne 0) { throw "Instalacja PyInstaller/Pillow nie powiodła się." }
& $VenvPython build_extension.py all
if ($LASTEXITCODE -ne 0) { throw "Nie udało się zbudować profili rozszerzenia Chromium/Firefox." }
& $VenvPython -m unittest discover -s tests -v
if ($LASTEXITCODE -ne 0) { throw "Testy projektu nie przeszły — zatrzymuję budowanie." }

if (Test-Path "dist\CatKittyEdition") { Remove-Item "dist\CatKittyEdition" -Recurse -Force }
if (Test-Path "build\pyinstaller") { Remove-Item "build\pyinstaller" -Recurse -Force }
& $VenvPython -m PyInstaller --noconfirm --clean --windowed --onedir `
    --name CatKittyEdition `
    --icon "assets\cat.ico" `
    --distpath "dist" `
    --workpath "build\pyinstaller" `
    "cat_app.py"
if ($LASTEXITCODE -ne 0) { throw "PyInstaller nie zbudował aplikacji (kod $LASTEXITCODE)." }

$Bundle = Join-Path $ProjectRoot "dist\CatKittyEdition"
Copy-Item "assets" (Join-Path $Bundle "assets") -Recurse -Force
Copy-Item "browser-extension" (Join-Path $Bundle "browser-extension") -Recurse -Force
Copy-Item "README_PL.md" (Join-Path $Bundle "README_PL.md") -Force
Copy-Item "SECURITY.md" (Join-Path $Bundle "SECURITY.md") -Force

Write-Host "Aplikacja została zbudowana: $Bundle" -ForegroundColor Green

$IsccPath = $null
$IsccCommand = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if ($IsccCommand) { $IsccPath = $IsccCommand.Source }
if (-not $IsccPath) {
    $Candidates = @(
        "$env:ProgramFiles(x86)\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    )
    foreach ($Candidate in $Candidates) {
        if (Test-Path $Candidate) { $IsccPath = $Candidate; break }
    }
}
if ($IsccPath) {
    New-Item -ItemType Directory -Force -Path "dist-installer" | Out-Null
    & $IsccPath "/DSourceDir=$Bundle" "installer\CatKittyEdition.iss"
    if ($LASTEXITCODE -ne 0) { throw "Inno Setup nie zbudował instalatora (kod $LASTEXITCODE)." }
    Write-Host "Instalator jest w dist-installer\Cat-Kitty-Edition-Setup-1.0.0.exe" -ForegroundColor Green
} else {
    Write-Warning "Nie znaleziono Inno Setup. Aplikacja jest w dist\CatKittyEdition, ale Setup.exe nie został utworzony. Zainstaluj Inno Setup i uruchom skrypt ponownie."
}
