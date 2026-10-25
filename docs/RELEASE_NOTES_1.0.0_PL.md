# CAT — KITTY EDITION 1.0.0 Stable

## Zakres wydania

CAT 1.0.0 utrwala rozszerzenie oparte o Manifest V3, lokalne ustawienia i dziennik, ostrożne wykrywanie DOM, odwracalne oczyszczanie oraz reguły deklaratywnego blokowania. Rozszerzenie działa niezależnie od systemu Windows/Linux poprzez wspierane przeglądarki WebExtensions.

## Najważniejsze gwarancje projektu

- Brak telemetrii i domyślnego zapisywania pełnych URL.
- Minimalne stałe uprawnienia; dostęp do źródeł zewnętrznych jest opcjonalny i wymaga zgody.
- Zewnętrzne listy podlegają limitom, walidacji oraz opcjonalnemu SHA-256.
- Błąd aktualizacji nie powinien podmieniać ostatniego poprawnego zestawu; historia rollback jest ograniczona.
- Podgląd filtrów jest lokalny i bez efektów ubocznych.
- Cleaner nie usuwa węzłów strony; niejednoznaczne sygnały reklamowe otrzymują REVIEW.
- Parser obsługuje tylko udokumentowany podzbiór reguł sieciowych; filtry kosmetyczne i nieznane opcje są pomijane.
- Integracja Bitdefender nie jest zaimplementowana.

## Testowanie i ograniczenia

Automatyczny wynik 1.0.0 (40 testów Python, runtime JavaScript PASS i 118 kontroli Release Gate bez błędów) został zapisany w `docs/TEST_REPORT_1.0.0_PL.md`.

Automatyczny przebieg release gate nie jest równoznaczny z testem E2E na prawdziwej przeglądarce. Wydanie zawiera checklistę `docs/BROWSER_REGRESSION_1.0.0_PL.md`; wyniki ręczne muszą zostać zapisane dla konkretnych wersji przeglądarek i systemów. Profil Firefox jest eksperymentalny, dopóki nie zostanie osobno zakwalifikowany.
