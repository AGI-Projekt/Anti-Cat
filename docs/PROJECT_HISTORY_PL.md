# Historia projektu CAT — KITTY EDITION

Ten plik konsoliduje zakres kolejnych iteracji produktu. Nie zastępuje pełnych tagów ani archiwów źródłowych dla poszczególnych wersji.

| Wersja | Główna zmiana |
|---|---|
| 0.1.0 | Początkowy szkielet rozszerzenia Chromium. |
| 0.2.0 | Bezpieczniejsze oczyszczanie DOM, wyjątki domenowe, podstawowa diagnostyka. |
| 0.3.0 | Rozbudowa ustawień, eksport/import konfiguracji i testów kontraktów. |
| 0.4.0 | Ręcznie zarządzana lista domen do blokowania. |
| 0.5.0 | Import/eksport list filtrów i historia konfiguracji. |
| 0.6.0 | Źródła HTTPS, kontrola SHA-256, limity i rollback. |
| 0.7.0 | Parser ograniczonego podzbioru reguł sieciowych Adblock Plus. |
| 0.8.0 | Laboratorium filtrów do podglądu przed aktywacją. |
| 0.9.0 | Release Gate i scenariusze regresji przeglądarkowej. |
| 1.0.0 | Zamrożenie zakresu, dokumentacja, testy automatyczne i pakowanie wydania. |

## Ograniczenia końcowe

- Testy automatyczne nie zastępują testów E2E w rzeczywistych przeglądarkach.
- Profil Firefox jest eksperymentalny do czasu osobnej kwalifikacji.
- Parser nie implementuje pełnej składni EasyList/Adblock Plus.
- Bitdefender Adapter jest punktem integracji; SDK i licencja nie zostały potwierdzone.
- Przed wydaniem produkcyjnym zapisz wyniki checklisty dla konkretnych wersji Chrome, Edge i Firefox.
