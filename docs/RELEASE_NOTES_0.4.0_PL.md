# CAT — KITTY EDITION 0.4.0

## Najważniejsze zmiany
- Własna, lokalna lista do 200 domen blokowanych przez deklaratywne reguły sieciowe.
- Walidacja domen i atomowa wymiana reguł; błędna lista nie zastępuje aktywnej.
- Eksport/import ustawień obejmuje również własną listę domen.
- Licznik domen na liście i przycisk bezpiecznego czyszczenia.
- Wersja reguł: `2026.10.24.3`.

## Ważne ograniczenie
Własna lista blokuje żądania do całej wpisanej domeny i jej subdomen. Nie jest to parser EasyList/Adblock Plus ani automatyczny downloader list. Nie dodawaj domen głównych, jeśli zawierają legalne treści potrzebne stronie. Zewnętrzna synchronizacja list nie jest włączona.

## Testy
Uruchom `npm run test:all` (Python + Node.js) oraz `npm run build:chromium` i `npm run build:firefox`. Testy automatyczne nie zastępują ręcznej kontroli w docelowych przeglądarkach.
