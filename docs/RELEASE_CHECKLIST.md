# Lista kontrolna wydania

- [ ] Zbudować pakiet przez `python build_extension.py chromium`.
- [ ] Uruchomić testy Python oraz sprawdzić poprawność JSON/manifestu.
- [ ] Ręcznie sprawdzić aktualną wersję Chrome i Edge.
- [ ] Jeśli publikowany jest Firefox, zbudować jego profil, sprawdzić go w Firefox 133+ i zarejestrować unikalny identyfikator dodatku.
- [ ] Sprawdzić formularze, logowanie, płatności, odtwarzacze, nawigację, czytniki ekranu i strony z dużym DOM.
- [ ] Sprawdzić wyłączenie ochrony, wyłączenie Ad. Clean i przywracanie DOM.
- [ ] Sprawdzić dodawanie/usuwanie wyjątków, również domeny nadrzędnej i subdomen.
- [ ] Sprawdzić dziennik przy włączonej/wyłączonej diagnostyce; nie powinien zawierać pełnych URL.
- [ ] Potwierdzić, że błędny zestaw reguł nie jest instalowany; DNR powinien zachować poprzedni działający zestaw po odrzuconej aktualizacji dynamicznej.
- [ ] Przeprowadzić przegląd bezpieczeństwa i dostępności.
- [ ] Nie deklarować integracji z Bitdefenderem, dopóki nie ma odpowiedniej dokumentacji/licencji i testów.
- [ ] Dla każdego źródła zdalnego sprawdzić HTTPS, zgodę originu i limit rozmiaru 256 KiB.
- [ ] Sprawdzić źródło z przypiętym SHA-256 oraz źródło z plikiem `.sha256`; błędny hash musi zachować poprzednie reguły.
- [ ] Sprawdzić odrzucanie odpowiedzi HTML, błędnego UTF-8 i przekierowań do innego originu.
- [ ] Sprawdzić, że błąd jednego źródła nie aktywuje częściowo pozostałych list.
- [ ] Sprawdzić harmonogram 6/12/24 h, wyłączony domyślnie, oraz wyłączenie harmonogramu po usunięciu ostatniego źródła.
- [ ] Sprawdzić, że rollback przywraca listę ręczną, cache zdalnych źródeł i konfigurację źródeł.
- [ ] Sprawdzić, że globalne wyłączenie ochrony usuwa także dynamiczne reguły blokujące i że UI nie raportuje ich jako aktywnych.


## CAT 0.7.0 — dodatkowa lista kontrolna
- [ ] Potwierdzić testami rzeczywistej przeglądarki, że `urlFilter`, `domainType`, `initiatorDomains` oraz reguły `allow` zachowują oczekiwaną semantykę.
- [ ] Sprawdzić popularne strony z logowaniem, formularzami, płatnościami i multimediami.
- [ ] Zweryfikować w UI licznik reguł obsłużonych i pominiętych.
- [ ] Nie reklamować tego wydania jako pełnej zgodności EasyList/ABP; parser obsługuje wyłącznie udokumentowany podzbiór.


## CAT 1.0.0 — lista kontrolna podglądu filtrów
- [ ] Sprawdzić podgląd listy mieszanej: domeny, hosts, reguły blokujące, wyjątki i wpisy nieobsługiwane.
- [ ] Potwierdzić, że podgląd nie zmienia `chrome.storage.local`, dynamicznych reguł DNR ani uprawnień hosta.
- [ ] Sprawdzić pustą listę, listę wyłącznie nieobsługiwaną, HTML, nieprawidłową domenę i wejście większe niż 256 KiB.
- [ ] Potwierdzić, że wyniki użytkownika są renderowane przez `textContent`, a nie jako HTML.
- [ ] Rzeczywiście zainstalować rozszerzenie w Chromium; przetestować Firefox oddzielnie przed deklarowaniem zgodności.


## CAT 1.0.0 Stable — dodatkowe kryteria wydania
- [ ] `python build_extension.py all` buduje Chromium, jego kopię dystrybucyjną i profil Firefox.
- [ ] `python -m unittest discover -s tests -v`, `node tests/test_runtime_contracts.js` i `python release_gate.py` kończą się kodem 0.
- [ ] Zweryfikowano zgodność wersji `1.0.0` w package, kontraktach, manifestach i wygenerowanych pakietach.
- [ ] Sprawdzono sumy SHA-256 i brak `__pycache__` / `.pyc` w paczkach.
- [ ] Nie oznaczono testów w rzeczywistych przeglądarkach jako PASS bez wykonania zgodnie z `docs/BROWSER_REGRESSION_1.0.0_PL.md`.
- [ ] Firefox wciąż ma status eksperymentalny, dopóki osobne testy nie przejdą.
