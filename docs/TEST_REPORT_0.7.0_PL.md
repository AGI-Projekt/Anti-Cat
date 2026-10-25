# Raport testów — CAT Kitty Edition 0.7.0

Data: 2026-10-25

## Wynik

- Testy jednostkowe/kontraktowe Python: **27/27 PASS**.
- Testy runtime JavaScript serwisowego workera: **PASS**.
- Kontrola składni JavaScript (worker, opcje, detector, cleaner): **PASS**.
- Parsowanie AST wszystkich plików Python: **PASS**.
- Walidacja wszystkich plików JSON: **PASS**.
- Spójność źródeł z gotowym pakietem Chromium: **PASS**.
- Test integralności archiwów ZIP: wykonywany ponownie po utworzeniu artefaktów wydania.

## Scenariusze runtime

- źródła HTTPS wymagają przyznania uprawnienia do originu;
- pin SHA-256 i plik kontrolny są walidowane przed aktywacją;
- odpowiedź HTML, błędna suma i źródło bez obsługiwanych reguł nie zastępują ostatniego poprawnego zestawu;
- rollback przywraca także reguły sieciowe ABP;
- reguły `@@` są mapowane na reguły DNR `allow`;
- opcje typu zasobu, `first-party`/`third-party` oraz `domain=` są mapowane na warunki DNR;
- globalny, niezakotwiczony wyjątek `allow` jest pomijany;
- syntetyczna aktualizacja 300 reguł zakończyła się w ok. **12 ms** w tym środowisku testowym;
- przekroczone limity i nieobsługiwane opcje nie powinny aktywować wadliwego zestawu.

## Zakres składni ABP

Obsługiwany jest konserwatywny podzbiór reguł sieciowych: kotwice `||`, `|`, wildcard `*`, separator `^`, wyjątki `@@`, typy zasobów, `first-party`/`third-party`, `domain=` oraz `match-case`. Limit aktywnych sieciowych reguł zewnętrznych wynosi 500.

Nie są wykonywane filtry kosmetyczne, regex, `redirect`, `removeparam`, CSP, `badfilter` ani nieznane opcje. Są pomijane i raportowane. Nie jest to pełna implementacja EasyList/Adblock Plus.

## Ograniczenia testów

Testy runtime korzystają z atrap WebExtensions API. Nie potwierdzają instalacji ani działania rozszerzenia w rzeczywistym Chrome, Edge czy Firefox. Wydanie Firefox pozostaje eksperymentalne. Przed stabilnym wydaniem trzeba przeprowadzić testy manualne na kontrolowanych stronach obejmujące logowanie, formularze, płatności, multimedia, nawigację i wyjątki.
