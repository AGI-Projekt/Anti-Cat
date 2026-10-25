# CAT — KITTY EDITION 0.8.0

**Data wydania:** 25 października 2026 r.  
**Status:** wersja rozwojowa, wymaga ręcznej walidacji przed wydaniem stabilnym.

## Nowości

- Laboratorium filtrów pozwala wkleić tekst listy i przeprowadzić analizę lokalnie przed aktywacją.
- Raport obejmuje liczbę wierszy, unikalne domeny, obsługiwane reguły sieciowe, wpisy pominięte i powody pominięcia.
- Podgląd pokazuje do 10 przykładów domen oraz reguł, aby użytkownik mógł ocenić semantykę listy.
- Limit wejścia podglądu wynosi 256 KiB; HTML, nieprawidłowe domeny, zbyt duże dane i inne błędne wejścia są odrzucane.
- Podgląd nie zapisuje treści, nie pobiera danych z sieci, nie prosi o uprawnienia i nie zmienia zestawu reguł DNR.
- Dodano fixture'y regresyjne dla domen, hosts, wyjątków `@@`, reguł sieciowych i składni nieobsługiwanej.
- Ujednolicono wersje pakietów, manifestów, skryptów budowania i wersję reguł `2026.10.25.8`.

## Walidacja wykonana

- Testy Python: 31/31 zaliczonych.
- Testy runtime JavaScript z atrapą API: zaliczone; obejmują brak efektów ubocznych podglądu.
- Kontrola składni JavaScript/Python i walidacja JSON: zaliczone.
- Zbudowano profile Chromium i Firefox oraz sprawdzono, czy manifesty wskazują istniejące pliki.
- Syntetyczne odświeżenie 300 reguł zakończyło się w około 12 ms w środowisku testowym; to pomiar testowy, a nie gwarancja wydajności.

## Ograniczenia walidacji

Nie wykonano testu funkcjonalnego rozszerzenia w rzeczywistej przeglądarce. Zainstalowane w środowisku Chromium polityki administracyjne blokują wszystkie rozszerzenia i nawigację do stron, więc rozszerzenie nie mogło zostać uruchomione. Firefox jest pakietem eksperymentalnym. Automatyczne testy nie potwierdzają pełnej zgodności DNR z każdą wersją przeglądarki.

## Znane ograniczenia funkcjonalne

- Parser obsługuje tylko udokumentowany podzbiór sieciowych reguł Adblock Plus.
- Filtry kosmetyczne, regex, przekierowania, `removeparam`, CSP i nieznane opcje są pomijane, a nie wykonywane.
- Integracja Bitdefender nie jest zaimplementowana.
- Podgląd nie aktywuje listy; po sprawdzeniu użytkownik nadal musi świadomie skonfigurować lub zastosować reguły.
