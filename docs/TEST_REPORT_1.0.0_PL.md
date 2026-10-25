# Raport walidacji wydania — CAT 1.0.0 Stable

Data przebiegu: 25 października 2026 r.

## Wyniki automatyczne

- Testy Python (`unittest`): **40/40 zaliczone**.
- Testy kontraktów runtime JavaScript: **PASS**.
- Kontrola składni Node.js dla service workera, detektora, Cleanera, `options.js` i `popup.js`: **5/5 zaliczone**.
- Release Gate: **121 kontroli, 0 błędów**.
- Profile zbudowane: Chromium, Chromium release copy i Firefox experimental.
- Test syntetyczny odświeżenia 300 reguł: około **14 ms** w tym środowisku; nie stanowi gwarancji wydajności w każdej przeglądarce.
- Weryfikacja archiwów ZIP oraz SHA-256: wykonywana po pakowaniu, a jej wyniki zapisano w pliku `Cat-Kitty-Edition-1.0.0-SHA256SUMS.txt`.

## Zakres Release Gate

Gate weryfikuje wersje `VERSION` / `package.json` / kontraktów / manifestów, kompletność odwołań do plików, unikalność i podstawową strukturę reguł DNR, zestaw uprawnień, brak stałych uprawnień hosta, opcjonalne hosty HTTPS, zgodność wygenerowanych profili ze źródłami, bezpieczne pobieranie list, brak `innerHTML` w UI, odwracalność Cleaner, kontrakty prywatności oraz obecność checklisty przeglądarkowej i CI Windows/Linux.

Raport maszynowy: `dist/RELEASE_GATE_1.0.0.json`.

## Testy, których nie wykonano

**Nie wykonano testu end-to-end rozszerzenia w rzeczywistym Chrome, Edge ani Firefox w tym przebiegu.** Testy runtime używają atrap API rozszerzenia, a statyczny Release Gate nie uruchamia stron internetowych w przeglądarce. Nie oznaczaj testów przeglądarkowych jako PASS bez wykonania procedury `docs/BROWSER_REGRESSION_1.0.0_PL.md` na konkretnym systemie i wersji przeglądarki.

Nie wykonano kompilacji Windows `Setup.exe` w tym środowisku. Projekt zawiera skrypt `build_windows.ps1` i konfigurację Inno Setup; instalator musi być zbudowany i sprawdzony na Windows.

## Ograniczenia wydania

- Parser obsługuje wyłącznie udokumentowany podzbiór sieciowych reguł Adblock Plus, nie pełny EasyList.
- Profil Firefox pozostaje eksperymentalny do czasu osobnej walidacji.
- Integracja Bitdefender nie jest zaimplementowana.
- Automatyczny workflow CI dodano do projektu, ale jego wynik w zdalnym GitHub Actions nie jest potwierdzony tym lokalnym przebiegiem.

## Wniosek

Kontrole automatyczne źródeł i paczek przechodzą. CAT 1.0.0 jest przygotowany jako wersjonowany pakiet wydania, jednak deklaracja pełnej zgodności w realnych przeglądarkach wymaga dokończenia ręcznego testu E2E i protokołu odbioru.
