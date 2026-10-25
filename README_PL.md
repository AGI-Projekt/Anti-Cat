# CAT — KITTY EDITION

**Wersja:** 1.0.0 Stable  
**Główny produkt:** rozszerzenie przeglądarki  
**Systemy:** Windows i Linux przez wspierane przeglądarki WebExtensions  
**Panel desktopowy:** opcjonalnie dla Windows 10/11 x64  
**Motyw:** biała kotka Kitty, złoto, granat i błękit.

Cat to lokalne rozszerzenie ograniczające wybrane zasoby reklamowe i ostrożnie porządkujące widok strony. Zasada projektu: **Cat ma chronić, nie przeszkadzać. Kitty ma informować, nie straszyć.**

## Wydanie stabilne 1.0.0

- Utrwalono zakres funkcjonalny 1.0.0 i dodano odtwarzalny proces przygotowania paczek.
- Raport maszynowy trafia do `dist/RELEASE_GATE_1.0.0.json`.
- Dodano kontrolowaną stronę regresji dla nawigacji, artykułu, formularza, multimediów i kontenera reklamowego.
- Dodano checklistę manualnych testów Chrome/Edge i Firefox. Release Gate nie udaje, że test rzeczywistej przeglądarki został wykonany.
- Zachowano Laboratorium filtrów: analiza lokalna, bez pobierania danych, bez zapisu i bez zmian w aktywnych regułach DNR.


### Zakres i status 1.0.0

- Rozszerzenie jest przeznaczone dla Chrome/Edge na Windows i Linux; rozszerzenie pozostaje niezależne od systemu operacyjnego w ramach WebExtensions API.
- Profil Firefox jest dołączony jako eksperymentalny i wymaga osobnych testów na docelowej wersji Firefoksa.
- Zewnętrzne źródła filtrów i automatyczne aktualizacje pozostają domyślnie wyłączone.
- CAT nie jest antywirusem i nie zastępuje ochrony przed phishingiem. Integracja Bitdefender nie jest zaimplementowana.
- Automatyczne testy są odtwarzalne; pełny test end-to-end w prawdziwych przeglądarkach pozostaje ręcznym warunkiem przed deklarowaniem zgodności przetestowanej na urządzeniach użytkowników.

## Nowości w 0.7.0

- Obsługa ostrożnego podzbioru sieciowych reguł Adblock Plus: kotwice `||`, `|`, wildcard `*`, separator `^`, wyjątki `@@` oraz ograniczenia typu zasobu / party / `domain=`.
- Maksymalnie 500 aktywnych reguł sieciowych, po deduplikacji; wzorce są walidowane przed złożeniem reguł DNR.
- Zliczanie wpisów pominiętych jako nieobsługiwane. Wzorce regex, filtry kosmetyczne, przekierowania, `removeparam`, CSP, globalne niezakotwiczone wyjątki `allow` i nieznane opcje nie są wykonywane.
- Testy regresji wzorców, wyjątków, negatywnych opcji, rollbacku oraz test kosztu parsowania większej listy.
- Do 5 zewnętrznych list tekstowych wskazanych przez użytkownika, wyłącznie przez HTTPS.
- Jawna zgoda na dostęp do originu każdego źródła; bez zgody Cat nie pobiera listy.
- Weryfikacja opcjonalnego, przypiętego SHA-256 lub pliku kontrolnego `.sha256` z tego samego originu. Cat oblicza i zapisuje również własny skrót każdej poprawnie pobranej listy.
- Aktualizacja okresowa co 6, 12 lub 24 godziny; automatyczne aktualizacje są domyślnie wyłączone.
- Limit 256 KiB na źródło, 1000 domen na źródło i 1000 unikalnych domen aktywnych łącznie.
- Ścisła walidacja zwykłych domen/formatu hosts, odrzucanie HTML, błędnego UTF-8, błędnych wpisów i przekierowań do innego originu.
- Aktualizacja wielu źródeł jako jedna transakcja: jeśli któreś źródło zawiedzie, nowy zestaw nie zostanie aktywowany, a ostatnie poprawne reguły pozostaną.
- Historia do 5 poprzednich zestawów, obejmująca listę ręczną i pamięć podręczną źródeł; rollback odtwarza cały zestaw filtrów.
- Globalne wyłączenie ochrony usuwa z aktywnego zestawu także dynamiczne reguły ręczne/zdalne. Edycja list przy wyłączonej ochronie nie aktywuje blokowania ponownie.

## Laboratorium filtrów

W ustawieniach wklej tekst do sekcji „Laboratorium filtrów” i wybierz „Przeanalizuj listę”. Analiza jest lokalna i nie wpływa na ochronę. Wynik pokaże liczby rozpoznanych domen/reguł, pominięte elementy z przyczynami oraz maksymalnie 10 przykładów. Nieznane opcje i filtry kosmetyczne są raportowane, a nie wykonywane. Limit tekstu: 256 KiB.

## Bramka wydania 1.0.0

Uruchom `python release_gate.py` lub `npm run test:release-gate`. Polecenie kończy się kodem 0 tylko wtedy, gdy kontrole statyczne przejdą. Nie zastępuje ręcznych testów przeglądarkowych z `docs/BROWSER_REGRESSION_1.0.0_PL.md`.

## Co realnie działa

1. Statyczny zestaw DNR blokuje żądania wybranych znanych domen reklamowych.
2. Anti-Cat Detector rozpoznaje jawne atrybuty reklamowe i ramki z wybranych domen.
3. Niejednoznaczne etykiety „Sponsored” / „Advertisement” otrzymują `REVIEW`, a nie automatyczne ukrycie.
4. Ad. Clean odwracalnie ukrywa rozpoznane elementy przez znacznik DOM i lokalny CSS; nie usuwa ich z drzewa.
5. Popup ma oddzielne przełączniki ochrony sieciowej i Ad. Clean.
6. Użytkownik może zarządzać wyjątkami oraz listą ręczną do 200 domen.
7. Dziennik zachowuje do 100 minimalnych zdarzeń. Pełne URL i treść list filtrów nie trafiają do dziennika.
8. Użytkownik może dodawać do pięciu źródeł online, odświeżać je ręcznie lub — po osobnym włączeniu — aktualizować według harmonogramu.
9. Brak telemetrii, serwera Cat i połączeń z zewnętrznym silnikiem klasyfikacji.

## Konfiguracja źródeł online

W sekcji **Zewnętrzne źródła filtrów** w ustawieniach:

1. Wprowadź URL pliku tekstowego HTTPS. Źródło nie może używać adresu IP, hosta lokalnego ani przekierowywać do innego originu.
2. Opcjonalnie podaj przypięty SHA-256 (64 znaki hex) **albo** URL pliku `.sha256` na tym samym originie. Nie wpisuj obu metod naraz.
3. Kliknij **Dodaj źródło** i zaakceptuj prośbę przeglądarki o dostęp do danego hosta.
4. Kliknij **Odśwież wszystkie źródła teraz**. Dopiero po poprawnym pobraniu, sprawdzeniu skrótu (jeśli skonfigurowany), walidacji domen i reguł sieciowych są aktywowane.
5. Automatyczne aktualizacje włącz osobno i wybierz odstęp 6, 12 lub 24 godziny.

Obsługiwane formaty to domena na wiersz, podstawowy format hosts oraz ograniczony podzbiór sieciowych reguł Adblock Plus. Cat obsługuje `||domain^`, kotwice `|`, `*`, `^`, wyjątki `@@`, typy zasobów, `third-party`/`first-party`, `domain=` i `match-case`. Filtry kosmetyczne, regex, przekierowania, `removeparam`, CSP i nieznane opcje są pomijane i raportowane w ustawieniach. Źródło musi zawierać co najmniej jedną obsługiwaną regułę; błędny domenowy wpis nadal odrzuca całą wersję źródła.

SHA-256 ma dwa warianty. Przypięty hash blokuje zmianę treści do chwili, gdy użytkownik zmieni pin. Plik `.sha256` może zmieniać się wraz z listą, o ile plik kontrolny jest udostępniany przez zaufanego wydawcę. Bez wzorca zewnętrznego Cat zapisuje wyliczony hash i waliduje strukturę, ale **nie może niezależnie potwierdzić tożsamości wydawcy**. HTTPS chroni transport, nie zastępuje podpisu wydawcy. Nie używaj URL-i z tokenami ani sekretami.

## Pliki projektu

- `src/` — źródła modułów.
- `manifest/chromium.json` — profil dla Chrome/Edge.
- `manifest/firefox.json` — eksperymentalny profil Firefoksa; wymaga testów w rzeczywistej przeglądarce.
- `browser-extension/` — gotowy katalog rozszerzenia Chromium.
- `dist/chromium/`, `dist/firefox/` — wynik budowania profili.
- `build_extension.py` — budowanie katalogów rozszerzeń.
- `cat_app.py` — pomocniczy panel Windows z lokalnym testerem adresów.
- `installer/CatKittyEdition.iss` — opcjonalny instalator Windows.
- `tests/` — testy jednostkowe, kontraktowe i runtime z atrapą API przeglądarki.

## Budowanie i testy

Wymagania: Python 3.12+ oraz Node.js do testów runtime. Do budowania rozszerzenia nie są potrzebne dodatkowe biblioteki Python.

```bash
python build_extension.py chromium
python build_extension.py all
python -m unittest discover -s tests -v
node tests/test_runtime_contracts.js
```

Dla Firefoksa wynik trafia do `dist/firefox/`. Profil pozostaje eksperymentalny, dopóki nie zostanie sprawdzony na docelowych wersjach przeglądarki.

## Instalacja Chrome / Edge

1. Rozpakuj archiwum ZIP.
2. Otwórz `chrome://extensions` albo `edge://extensions`.
3. Włącz tryb dewelopera.
4. Kliknij **Załaduj rozpakowane** i wskaż folder `browser-extension`.

To procedura lokalnego testowania. Do publikacji w sklepie potrzebna jest właściwa procedura wydawnicza i przegląd uprawnień.

## Ograniczenia

- Lista filtrów jest ograniczona do 1000 unikalnych aktywnych domen i nie zastępuje kompletnego blokera.
- Licznik w UI oznacza elementy ukryte w DOM, a nie wszystkie żądania sieciowe zablokowane przez przeglądarkę.
- DNR i DOM nie zastępują antywirusa ani ochrony przed phishingiem.
- Integracja Bitdefender nie jest zaimplementowana. Wymaga oficjalnej dokumentacji SDK, potwierdzonej licencji i osobnych testów.
- Panel Tkinter i instalator są narzędziami wyłącznie dla Windows; rozszerzenie jest głównym komponentem dla Windows/Linux.
- Automatyczne testy nie zastępują końcowych testów w Chrome/Edge/Firefox z kontrolą formularzy, logowania, płatności, multimediów i nawigacji.
