# Changelog — CAT Kitty Edition

## 1.0.0 — 2026-10-25
- Pierwsze wydanie 1.0.0 z zamrożonym zakresem produktu i jawnie opisanymi ograniczeniami parsera filtrów.
- Dodano macierz CI dla Windows i Linux oraz ujednolicony poleceniowy przebieg walidacji wydania.
- Rozbudowano Release Gate: zgodność źródeł z paczkami, manifesty, minimalne uprawnienia, zasoby, wersje i kryteria prywatności.
- Dodano narzędzie do tworzenia powtarzalnych paczek projektu i rozszerzeń z sumami SHA-256 oraz bez cache Python.
- Rozdzielono testy automatyczne od nieprzeprowadzonych testów E2E w rzeczywistych przeglądarkach.
- Brak telemetrii; integracja Bitdefender nadal niezaimplementowana i wymaga oficjalnego SDK oraz potwierdzonej licencji.

## 0.9.0 — 2026-10-25
- Dodano Release Gate: kontrolę zgodności wersji, manifestów, odwołań do zasobów i spójności zbudowanych paczek.
- Dodano audyt uprawnień manifestów i kontrolę ryzykownych sinków HTML w kodzie interfejsu.
- Dodano lokalną stronę testową regresji obejmującą nawigację, formularz, treść artykułu, multimedia i kontener reklamowy.
- Dodano instrukcję manualnego testu rozszerzenia w rzeczywistej przeglądarce oraz jawne kryteria PASS/FAIL.
- Rozszerzono automatyczne testy kontraktów i raportowanie gotowości wydania; nie zastępuje to testu w realnym browserze.


## 0.8.0 — 2026-10-25
- Dodano Laboratorium filtrów do lokalnej analizy list przed aktywacją.
- Podgląd pokazuje liczbę obsługiwanych domen i reguł, pominięte wpisy oraz przyczyny pominięcia.
- Analiza działa bez sieci, bez zapisu konfiguracji, bez uprawnień hosta i bez zmian w DNR.
- Dodano fixture'y regresyjne dla reguł blokujących, wyjątków, domen, hosts oraz opcji nieobsługiwanych.
- Dodano testy brzegowe dla pustych list, błędnych danych, HTML i limitu 256 KiB.
- Ujednolicono numer wersji rozszerzeń i reguł.


## 0.6.0 — 2026-10-24
- Dodano źródła list filtrów HTTPS dodawane jawnie przez użytkownika oraz opcjonalne uprawnienia originu.
- Dodano limity rozmiaru/timeoutu, odczyt strumieniowy, walidację UTF-8 i obsługę list domen / hosts.
- Dodano weryfikację przypiętego SHA-256 lub pliku `.sha256` z tego samego originu.
- Dodano harmonogram 6/12/24 h, domyślnie wyłączony.
- Aktualizacja źródeł jest zbiorcza; błędna lista nie zastępuje poprzedniego poprawnego cache i reguł.
- Historia/rollback obejmuje teraz ręczną listę, cache źródeł i konfigurację źródeł.
- Globalny przełącznik OFF wyłącza także dynamiczne reguły blokujące.
- Rozszerzono testy runtime: zgody hosta, SHA-256, nieudana aktualizacja, harmonogram, reguły dynamiczne i rollback.

## 0.5.0 — 2026-10-24
- Import i eksport lokalnych list domen w TXT.
- Historia pięciu poprzednich list i możliwość wycofania zmian.
- Walidacja importu i opis ograniczeń bezpieczeństwa.

## 0.4.0 — 2026-10-24
- Dodano własną listę domen blokowanych (do 200 domen).
- Dodano atomową wymianę dynamicznych reguł i czyszczenie listy.
- Dołączono listę własną do eksportu/importu ustawień.

## 0.3.0 — ustawienia przenośne i dopracowanie modułów
- Dodano eksport/import ustawień i wyjątków z walidacją wejścia.
- Eksport pomija dziennik zdarzeń i dane o odwiedzanych stronach.
- Ujednolicono wersje manifestów oraz kontrakty projektu.

## 0.2.0 — bezpieczniejszy fundament
- Wydzielono moduły logiki rozszerzenia i profile Chromium/Firefox.
- Dodano wyjątki domenowe, osobny przełącznik Ad. Clean i lokalny dziennik.
- Niejednoznaczne etykiety sponsorowane otrzymują `REVIEW`.
- Cleaner nie usuwa węzłów DOM, lecz stosuje odwracalne ukrywanie.

## 0.1.0 — Starter
- Panel Windows, podstawowy tester URL i pierwsze rozszerzenie Chromium.
