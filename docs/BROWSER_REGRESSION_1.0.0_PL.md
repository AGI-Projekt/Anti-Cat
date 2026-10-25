# CAT 1.0.0 — testy regresji w przeglądarce

Ta checklista wymaga wykonania ręcznego; nie jest zaliczana przez testy statyczne.

## Środowisko
- [ ] Zapisz system operacyjny i wersję przeglądarki.
- [ ] Zainstaluj rozszerzenie z profilu Chromium lub tymczasowo załaduj profil Firefox.
- [ ] Sprawdź konsolę rozszerzenia i konsolę strony.

## Scenariusze
- [ ] Ochrona ON blokuje wyłącznie zasoby pasujące do aktywnych reguł.
- [ ] Ochrona OFF zatrzymuje blokowanie reguł CAT.
- [ ] Wyjątki domenowe działają na właściwej domenie i subdomenach.
- [ ] Formularz, logowanie, nawigacja, płatności i multimedia działają.
- [ ] Cleaner nie usuwa węzłów DOM i można go wyłączyć.
- [ ] Podgląd filtrów nie zapisuje ustawień przed zatwierdzeniem.
- [ ] Nieprawidłowe źródło / błędny SHA-256 nie nadpisuje ostatniej poprawnej listy.
- [ ] Dziennik nie przechowuje pełnych URL domyślnie.

Zapisz wynik PASS/FAIL i uwagi. Nie oznaczaj scenariusza jako PASS, jeśli nie został faktycznie wykonany.
