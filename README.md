# CAT — KITTY EDITION

**Wersja projektu: 1.0.0**  
**Platformy docelowe:** Windows i Linux  
**Forma:** rozszerzenie przeglądarki WebExtensions (Chromium; profil Firefox eksperymentalny)

CAT to rozszerzenie mające ograniczać wybrane zasoby reklamowe i porządkować układ stron. Kitty jest maskotką interfejsu — program nie przedstawia jej jako świadomej istoty.

## Moduły

- **Anti-Cat Detector** — klasyfikacja elementów i decyzje `ALLOW`, `BLOCK`, `REVIEW`.
- **Ad Blocker** — reguły sieciowe oparte na API przeglądarki.
- **Ad. Clean** — ostrożne, odwracalne porządkowanie DOM.
- **Kitty UI** — popup, ustawienia, wyjątki i diagnostyka.
- **Filter Laboratory** — analiza list przed aktywacją.
- **Source Manager** — ręcznie dodane źródła HTTPS, limity, weryfikacja SHA-256 i rollback.
- **Bitdefender Adapter** — punkt integracji; bez aktywnego SDK w standardowym wydaniu.

## Zasady bezpieczeństwa

- Niepewne elementy nie są automatycznie usuwane.
- Ustawienia i diagnostyka są lokalne; pełne URL nie są domyślnie zapisywane.
- Listy filtrów są walidowane przed aktywacją; nieobsługiwana składnia jest pomijana.
- Po błędzie aktualizacji zachowaj ostatni poprawny zestaw reguł.
- Nie dodawaj uprawnień bez uzasadnienia.
- Nie traktuj CAT jako zamiennika programu antywirusowego.

## Status 1.0.0

Wydanie ma przygotowane testy automatyczne i kontrolę statyczną pakietu. **Pełne testy E2E w rzeczywistych przeglądarkach nie zostały potwierdzone.** Przed produkcyjnym wdrożeniem wykonaj checklistę regresji.

Parser obsługuje ograniczony podzbiór sieciowej składni Adblock Plus. To nie jest pełna implementacja EasyList/Adblock Plus.

## Instalacja deweloperska

1. Otwórz katalog zbudowanego profilu `dist/chromium/`.
2. W Chrome/Edge przejdź do `chrome://extensions` lub `edge://extensions`.
3. Włącz tryb dewelopera i wybierz **Załaduj rozpakowane**.
4. Wykonaj checklistę `docs/BROWSER_REGRESSION_1.0.0_PL.md`.

## Budowanie i testy

Wymagania: Python 3.11+ oraz Node.js (do testów runtime, jeśli skrypty projektu go używają).

```bash
python -m unittest discover -s tests -v
python release_gate.py
python package_release.py
```

Sprawdź dostępne skrypty i zależności w repozytorium przed uruchomieniem — polecenia mogą wymagać dostosowania do konkretnego środowiska.

## Integracja Bitdefender

Integracja jest opcjonalna i nie została uznana za wdrożoną. Można ją dodać dopiero po potwierdzeniu oficjalnego SDK/API, licencji i zasad dystrybucji. Cat nie modyfikuje plików, procesów ani sterowników Bitdefendera.

## Historia

Projekt był rozwijany iteracyjnie od 0.1.0 do 1.0.0. Zasady produktu: **Cat ma chronić, nie przeszkadzać. Kitty ma informować, nie straszyć.**
