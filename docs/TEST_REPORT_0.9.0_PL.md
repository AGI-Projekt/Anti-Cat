# Raport testów — CAT 0.9.0

## Wyniki automatyczne
- Python unittest: **37/37 zaliczone**.
- Runtime contracts JavaScript: **PASS**.
- `node --check src/background/service-worker.js`: PASS.
- `node --check src/kitty-ui/options.js`: PASS.
- Release Gate: **79 kontroli, 0 błędów**.
- Integralność ZIP: pełny projekt, Chromium i Firefox — PASS.
- Test syntetyczny odświeżenia 300 reguł: **11 ms** w tym środowisku; nie jest to gwarancja wydajności w każdej przeglądarce.

## Co weryfikuje Release Gate
- Zgodność wersji `0.9.0` w package, kontraktach i manifestach.
- Manifest V3, ścieżki do ikon, popupu, strony ustawień, skryptów i pliku reguł.
- Unikalność ID reguł sieciowych.
- Dozwolony zestaw stałych uprawnień; hosty pozostają opcjonalne.
- Zgodność zbudowanych plików rozszerzenia Chromium ze źródłami.
- Kontrole prywatności: brak `innerHTML` w UI i brak usuwania węzłów strony przez Cleaner.

## Testy nieprzeprowadzone
Nie wykonano pełnej integracyjnej sesji rozszerzenia w prawdziwym Chrome/Edge/Firefox. Środowisko zarządzane może blokować instalację rozszerzeń. Przed stabilnym 1.0 należy wykonać checklistę `docs/BROWSER_REGRESSION_0.9.0_PL.md` ręcznie w przeglądarkach docelowych.

## Wniosek
Automatyczne testy projektu i kontrola paczek przeszły pomyślnie. CAT 0.9.0 pozostaje wersją rozwojową do czasu zaliczenia testów przeglądarkowych i regresji na rzeczywistych stronach.
