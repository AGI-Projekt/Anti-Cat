# CAT — KITTY EDITION 0.9.0

## Cel wydania

0.9.0 wprowadza Release Gate i zestaw kontrolowanych przypadków regresji przed kandydatem do stabilnego 1.0. Nie zmienia podstawowego silnika blokowania ani nie rozszerza zakresu uprawnień.

## Zmiany
- `release_gate.py` weryfikuje zgodność wersji, Manifest V3, ścieżki zasobów, unikalne ID reguł, dozwolony zestaw uprawnień, opcjonalny charakter host permissions i zgodność plików zbudowanej paczki ze źródłami.
- Raport JSON `dist/RELEASE_GATE_0.9.0.json` można wykorzystać w CI lub audycie wydania.
- Dodano lokalną stronę regresji z nawigacją, artykułem, formularzem, kontrolkami multimediów i kontrolowanym kontenerem reklamowym.
- Dodano procedurę manualnych testów Chrome/Edge i Firefox. Testy manualne nie są automatycznie oznaczane jako zaliczone.
- Dodano testy sprawdzające kompletność raportu, obecność scenariuszy regresji i zgodność wersji.

## Weryfikacja wykonana w pakiecie
- 37 testów Python.
- Testy kontraktów runtime JavaScript.
- Kontrola składni JavaScript.
- Release Gate: 79 kontroli, 0 błędów.
- Kontrola integralności archiwów ZIP.

## Ograniczenia
- Nie wykonano testu funkcjonalnego w rzeczywistej przeglądarce; trzeba go przeprowadzić zgodnie z `docs/BROWSER_REGRESSION_0.9.0_PL.md`.
- Parser sieciowy nadal obsługuje tylko opisany podzbiór reguł Adblock Plus.
- Integracja Bitdefender nie jest wdrożona.
