# CAT — KITTY EDITION 0.5.0

## Nowości
- Import lokalnych list filtrów z plików TXT: domeny w osobnych wierszach lub podstawowy format hosts.
- Eksport własnej listy domen do TXT.
- Historia do 5 poprzednich zestawów filtrów i funkcja rollback.
- Walidacja listy przed zastosowaniem; zmiana dynamicznych reguł pozostaje atomowa.
- Brak automatycznego pobierania z niezweryfikowanych źródeł.

## Bezpieczeństwo
Importowany plik jest ograniczony do 256 KiB i 200 domen. Nieznane formaty są odrzucane zamiast częściowego, cichego importu. Własna lista domen blokuje wszystkie żądania do wpisanych domen, więc należy unikać domen głównych, jeśli nie jest to zamierzone.

## Walidacja
Testy jednostkowe i kontraktowe potwierdzają logikę walidacji, importu/eksportu i rollback. Pełne testy funkcjonalne muszą być jeszcze wykonane w rzeczywistych Chrome/Edge i Firefox.
