from __future__ import annotations

import json
import os
import re
import ipaddress
import shutil
import subprocess
import sys
import webbrowser
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
import tkinter as tk
from tkinter import ttk, messagebox

APP_NAME = "Cat — Kitty Edition"
APP_VERSION = "1.0.0"
BG = "#0B0D14"
PANEL = "#151925"
PANEL_2 = "#1B2230"
TEXT = "#F4F6FA"
MUTED = "#A9B2C3"
GOLD = "#F0BE58"
CYAN = "#5DDCFF"
GREEN = "#72D6A2"
RED = "#FF7E85"

AD_HOSTS = (
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adservice.google.com",
    "adnxs.com",
    "taboola.com",
    "outbrain.com",
    "criteo.com",
    "adsrvr.org",
    "amazon-adsystem.com",
)
SUSPICIOUS_TOKENS = ("malware", "phishing", "credential-steal", "fake-update")


def app_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def data_dir() -> Path:
    base = Path(os.environ.get("APPDATA", str(Path.home() / ".config")))
    path = base / "CatKittyEdition"
    path.mkdir(parents=True, exist_ok=True)
    return path


DATA_DIR = data_dir()
SETTINGS_PATH = DATA_DIR / "settings.json"
LOG_PATH = DATA_DIR / "activity.jsonl"

DEFAULT_SETTINGS = {
    "save_local_log": True,
    "show_startup_guide": True,
    "theme": "dark",
}


def load_settings() -> dict:
    try:
        raw = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
        return {**DEFAULT_SETTINGS, **raw}
    except (OSError, json.JSONDecodeError, TypeError):
        return DEFAULT_SETTINGS.copy()


def save_settings(settings: dict) -> None:
    SETTINGS_PATH.write_text(
        json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def write_event(module: str, action: str, detail: str = "") -> None:
    settings = load_settings()
    if not settings.get("save_local_log", True):
        return
    event = {
        "time": datetime.now().astimezone().isoformat(timespec="seconds"),
        "module": module,
        "action": action,
        "detail": detail[:180],
    }
    try:
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
        # Keep the last 500 events to bound local storage.
        lines = LOG_PATH.read_text(encoding="utf-8").splitlines()
        if len(lines) > 500:
            LOG_PATH.write_text("\n".join(lines[-500:]) + "\n", encoding="utf-8")
    except OSError:
        pass


def classify_url(raw_url: str) -> tuple[str, str, str]:
    """Offline URL pattern check. It does not fetch or visit the supplied address."""
    raw_url = raw_url.strip()
    if not raw_url:
        return "REVIEW", "Brak adresu", "Wpisz adres URL do lokalnego testu."
    candidate = raw_url if "://" in raw_url else "https://" + raw_url
    try:
        parsed = urlparse(candidate)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise ValueError("invalid URL")
        host = parsed.hostname.lower().rstrip(".")
        # Validate IP literals and DNS labels; urlparse itself accepts some malformed host strings.
        try:
            ipaddress.ip_address(host)
        except ValueError:
            try:
                ascii_host = host.encode("idna").decode("ascii")
            except UnicodeError as exc:
                raise ValueError("invalid hostname") from exc
            if len(ascii_host) > 253 or not ascii_host:
                raise ValueError("invalid hostname")
            labels = ascii_host.split(".")
            if any(
                not label
                or len(label) > 63
                or not re.fullmatch(r"[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?", label)
                for label in labels
            ):
                raise ValueError("invalid hostname")
    except (ValueError, UnicodeError):
        return "REVIEW", "Niepoprawny adres", "Nie udało się odczytać poprawnego hosta."

    for domain in AD_HOSTS:
        if host == domain or host.endswith("." + domain):
            return "BLOCK", "Dopasowanie do lokalnej listy", f"Host pasuje do wzorca: {domain}"
    if any(token in host for token in SUSPICIOUS_TOKENS):
        return "REVIEW", "Podejrzany wzorzec", "To tylko heurystyka; nie jest dowodem złośliwości."
    return "ALLOW", "Brak dopasowania", "Test lokalny nie wykrył wzorca z wbudowanej listy."


class CatApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{APP_NAME} · {APP_VERSION}")
        self.geometry("1060x760")
        self.minsize(900, 650)
        self.configure(bg=BG)
        self.settings = load_settings()
        self._logo_photo = None
        self._build_styles()
        self._build_layout()
        write_event("application", "start", f"Cat {APP_VERSION} opened")
        self.refresh_activity()

    def _build_styles(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TFrame", background=BG)
        style.configure("Panel.TFrame", background=PANEL)
        style.configure("TLabel", background=BG, foreground=TEXT, font=("Segoe UI", 10))
        style.configure("Muted.TLabel", background=BG, foreground=MUTED, font=("Segoe UI", 9))
        style.configure("Panel.TLabel", background=PANEL, foreground=TEXT, font=("Segoe UI", 10))
        style.configure("Title.TLabel", background=BG, foreground=TEXT, font=("Segoe UI Semibold", 23))
        style.configure("Subtitle.TLabel", background=BG, foreground=MUTED, font=("Segoe UI", 10))
        style.configure("CardTitle.TLabel", background=PANEL, foreground=TEXT, font=("Segoe UI Semibold", 12))
        style.configure("CardText.TLabel", background=PANEL, foreground=MUTED, font=("Segoe UI", 9), wraplength=250)
        style.configure("Gold.TButton", font=("Segoe UI Semibold", 10), padding=(13, 9), background=GOLD, foreground="#19130A")
        style.map("Gold.TButton", background=[("active", "#FFD780"), ("disabled", "#695A3A")])
        style.configure("Dark.TButton", font=("Segoe UI", 10), padding=(11, 8), background=PANEL_2, foreground=TEXT)
        style.map("Dark.TButton", background=[("active", "#2A3447")])
        style.configure("TNotebook", background=BG, borderwidth=0)
        style.configure("TNotebook.Tab", background=PANEL, foreground=MUTED, padding=(16, 10), font=("Segoe UI Semibold", 10))
        style.map("TNotebook.Tab", background=[("selected", PANEL_2)], foreground=[("selected", GOLD)])
        style.configure("TCheckbutton", background=PANEL, foreground=TEXT, font=("Segoe UI", 10))
        style.map("TCheckbutton", background=[("active", PANEL)], foreground=[("active", TEXT)])

    def _build_layout(self) -> None:
        header = tk.Frame(self, bg=BG, padx=24, pady=16)
        header.pack(fill="x")
        image_path = app_base_dir() / "assets" / "kitty-logo.png"
        if not image_path.exists():
            image_path = app_base_dir() / "assets" / "cat-256.png"
        try:
            from PIL import Image, ImageTk
            image = Image.open(image_path).convert("RGBA")
            image.thumbnail((92, 92), Image.Resampling.LANCZOS)
            self._logo_photo = ImageTk.PhotoImage(image)
            tk.Label(header, image=self._logo_photo, bg=BG).pack(side="left", padx=(0, 16))
        except Exception:
            tk.Label(header, text="🐱", font=("Segoe UI Emoji", 42), fg=GOLD, bg=BG).pack(side="left", padx=(0, 16))
        title_area = tk.Frame(header, bg=BG)
        title_area.pack(side="left", fill="y", expand=True)
        tk.Label(title_area, text="CAT", font=("Segoe UI Semibold", 30), fg=GOLD, bg=BG).pack(anchor="w")
        tk.Label(title_area, text="KITTY EDITION  ·  PANEL WINDOWS", font=("Segoe UI Semibold", 10), fg=CYAN, bg=BG).pack(anchor="w")
        tk.Label(title_area, text="Spokojna kotka. Czytelna ochrona. Twoje ustawienia.", font=("Segoe UI", 10), fg=MUTED, bg=BG).pack(anchor="w", pady=(5, 0))
        status = tk.Frame(header, bg=PANEL, padx=14, pady=10, highlightbackground="#293244", highlightthickness=1)
        status.pack(side="right", anchor="center")
        tk.Label(status, text="●  PANEL GOTOWY", fg=GREEN, bg=PANEL, font=("Segoe UI Semibold", 10)).pack(anchor="w")
        tk.Label(status, text="Rozszerzenie: sprawdź instalację", fg=MUTED, bg=PANEL, font=("Segoe UI", 9)).pack(anchor="w", pady=(4, 0))

        separator = tk.Frame(self, bg="#242B38", height=1)
        separator.pack(fill="x", padx=24, pady=(0, 15))

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=24, pady=(0, 12))
        self.dashboard_tab = ttk.Frame(self.notebook, padding=16)
        self.test_tab = ttk.Frame(self.notebook, padding=16)
        self.activity_tab = ttk.Frame(self.notebook, padding=16)
        self.settings_tab = ttk.Frame(self.notebook, padding=16)
        self.notebook.add(self.dashboard_tab, text="Przegląd")
        self.notebook.add(self.test_tab, text="Tester URL")
        self.notebook.add(self.activity_tab, text="Aktywność")
        self.notebook.add(self.settings_tab, text="Ustawienia")
        self._build_dashboard()
        self._build_tester()
        self._build_activity()
        self._build_settings()

        footer = tk.Frame(self, bg=BG, padx=24, pady=8)
        footer.pack(fill="x")
        tk.Label(footer, text=f"Cat {APP_VERSION} · Lokalny panel sterowania", fg=MUTED, bg=BG, font=("Segoe UI", 9)).pack(side="left")
        tk.Label(footer, text="Nie zastępuje programu antywirusowego", fg="#E7BD6B", bg=BG, font=("Segoe UI", 9)).pack(side="right")

    def _card(self, parent, title: str, text: str, status: str, status_color: str = CYAN):
        card = tk.Frame(parent, bg=PANEL, padx=16, pady=15, highlightbackground="#293244", highlightthickness=1)
        tk.Label(card, text=title, bg=PANEL, fg=TEXT, font=("Segoe UI Semibold", 12)).pack(anchor="w")
        tk.Label(card, text=text, bg=PANEL, fg=MUTED, font=("Segoe UI", 9), justify="left", wraplength=260).pack(anchor="w", pady=(8, 12))
        tk.Label(card, text=f"●  {status}", bg=PANEL, fg=status_color, font=("Segoe UI Semibold", 9)).pack(anchor="w")
        return card

    def _build_dashboard(self) -> None:
        intro = tk.Frame(self.dashboard_tab, bg=BG)
        intro.pack(fill="x", pady=(0, 18))
        tk.Label(intro, text="Witaj w Cat, Kitty!", bg=BG, fg=TEXT, font=("Segoe UI Semibold", 20)).pack(anchor="w")
        tk.Label(intro, text="Panel desktopowy jest pomocniczy. Właściwe blokowanie ruchu i oczyszczanie DOM realizuje rozszerzenie przeglądarki.", bg=BG, fg=MUTED, font=("Segoe UI", 10), wraplength=850, justify="left").pack(anchor="w", pady=(5, 0))

        cards = tk.Frame(self.dashboard_tab, bg=BG)
        cards.pack(fill="x")
        cards.columnconfigure((0, 1, 2), weight=1, uniform="cards")
        self._card(cards, "Anti-Cat Detector", "Lokalny tester URL i wzorców. Nie pobiera ani nie odwiedza testowanego adresu.", "GOTOWY", CYAN).grid(row=0, column=0, sticky="nsew", padx=(0, 8), pady=4)
        self._card(cards, "Ad Blocker", "Moduł rozszerzenia Chromium/Edge stosuje wbudowane reguły sieciowe.", "WYMAGA ROZSZERZENIA", GOLD).grid(row=0, column=1, sticky="nsew", padx=4, pady=4)
        self._card(cards, "Ad. Clean", "Rozszerzenie ukrywa wybrane, rozpoznane elementy reklamowe.", "WYMAGA ROZSZERZENIA", GOLD).grid(row=0, column=2, sticky="nsew", padx=(8, 0), pady=4)

        action_box = tk.Frame(self.dashboard_tab, bg=PANEL, padx=16, pady=16, highlightbackground="#293244", highlightthickness=1)
        action_box.pack(fill="x", pady=(18, 0))
        tk.Label(action_box, text="Pierwsze uruchomienie", bg=PANEL, fg=TEXT, font=("Segoe UI Semibold", 12)).pack(anchor="w")
        tk.Label(action_box, text="1. Otwórz folder rozszerzenia.  2. W Chrome lub Edge przejdź do menedżera rozszerzeń.  3. Włącz tryb dewelopera i wybierz „Załaduj rozpakowane”.  4. Wskaż folder browser-extension.", bg=PANEL, fg=MUTED, font=("Segoe UI", 9), justify="left", wraplength=850).pack(anchor="w", pady=(7, 12))
        buttons = tk.Frame(action_box, bg=PANEL)
        buttons.pack(anchor="w")
        ttk.Button(buttons, text="Otwórz folder rozszerzenia", style="Gold.TButton", command=self.open_extension_folder).pack(side="left", padx=(0, 8))
        ttk.Button(buttons, text="Pokaż instrukcję", style="Dark.TButton", command=self.show_extension_help).pack(side="left", padx=(0, 8))
        ttk.Button(buttons, text="Testuj adres URL", style="Dark.TButton", command=lambda: self.notebook.select(self.test_tab)).pack(side="left")

        note = tk.Frame(self.dashboard_tab, bg="#20202A", padx=12, pady=10)
        note.pack(fill="x", pady=(14, 0))
        tk.Label(note, text="Uwaga: ten panel samodzielnie nie przechwytuje ruchu przeglądarki i nie steruje Bitdefenderem. Integracja z Bitdefender SDK pozostaje opcjonalna i wymaga licencji.", bg="#20202A", fg="#F0CF8B", font=("Segoe UI", 9), wraplength=850, justify="left").pack(anchor="w")

    def _build_tester(self) -> None:
        tk.Label(self.test_tab, text="Lokalny tester URL", bg=BG, fg=TEXT, font=("Segoe UI Semibold", 19)).pack(anchor="w")
        tk.Label(self.test_tab, text="Tester sprawdza host względem małej listy wbudowanych wzorców. Nie łączy się z podanym adresem i nie jest pełnym skanerem bezpieczeństwa.", bg=BG, fg=MUTED, font=("Segoe UI", 10), wraplength=850, justify="left").pack(anchor="w", pady=(5, 14))
        self.url_var = tk.StringVar()
        entry = tk.Entry(self.test_tab, textvariable=self.url_var, bg=PANEL_2, fg=TEXT, insertbackground=TEXT, relief="flat", font=("Segoe UI", 12))
        entry.pack(fill="x", ipady=10, pady=(0, 10))
        entry.bind("<Return>", lambda _event: self.run_url_test())
        ttk.Button(self.test_tab, text="Sprawdź lokalnie", style="Gold.TButton", command=self.run_url_test).pack(anchor="w")
        self.result_panel = tk.Frame(self.test_tab, bg=PANEL, padx=16, pady=16, highlightbackground="#293244", highlightthickness=1)
        self.result_panel.pack(fill="x", pady=(18, 0))
        self.result_title = tk.Label(self.result_panel, text="Wynik pojawi się tutaj", bg=PANEL, fg=TEXT, font=("Segoe UI Semibold", 14))
        self.result_title.pack(anchor="w")
        self.result_detail = tk.Label(self.result_panel, text="Wprowadź host lub adres URL.", bg=PANEL, fg=MUTED, font=("Segoe UI", 10), wraplength=850, justify="left")
        self.result_detail.pack(anchor="w", pady=(8, 0))
        tk.Label(self.test_tab, text="Przykładowe wyniki: BLOCK — dopasowanie do lokalnej listy; REVIEW — adres nieprawidłowy lub podejrzany wzorzec; ALLOW — brak dopasowania. ALLOW nie oznacza certyfikatu bezpieczeństwa.", bg=BG, fg=MUTED, font=("Segoe UI", 9), wraplength=850, justify="left").pack(anchor="w", pady=(18, 0))

    def run_url_test(self) -> None:
        verdict, title, detail = classify_url(self.url_var.get())
        color = RED if verdict == "BLOCK" else GOLD if verdict == "REVIEW" else GREEN
        self.result_title.configure(text=f"{verdict}  ·  {title}", fg=color)
        self.result_detail.configure(text=detail)
        write_event("detector", "local_url_test", f"result={verdict}; category={title}")
        self.refresh_activity()

    def _build_activity(self) -> None:
        top = tk.Frame(self.activity_tab, bg=BG)
        top.pack(fill="x")
        tk.Label(top, text="Aktywność lokalna", bg=BG, fg=TEXT, font=("Segoe UI Semibold", 19)).pack(side="left")
        ttk.Button(top, text="Odśwież", style="Dark.TButton", command=self.refresh_activity).pack(side="right")
        tk.Label(self.activity_tab, text="Dziennik dotyczy działań panelu Cat. Nie jest historią przeglądania i nie pokazuje wszystkich blokad rozszerzenia.", bg=BG, fg=MUTED, font=("Segoe UI", 9), wraplength=850, justify="left").pack(anchor="w", pady=(6, 12))
        frame = tk.Frame(self.activity_tab, bg=PANEL)
        frame.pack(fill="both", expand=True)
        self.activity_text = tk.Text(frame, bg=PANEL, fg=TEXT, insertbackground=TEXT, relief="flat", wrap="word", font=("Consolas", 9), padx=12, pady=12, state="disabled")
        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=self.activity_text.yview)
        self.activity_text.configure(yscrollcommand=scrollbar.set)
        self.activity_text.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        buttons = tk.Frame(self.activity_tab, bg=BG)
        buttons.pack(fill="x", pady=(10, 0))
        ttk.Button(buttons, text="Wyczyść dziennik", style="Dark.TButton", command=self.clear_activity).pack(side="left")
        ttk.Button(buttons, text="Otwórz katalog danych", style="Dark.TButton", command=self.open_data_folder).pack(side="left", padx=(8, 0))

    def refresh_activity(self) -> None:
        if not hasattr(self, "activity_text"):
            return
        events = []
        try:
            for line in LOG_PATH.read_text(encoding="utf-8").splitlines()[-300:]:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        except OSError:
            pass
        output = "\n".join(
            f"{item.get('time', '?')}  [{item.get('module', '?')}] {item.get('action', '?')} — {item.get('detail', '')}"
            for item in reversed(events)
        ) or "Brak zapisanych zdarzeń."
        self.activity_text.configure(state="normal")
        self.activity_text.delete("1.0", "end")
        self.activity_text.insert("1.0", output)
        self.activity_text.configure(state="disabled")

    def clear_activity(self) -> None:
        if not messagebox.askyesno("Cat · Kitty", "Usunąć lokalny dziennik aktywności?"):
            return
        try:
            LOG_PATH.unlink(missing_ok=True)
        except OSError as exc:
            messagebox.showerror("Cat", f"Nie udało się wyczyścić dziennika: {exc}")
            return
        self.refresh_activity()

    def _build_settings(self) -> None:
        tk.Label(self.settings_tab, text="Ustawienia", bg=BG, fg=TEXT, font=("Segoe UI Semibold", 19)).pack(anchor="w")
        tk.Label(self.settings_tab, text="Preferencje dotyczą tego panelu. Reguły i stan rozszerzenia konfiguruje się osobno w przeglądarce.", bg=BG, fg=MUTED, font=("Segoe UI", 10), wraplength=850, justify="left").pack(anchor="w", pady=(6, 14))
        box = tk.Frame(self.settings_tab, bg=PANEL, padx=16, pady=16, highlightbackground="#293244", highlightthickness=1)
        box.pack(fill="x")
        self.save_log_var = tk.BooleanVar(value=self.settings.get("save_local_log", True))
        ttk.Checkbutton(box, text="Zapisuj lokalny dziennik aktywności", variable=self.save_log_var).pack(anchor="w", pady=5)
        self.show_guide_var = tk.BooleanVar(value=self.settings.get("show_startup_guide", True))
        ttk.Checkbutton(box, text="Pokaż instrukcję rozszerzenia po otwarciu pomocy", variable=self.show_guide_var).pack(anchor="w", pady=5)
        ttk.Button(self.settings_tab, text="Zapisz ustawienia", style="Gold.TButton", command=self.save_preferences).pack(anchor="w", pady=(14, 0))
        info = tk.Frame(self.settings_tab, bg=PANEL, padx=16, pady=14)
        info.pack(fill="x", pady=(16, 0))
        tk.Label(info, text="Dane lokalne", bg=PANEL, fg=TEXT, font=("Segoe UI Semibold", 11)).pack(anchor="w")
        tk.Label(info, text=str(DATA_DIR), bg=PANEL, fg=MUTED, font=("Consolas", 9), wraplength=830, justify="left").pack(anchor="w", pady=(6, 0))

    def save_preferences(self) -> None:
        self.settings["save_local_log"] = bool(self.save_log_var.get())
        self.settings["show_startup_guide"] = bool(self.show_guide_var.get())
        save_settings(self.settings)
        write_event("settings", "saved", "Local panel preferences saved")
        messagebox.showinfo("Cat · Kitty", "Ustawienia panelu zostały zapisane.")
        self.refresh_activity()

    def open_extension_folder(self) -> None:
        path = app_base_dir() / "browser-extension"
        if not path.exists():
            messagebox.showerror("Cat · Kitty", f"Nie znaleziono folderu rozszerzenia:\n{path}\n\nPrzy instalacji folder browser-extension powinien znajdować się obok programu.")
            return
        try:
            if sys.platform == "win32":
                os.startfile(str(path))  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(path)])
            else:
                subprocess.Popen(["xdg-open", str(path)])
            write_event("application", "extension_folder_opened", "Browser extension folder opened")
            self.refresh_activity()
        except Exception as exc:
            messagebox.showerror("Cat · Kitty", f"Nie udało się otworzyć folderu:\n{exc}")

    def show_extension_help(self) -> None:
        text = (
            "Instalacja rozszerzenia Cat w Chrome lub Edge\n\n"
            "1. Kliknij „Otwórz folder rozszerzenia” w panelu Cat.\n"
            "2. Otwórz chrome://extensions w Google Chrome albo edge://extensions w Microsoft Edge.\n"
            "3. Włącz „Tryb dewelopera”.\n"
            "4. Wybierz „Załaduj rozpakowane” / „Load unpacked”.\n"
            "5. Wskaż folder browser-extension z katalogu instalacyjnego Cat.\n"
            "6. Sprawdź, czy karta dodatku pokazuje wersję 1.0.0.\n\n"
            "Rozszerzenie nie jest instalowane automatycznie. To celowe: instalację dodatku przeglądarkowego zatwierdza użytkownik.\n"
            "Ta wersja nie integruje się bezpośrednio z silnikiem Bitdefender."
        )
        messagebox.showinfo("Cat · Kitty — instrukcja", text)

    def open_data_folder(self) -> None:
        try:
            if sys.platform == "win32":
                os.startfile(str(DATA_DIR))  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(DATA_DIR)])
            else:
                subprocess.Popen(["xdg-open", str(DATA_DIR)])
        except Exception as exc:
            messagebox.showerror("Cat", f"Nie udało się otworzyć katalogu danych: {exc}")


if __name__ == "__main__":
    app = CatApp()
    app.mainloop()
