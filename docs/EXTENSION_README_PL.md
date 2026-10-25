# CAT — Kitty Edition 1.0.0 — rozszerzenie przeglądarki

## Instalacja lokalna

1. Rozpakuj archiwum rozszerzenia.
2. W Chrome otwórz `chrome://extensions`, w Edge `edge://extensions`.
3. Włącz tryb dewelopera i kliknij **Załaduj rozpakowane**.
4. Wskaż ten folder (powinien zawierać `manifest.json`).

## Laboratorium filtrów przed aktywacją

W ustawieniach wklej tekst listy do sekcji „Laboratorium filtrów” i kliknij „Przeanalizuj listę”. Cat pokaże liczbę domen, reguł sieciowych i pominiętych wpisów oraz przykłady. Analiza jest lokalna i tylko do odczytu: nie zapisuje listy i nie zmienia ochrony. Limit wejścia: 256 KiB.

## Źródła filtrów online

W ustawieniach możesz dodać maksymalnie 5 list tekstowych przez HTTPS. Cat prosi o zgodę na host źródła. Obsługiwane są domeny po jednej na wiersz, podstawowy format hosts i ograniczony podzbiór sieciowych reguł Adblock Plus. Limity to 256 KiB na źródło, 1000 domen łącznie i 500 reguł sieciowych.

Możesz skonfigurować przypięty SHA-256 lub adres pliku `.sha256` pod tym samym originem. Hash jest wyliczany z dokładnych pobranych bajtów. Automatyczne odświeżanie co 6, 12 lub 24 godziny jest domyślnie wyłączone.

Aktualizacja aktywuje się dopiero po sprawdzeniu wszystkich źródeł i zebraniu poprawnego zestawu. Jeśli dowolne źródło zawiedzie, Cat zachowuje ostatnie poprawne reguły. Obsługiwane są kotwice `||`, `|`, wildcard `*`, separator `^`, wyjątki `@@`, opcje typów zasobów, `first-party`/`third-party`, `domain=` i `match-case`. Filtry kosmetyczne, regex, przekierowania, `removeparam`, CSP i nieznane opcje są pomijane i liczone w UI; nie jest to pełna zgodność z EasyList/Adblock Plus.

## Prywatność

Brak telemetrii. Adresy źródeł i ich skróty są przechowywane lokalnie. URL źródła nie trafia do dziennika zdarzeń. Nie wpisuj adresów z tokenami lub sekretami. Bez zewnętrznego wzorca SHA-256 Cat nie potwierdza tożsamości wydawcy listy.

## Ograniczenia

To wersja rozwojowa. Testy kontraktowe/runtime nie zastępują testów w docelowej przeglądarce. Firefox jest profilem eksperymentalnym. Integracja Bitdefender jest nieaktywna.
