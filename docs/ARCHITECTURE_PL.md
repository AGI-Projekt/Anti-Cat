# Architektura CAT — Kitty Edition

## Przepływ

1. Reguły sieciowe DNR blokują żądania zgodne z zatwierdzonym zestawem.
2. Anti-Cat Detector ocenia wybrane elementy DOM i zwraca `ALLOW`, `BLOCK` lub `REVIEW`.
3. Ad. Clean ukrywa wyłącznie jawnie oznaczone elementy i nie usuwa ich węzłów.
4. Kitty UI odczytuje lokalny stan rozszerzenia i umożliwia zmianę ustawień.
5. Dziennik ogranicza dane do czasu, modułu, kategorii, identyfikatora reguły i werdyktu.

## Granice modułów

- `src/background/` — stan, koordynacja i komunikaty rozszerzenia.
- `src/detector/` — klasyfikacja DOM bez uprawnień do sieci.
- `src/blocker/` — reguły deklaratywne.
- `src/cleaner/` — odwracalne zmiany DOM.
- `src/kitty-ui/` — popup i ustawienia.
- `src/bitdefender/` — dokumentacja punktu integracji, bez niepotwierdzonego SDK.

## Decyzje bezpieczeństwa

Nieznana składnia reguł nie jest wykonywana. Aktualizacje zewnętrznych źródeł wymagają jawnej konfiguracji, HTTPS i walidacji. W razie błędu należy zachować ostatni poprawny zestaw.
