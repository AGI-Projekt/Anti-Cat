# CAT — KITTY EDITION 0.3.0

## Najważniejsze zmiany

- Eksport i import ustawień prywatności oraz listy wyjątków w formacie JSON.
- Eksport nie zawiera dziennika decyzji ani historii stron.
- Import sprawdza format, rozmiar pliku, typy danych i limit domen; domeny są ponownie walidowane przez proces tła przed aktualizacją reguł.
- Wersja zestawu reguł: `2026.10.24.2`.
- Ujednolicone wersje manifestów i metadanych do `0.3.0`.
- Zachowane lokalne przechowywanie danych i brak telemetrii.

## Znane ograniczenia

- Pełne testy w Chrome/Edge/Firefox wymagają uruchomienia w rzeczywistej przeglądarce.
- Lista filtrów jest lokalna i ograniczona; nie jest to zamiennik pełnego silnika filtrów zewnętrznych.
- Bitdefender Adapter pozostaje niezaimplementowany do czasu potwierdzenia licencji i oficjalnego SDK.
- Eksport/Import dotyczy ustawień prywatności i wyjątków, nie przenosi licznika ani dziennika.
