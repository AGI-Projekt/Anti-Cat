# Raport testów — CAT Kitty Edition 0.8.0

**Data:** 25 października 2026 r.  
**Wersja reguł:** `2026.10.25.8`  
**Status:** testy automatyczne zaliczone; funkcjonalny test rozszerzenia w rzeczywistej przeglądarce nie został ukończony z powodu polityk środowiska.

## Podsumowanie

- **Python unittest:** 34/34 testów zaliczone.
- **Runtime JavaScript:** PASS; testy uruchomiono na kodzie service workera w środowisku VM z kontrolowanymi atrapami WebExtensions API.
- **Składnia:** `node --check` zaliczone dla service workera, `options.js` i skryptu runtime; sprawdzono także pozostałe pliki JS przez oddzielną kontrolę składni.
- **JSON:** 13 plików — walidacja zakończona powodzeniem.
- **HTML:** 8 plików — analiza składniowa zakończona powodzeniem.
- **Profile rozszerzeń:** zbudowano `browser-extension/`, `dist/chromium/` oraz `dist/firefox/`. Testy potwierdziły spójność plików i ścieżek wskazanych przez manifesty.

## Zakres Laboratorium filtrów

Testy fixture'ów obejmują listę mieszaną z domenami, wpisami hosts, regułami blokującymi, wyjątkami `@@` i wpisami nieobsługiwanymi oraz listę z samymi nieobsługiwanymi regułami. Testy weryfikują:

- liczbę rozpoznanych domen i reguł oraz kategoryzację pominięć;
- limit danych wejściowych 256 KiB;
- odrzucanie HTML i nieprawidłowej domeny;
- brak zmian w magazynie `storage.local` i dynamicznych regułach DNR;
- brak pobierania sieciowego i brak żądania uprawnień hosta;
- bezpieczne renderowanie wyników przez `textContent`.

## Testy runtime istniejących funkcji

Ponownie sprawdzono wyjątki, ręczne listy domen, przełącznik ochrony, listy zewnętrzne HTTPS, sumy SHA-256, odrzucanie HTML/niezgodnego hash, reguły sieciowe ABP w obsługiwanym podzbiorze, historię i rollback. Syntetyczne odświeżenie 300 reguł zakończyło się w około **11 ms** w tym środowisku; wynik nie stanowi gwarancji wydajności na każdym sprzęcie i w każdej przeglądarce.

## Ograniczenie testów w przeglądarce

Próba uruchomienia rozszerzenia w systemowym Chromium 144 nie dała uruchomionego service workera rozszerzenia. Środowisko ma politykę zarządzaną `ExtensionInstallBlocklist: ["*"]`, wyłączone narzędzia deweloperskie i blokadę nawigacji. Dlatego nie deklaruje się zakończonego testu integracyjnego w prawdziwym Chrome/Edge. Firefox pozostaje profilem eksperymentalnym i także wymaga testu ręcznego.

## Wniosek

CAT 0.8.0 jest zbudowaną wersją rozwojową, której testy automatyczne przeszły pomyślnie. Nie oznacza to jeszcze certyfikacji kompatybilności z przeglądarkami ani stabilności produkcyjnej. Przed wydaniem 1.0 należy przetestować instalację oraz działanie na kontrolowanych stronach, zwłaszcza formularze, logowanie, płatności, multimedia, wyjątki i reguły `allow`.
