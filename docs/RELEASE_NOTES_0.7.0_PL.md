# CAT — KITTY EDITION 0.7.0

## Cel wydania

Obsługa ograniczonego podzbioru sieciowych filtrów Adblock Plus, jawne raportowanie reguł nieobsługiwanych oraz limity wydajności. Zachowano zasadę prywatności lokalnej, pobieranie tylko przez HTTPS z uprawnieniem do originu oraz transakcyjną aktywację ostatniego poprawnego zestawu.

## Obsługiwane wzorce sieciowe

- `||ads.example^` — kotwica domenowa i separator.
- `|https://example.com/path|` oraz `*` — podstawowe kotwice i wildcard zgodne z `urlFilter` DNR.
- `@@||example.com/allowed^` — wyjątek typu `allow`.
- Opcje: `script`, `image`, `stylesheet`, `font`, `subdocument`, `xmlhttprequest`, `ping`, `media`, `other`, `third-party`/`3p`, `first-party`/`1p`, `domain=` z wykluczeniami `~domain`, `match-case`.
- Globalne, niezakotwiczone wyjątki `allow` są odrzucane, aby pojedyncza reguła nie mogła wyłączyć większości ochrony.
- W źródłach mogą pozostać domeny i podstawowe wpisy hosts obsługiwane w 0.6.0.

## Limit i bezpieczne pomijanie

Maksymalnie 500 unikalnych reguł sieciowych jest aktywowanych razem ze źródeł. Nie są wykonywane: filtry regex, filtry kosmetyczne, `redirect`, `removeparam`, `csp`, `badfilter`, nieznane opcje i konstrukcje poza podzbiorem. Są liczone jako pominięte; Cat nie próbuje ich interpretować jako domen. Jeżeli źródło nie zawiera żadnej poprawnej reguły, aktualizacja jest odrzucana.

## Walidacja

- Testy jednostkowe i kontraktowe parsera, deduplikacji, opcji typu zasobu, wyjątków i limitów.
- Test runtime potwierdza, że błąd aktualizacji nie zastępuje ostatniej poprawnej konfiguracji.
- Test syntetyczny parsuje setki reguł i sprawdza limit czasu w środowisku testowym.
- Nie wykonano potwierdzonego testu całego rozszerzenia w rzeczywistych przeglądarkach; paczka Firefox nadal jest eksperymentalna.
