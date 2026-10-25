# Security Policy

## Zgłaszanie problemów

Nie publikuj publicznie danych, tokenów ani szczegółów umożliwiających wykorzystanie podatności. Do zgłoszenia dołącz wersję Cat, przeglądarkę, kroki reprodukcji i minimalny zrzut logu po usunięciu danych osobowych.

## Bezpieczne źródła filtrów (1.0.0)

- Tylko HTTPS, nazwa DNS (bez lokalnych hostów i dosłownych adresów IP).
- Uprawnienie do originu jest żądane po świadomym dodaniu źródła przez użytkownika.
- Brak cookies/poświadczeń w pobieraniu; limit 256 KiB i timeout 15 sekund.
- Przekierowania do innego originu są odrzucane.
- Opcjonalny przypięty SHA-256 albo plik `.sha256` na tym samym originie.
- Struktura listy i reguły DNR są walidowane przed zmianą reguł. Błąd nie powinien zastąpić ostatniego poprawnego zestawu.
- Reguły sieciowe pochodzące ze źródeł są ograniczone do udokumentowanego podzbioru ABP, maksymalnie 500 aktywnych wpisów. Nieobsługiwane opcje nie są wykonywane.
- Automatyczne aktualizacje są wyłączone domyślnie.

Przypięty hash uwierzytelnia dokładną treść względem wartości podanej przez użytkownika. Plik sumy z tego samego originu zakłada zaufanie do tego wydawcy i jego kanału HTTPS. Hash obliczony bez niezależnego wzorca jest identyfikatorem zawartości, nie dowodem pochodzenia.

## Zakres

Cat nie zastępuje antywirusa, zapory sieciowej ani ochrony przed phishingiem. Adapter Bitdefender pozostaje nieaktywny, dopóki nie zostanie potwierdzone prawo do użycia oficjalnego SDK.
