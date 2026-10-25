# CAT — KITTY EDITION 0.6.0

## Główna zmiana
Zarządzanie zewnętrznymi listami filtrów z bezpiecznym, jawnym modelem zgód i aktualizacji.

## Funkcje
- Do 5 źródeł HTTPS dodawanych przez użytkownika; źródła nie są domyślnie skonfigurowane.
- Opcjonalny pin SHA-256 lub plik `.sha256` z tego samego originu.
- Odczyt odpowiedzi ze strumienia z limitem 256 KiB, timeout 15 s i brak poświadczeń w żądaniach.
- Odrzucenie HTML/JSON/XML, błędnego UTF-8, wpisów poza obsługiwanym formatem oraz cross-origin redirectów.
- Ręczna aktualizacja oraz opcjonalny harmonogram 6/12/24 h; harmonogram jest domyślnie wyłączony.
- Aktualizacja całego zestawu źródeł dopiero po walidacji wszystkich źródeł i sum kontrolnych.
- Historia do 5 poprzednich zestawów z pamięcią źródeł i listą własną, z możliwością rollbacku.
- Maksymalnie 1000 aktywnych unikalnych domen, 1000 domen na źródło oraz 256 KiB na odpowiedź.
- Przełącznik globalnej ochrony uwzględnia również dynamiczne reguły ręczne i zdalne.

## Bezpieczeństwo i prywatność
- Każdy host wymaga jawnej zgody w przeglądarce; bez uprawnienia źródło nie zostanie pobrane.
- Automatyczne aktualizacje pozostają wyłączone do momentu włączenia w ustawieniach.
- Błąd pobrania, walidacji, sumy kontrolnej lub limitu pozostawia ostatni poprawny zestaw reguł aktywny.
- Adresy źródeł są przechowywane w ustawieniach lokalnych, ale nie trafiają do dziennika zdarzeń.
- Bez zewnętrznego wzorca SHA-256 Cat może potwierdzić strukturę i zachować hash, lecz nie tożsamość wydawcy.
- Brak telemetrii i brak integracji z Bitdefenderem bez licencjonowanego SDK.

## Walidacja
Testy runtime pokrywają uprawnienia do hosta, niedozwolone URL, przypięty SHA-256, zachowanie cache i reguł po błędzie, harmonogram, globalne wyłączenie ochrony i rollback. Pełne testy interfejsu w rzeczywistych Chrome/Edge/Firefox nadal wymagają wykonania ręcznego.
