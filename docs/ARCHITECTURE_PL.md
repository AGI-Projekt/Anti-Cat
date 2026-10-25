# Architektura — CAT Kitty Edition 1.0.0

## Zestaw warstw

- `src/detector/detector.js` — ostrożna klasyfikacja kandydatów DOM (`ALLOW`, `BLOCK`, `REVIEW`).
- `src/blocker/rules.json` — statyczny ruleset DNR.
- `src/background/service-worker.js` — koordynacja stanu, zarządzanie wyjątkami, dynamicznymi regułami, źródłami HTTPS, sumami SHA-256, historią, harmonogramem i minimalnym dziennikiem.
- `src/cleaner/cleaner.js` — odwracalne ukrywanie potwierdzonych elementów bez usuwania węzłów DOM.
- `src/kitty-ui/` — popup, strona ustawień i Laboratorium filtrów do lokalnego podglądu list bez efektów ubocznych.
- `src/storage/schema.json` — domyślne ustawienia i limity.
- `src/dictionary/pl.json` — wersjonowany słownik symboli.
- `manifest/` — profile Chromium i eksperymentalnego Firefoksa.
- `public/icons/` — ikony Kitty.

## Cykl źródła listy

1. Użytkownik zapisuje adres HTTPS i ze strony ustawień przyznaje dostęp do określonego originu.
2. Worker pobiera odpowiedź bez cookies/poświadczeń, z limitem 256 KiB, limitem czasu 15 s i bez przekierowań do innego originu.
3. Jeśli podano pin SHA-256 lub URL pliku `.sha256`, hash odpowiedzi musi być zgodny.
4. Tekst jest dekodowany jako UTF-8 i walidowany jako domeny, podstawowy format hosts albo ograniczony podzbiór sieciowych filtrów ABP. HTML jest odrzucany; nieobsługiwane opcje są pomijane i liczone, a źródło bez żadnej obsługiwanej reguły zostaje odrzucone.
5. Wszystkie źródła przechodzą walidację przed zmianą aktywnego zestawu; następnie Cat tworzy deduplikowaną listę do 1000 domen i zastępuje reguły w jednej operacji DNR.
6. Dopiero po powodzeniu aktualizowany jest magazyn. Jeśli zapis magazynu się nie powiedzie, worker próbuje odtworzyć poprzedni zestaw reguł.
7. Błąd źródła pozostawia poprzedni cache i reguły aktywne; dziennik zapisuje kategorię błędu bez URL.

## Lokalny podgląd listy w 1.0.0

`CAT_PREVIEW_FILTER_TEXT` wywołuje ten sam parser i walidator co aktualizacja źródeł, ale w trybie podglądu dopuszcza wynik bez obsługiwanych wpisów, aby można było zobaczyć diagnozę. Ogranicza wejście do 256 KiB i zwraca liczby, powody pominięcia oraz do 10 przykładów. Ścieżka nie wywołuje fetch, storage, API permissions ani DNR. UI wstawia wyniki przez `textContent`.

## Reguły i rollback

- Ręczna lista ma limit 200 domen.
- Do 5 źródeł może dostarczyć do 1000 domen na źródło; łączny unikalny zestaw aktywny jest ograniczony do 1000.
- Ręczne i domenowe reguły dynamiczne zajmują `11000–11999`; sieciowe reguły ABP używają `13000–13499` (maks. 500); wyjątki domenowe mają zakres `10000–10099` i wyższy priorytet. Reguły `@@` są regułami `allow` o wyższym priorytecie niż blokady filtrowania.
- Historia przechowuje do pięciu migawkowych zestawów listy ręcznej, cache źródeł i konfiguracji źródeł.
- Wyłączenie ochrony wyłącza statyczny ruleset i dynamiczne reguły blokujące; edycja ustawień w stanie OFF nie reaktywuje reguł.

## Uprawnienia i granice

- `alarms` używane jest tylko do opcjonalnego harmonogramu.
- `optional_host_permissions` jest używane do żądania zgody wyłącznie dla originów dodanych przez użytkownika.
- Aktualizacje automatyczne są domyślnie wyłączone.
- Obsługiwany jest ograniczony podzbiór sieciowych reguł ABP, a nie pełna składnia EasyList/Adblock Plus. Regex, kosmetyka, `redirect`, `removeparam`, CSP i nieznane opcje są pomijane. Hash bez niezależnego wzorca nie uwierzytelnia autora listy.
- Integracja Bitdefender pozostaje punktem przyszłej integracji, nie aktywnym SDK.

## Budowanie

```bash
python build_extension.py chromium
python build_extension.py all
python -m unittest discover -s tests -v
node tests/test_runtime_contracts.js
```

Profil Firefox jest eksperymentalny i musi przejść testy w docelowym Firefox przed dystrybucją.
