# CAT 1.0.0 — testy regresji w rzeczywistej przeglądarce

Ta procedura jest uzupełnieniem testów jednostkowych i runtime. Nie jest automatycznie zaliczona przez Release Gate; wymaga uruchomienia w Chrome/Edge oraz osobno w Firefox.

## Przygotowanie
1. Zbuduj paczkę: `python build_extension.py all`.
2. W Chrome/Edge otwórz `chrome://extensions` lub `edge://extensions`, włącz tryb dewelopera i załaduj folder `browser-extension`.
3. W Firefox otwórz `about:debugging#/runtime/this-firefox` i tymczasowo załaduj `dist/firefox/manifest.json`.
4. Otwórz lokalny plik `tests/browser/fixtures/regression-page.html` albo podaj go lokalnemu serwerowi HTTP. Uwaga: ograniczenia przeglądarki mogą nie uruchamiać rozszerzeń na stronach `file://`; w takim przypadku użyj `python -m http.server 8765 --directory tests/browser/fixtures` i otwórz `http://127.0.0.1:8765/regression-page.html`.

## Macierz PASS/FAIL
- [ ] Artykuł i nawigacja pozostają widoczne.
- [ ] Formularz wysyła zdarzenie lokalne i pokazuje `FORM_OK`.
- [ ] Kontrolki audio/wideo pozostają obecne i interaktywne.
- [ ] Podgląd listy w Laboratorium filtrów nie zapisuje konfiguracji ani nie zmienia reguł.
- [ ] Niepewne elementy nie są ukrywane automatycznie.
- [ ] Wyjątek domenowy działa tylko na domenie i jej subdomenach zgodnie z opisem.
- [ ] Wyłączenie ochrony zatrzymuje blokowanie dynamiczne.
- [ ] Błędna aktualizacja listy nie usuwa ostatniego poprawnego cache.
- [ ] Konsola nie zawiera nieobsłużonych błędów rozszerzenia.

Zapisz wersję przeglądarki, system operacyjny, wynik każdego punktu i błędy konsoli. Nie oznaczaj testu jako PASS, jeżeli nie został wykonany.


## Protokół odbioru wydania 1.0.0

Dla każdego testu zapisz przeglądarkę, wersję, system operacyjny, datę, wynik i ewentualny błąd. Nie wpisuj PASS, jeśli test nie został faktycznie wykonany.

| Środowisko | Wersja | Wynik | Uwagi |
|---|---|---|---|
| Chrome na Windows | uzupełnij | NOT RUN | wymagany test ręczny |
| Edge na Windows | uzupełnij | NOT RUN | wymagany test ręczny |
| Chrome/Chromium na Linux | uzupełnij | NOT RUN | wymagany test ręczny |
| Firefox (profil eksperymentalny) | uzupełnij | NOT RUN | osobna kwalifikacja |

Testy obejmują instalację, aktualizację z poprzedniej wersji, ochronę ON/OFF, wyjątki, listy filtrów, zewnętrzne źródło z prawidłowym i błędnym SHA-256, rollback, dziennik prywatności, formularze, nawigację, logowanie, multimedia i odwracalność Cleaner.
