# Prywatność — CAT Kitty Edition 1.0.0

- Cat nie ma serwera telemetrycznego i nie wysyła historii przeglądania.
- Ustawienia, wyjątki, własna lista filtrów, konfiguracja źródeł, skróty źródeł i dziennik są przechowywane lokalnie w magazynie WebExtensions.
- Dziennik ma limit 100 zdarzeń; domyślnie nie zapisuje nawet nazwy hosta, a nigdy pełnej ścieżki ani parametrów URL.
- Adresy źródeł są widoczne w ustawieniach i przechowywane lokalnie. Mogą zawierać dane przekazane przez użytkownika, dlatego Cat ostrzega, aby nie używać URL-i z tokenami/sekretami.
- Zewnętrzna lista jest pobierana dopiero po dodaniu przez użytkownika. Dostęp do originu wymaga osobnej zgody przeglądarki.
- Żądania pobierania pomijają cookies i poświadczenia, używają HTTPS, limitu 256 KiB, timeoutu 15 s i odrzucają przekierowania do innego originu.
- Opcjonalny pin SHA-256 lub plik `.sha256` pozwala zweryfikować zgodność treści. Bez zewnętrznego wzorca obliczony hash zapisuje się do diagnostyki/porównania, ale nie potwierdza autora listy.
- Automatyczne aktualizacje są domyślnie wyłączone. Włączenie wymaga jawnej czynności w ustawieniach.
- Laboratorium filtrów analizuje wklejony tekst lokalnie. Nie zapisuje treści, nie wysyła jej do sieci i nie zmienia reguł; podgląd pokazuje ograniczoną liczbę przykładów.
- Licznik jest liczbą elementów ukrytych przez Ad. Clean, nie liczbą wszystkich zablokowanych żądań sieciowych.
- Brak kluczy licencyjnych, SDK Bitdefender i zewnętrznych wywołań API do klasyfikacji.

Rozszerzenie potrzebuje uprawnień do stron, aby filtrować żądania i analizować DOM. Jeśli użytkownik nie akceptuje takiego zakresu, powinien nie instalować rozszerzenia albo wyłączyć je w przeglądarce.
