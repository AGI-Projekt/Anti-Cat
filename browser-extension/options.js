"use strict";
const $ = (id) => document.getElementById(id);
let stateCache = null;

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else if (!response?.ok) reject(new Error(response?.error || "Operacja nie powiodła się."));
      else resolve(response);
    });
  });
}
function setStatus(text, isError = false) { $("status").textContent = text; $("status").style.color = isError ? "var(--red)" : "var(--green)"; }
function canonicalList(items) { return [...new Set((Array.isArray(items) ? items : []).filter((item) => typeof item === "string"))].sort(); }

function renderExceptions(exceptions) {
  const list = $("exception-list"); list.replaceChildren();
  for (const domain of canonicalList(exceptions)) {
    const item = document.createElement("li");
    const label = document.createElement("span"); label.textContent = domain;
    const remove = document.createElement("button"); remove.className = "secondary"; remove.textContent = "Usuń"; remove.setAttribute("aria-label", `Usuń wyjątek ${domain}`);
    remove.addEventListener("click", () => removeException(domain, remove));
    item.append(label, remove); list.append(item);
  }
  if (!list.children.length) { const item = document.createElement("li"); item.textContent = "Brak wyjątków. Ochrona działa na wszystkich zwykłych stronach."; list.append(item); }
}
function renderLogs(events) {
  const list = $("log-list"); list.replaceChildren();
  for (const event of (Array.isArray(events) ? events : [])) {
    const item = document.createElement("li");
    const title = document.createElement("div");
    title.textContent = `${event.category || "zdarzenie"} · ${event.action || "INFO"} · ${event.module || "Cat"}${event.ruleId ? ` · ${event.ruleId}` : ""}`;
    const meta = document.createElement("div"); meta.className = "log-meta";
    const date = new Date(event.time); meta.textContent = `${Number.isNaN(date.getTime()) ? "czas nieznany" : date.toLocaleString()}${event.site ? ` · ${event.site}` : ""}`;
    item.append(title, meta); list.append(item);
  }
  if (!list.children.length) { const item = document.createElement("li"); item.textContent = "Dziennik jest pusty."; list.append(item); }
}
function renderFilterSources(state) {
  $("filter-auto-update").checked = state.filterAutoUpdate === true;
  $("filter-update-interval").value = String([6, 12, 24].includes(state.filterUpdateIntervalHours) ? state.filterUpdateIntervalHours : 24);
  const sourceList = $("filter-source-list");
  sourceList.replaceChildren();
  const sources = Array.isArray(state.filterSources) ? state.filterSources : [];
  const remoteCache = Array.isArray(state.remoteFilterCache) ? state.remoteFilterCache : [];
  const configuredCount = Number.isSafeInteger(state.configuredFilterDomainCount) ? state.configuredFilterDomainCount : (state.activeFilterDomainCount || 0);
  const activeCount = Number.isSafeInteger(state.activeFilterDomainCount) ? state.activeFilterDomainCount : 0;
  const ruleCount = Number.isSafeInteger(state.activeFilterRuleCount) ? state.activeFilterRuleCount : 0;
  const configuredRuleCount = Number.isSafeInteger(state.configuredFilterRuleCount) ? state.configuredFilterRuleCount : ruleCount;
  const protectionNote = state.enabled === false ? ` Ochrona wyłączona; ${configuredCount} domen i ${configuredRuleCount} reguł skonfigurowanych, blokowanie dynamiczne nieaktywne.` : "";
  $("filter-update-summary").textContent = `${sources.length} źródeł · ${state.remoteFilterDomainCount || 0} unikalnych domen · ${activeCount}/1000 domen i ${ruleCount}/500 reguł sieciowych aktywnych · pominięte reguły źródeł: ${state.skippedFilterRuleCount || 0} · harmonogram ${state.filterAutoUpdate ? `włączony co ${state.filterUpdateIntervalHours || 24} h` : "wyłączony"}.${protectionNote}`;
  for (const source of sources) {
    const item = document.createElement("li");
    const info = document.createElement("div");
    const title = document.createElement("strong");
    let host = source.name || "źródło HTTPS";
    try { host = new URL(source.url).hostname; } catch (_) { /* display generic source name */ }
    title.textContent = host;
    const meta = document.createElement("div");
    meta.className = "source-meta";
    const cached = remoteCache.find((entry) => entry.sourceId === source.id);
    const digestMode = source.sha256 ? "przypięty SHA-256" : source.checksumUrl ? "zewnętrzny plik SHA-256" : "bez niezależnego wzorca SHA-256";
    const lastSuccess = source.lastSuccessAt ? new Date(source.lastSuccessAt).toLocaleString() : "jeszcze niepobrane";
    meta.textContent = `${digestMode} · ostatni sukces: ${lastSuccess} · domeny: ${cached ? cached.domains.length : 0} · reguły sieciowe: ${cached && Array.isArray(cached.rules) ? cached.rules.length : 0} · pominięto: ${source.lastSkippedRuleCount || 0}${source.lastHash ? ` · SHA-256: ${source.lastHash.slice(0, 16)}…` : ""}${source.lastError ? ` · Ostatni błąd: ${source.lastError}` : ""}`;
    info.append(title, meta);
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "Usuń";
    remove.setAttribute("aria-label", `Usuń źródło ${host}`);
    remove.addEventListener("click", async () => {
      if (!confirm(`Usunąć źródło ${host} i usunąć jego domeny z aktywnych reguł?`)) return;
      remove.disabled = true;
      try {
        await send({ type: "CAT_REMOVE_FILTER_SOURCE", sourceId: source.id });
        setStatus(`Usunięto źródło ${host}.`);
        await refresh();
      } catch (error) {
        setStatus(`Nie udało się usunąć źródła: ${error.message}`, true);
        remove.disabled = false;
      }
    });
    item.append(info, remove);
    sourceList.append(item);
  }
  if (!sources.length) {
    const item = document.createElement("li");
    item.textContent = "Nie dodano źródeł. Lista ręczna nadal działa niezależnie.";
    sourceList.append(item);
  }
  $("update-filter-sources").disabled = sources.length === 0;
}
function render(state) {
  stateCache = state;
  $("rollback-filter-list").disabled = !Array.isArray(state.filterHistory) || state.filterHistory.length === 0;
  $("logging-enabled").checked = state.loggingEnabled !== false;
  $("detailed-diagnostics").checked = state.detailedDiagnostics === true;
  $("motion-enabled").checked = state.motionEnabled !== false;
  $("rules-version").textContent = state.rulesVersion || "nieznana";
  renderExceptions(state.exceptions || []);
  $("custom-domains").value = (Array.isArray(state.customBlockedDomains) ? state.customBlockedDomains : []).join("\n");
  $("custom-filter-count").textContent = String((state.customBlockedDomains || []).length);
  renderLogs(state.decisionLog || []);
  renderFilterSources(state);
}
async function refresh() {
  try { const response = await send({ type: "CAT_GET_OPTIONS_STATE" }); render(response.state); }
  catch (error) { setStatus(`Błąd odczytu ustawień: ${error.message}`, true); }
}

$("save-settings").addEventListener("click", async () => {
  try {
    await send({ type: "CAT_SAVE_SETTINGS", settings: {
      loggingEnabled: $("logging-enabled").checked,
      detailedDiagnostics: $("detailed-diagnostics").checked,
      motionEnabled: $("motion-enabled").checked
    }});
    setStatus("Ustawienia zapisane lokalnie."); await refresh();
  } catch (error) { setStatus(`Nie udało się zapisać ustawień: ${error.message}`, true); }
});

$("add-domain").addEventListener("click", async () => {
  const domain = $("new-domain").value.trim();
  if (!domain) { setStatus("Wpisz domenę.", true); return; }
  const next = canonicalList([...(stateCache?.exceptions || []), domain]);
  try {
    const response = await send({ type: "CAT_SAVE_EXCEPTIONS", exceptions: next });
    $("new-domain").value = ""; setStatus("Wyjątek dodany.");
    stateCache.exceptions = response.exceptions; renderExceptions(response.exceptions); await refresh();
  } catch (error) { setStatus(`Nie udało się dodać wyjątku: ${error.message}`, true); }
});

async function removeException(domain, button) {
  button.disabled = true;
  try {
    const next = (stateCache?.exceptions || []).filter((item) => item !== domain);
    const response = await send({ type: "CAT_SAVE_EXCEPTIONS", exceptions: next });
    setStatus(`Usunięto wyjątek: ${domain}`); stateCache.exceptions = response.exceptions; renderExceptions(response.exceptions); await refresh();
  } catch (error) { setStatus(`Nie udało się usunąć wyjątku: ${error.message}`, true); button.disabled = false; }
}

$("clear-log").addEventListener("click", async () => {
  try { await send({ type: "CAT_CLEAR_LOG" }); setStatus("Dziennik wyczyszczony."); await refresh(); }
  catch (error) { setStatus(`Nie udało się wyczyścić dziennika: ${error.message}`, true); }
});

function exportSettings() {
  if (!stateCache) { setStatus("Ustawienia nie są jeszcze dostępne.", true); return; }
  const payload = {
    format: "cat-kitty-settings",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      loggingEnabled: stateCache.loggingEnabled !== false,
      detailedDiagnostics: stateCache.detailedDiagnostics === true,
      motionEnabled: stateCache.motionEnabled !== false
    },
    exceptions: canonicalList(stateCache.exceptions || []),
    customBlockedDomains: canonicalList(stateCache.customBlockedDomains || [])
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "cat-kitty-settings.json";
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("Eksport ustawień gotowy. Dziennik nie został dołączony.");
}

async function importSettingsFile(file) {
  if (!file || file.size > 256 * 1024) throw new Error("Plik musi mieć maksymalnie 256 KB.");
  const raw = await file.text();
  let payload;
  try { payload = JSON.parse(raw); } catch (_) { throw new Error("Plik nie zawiera poprawnego JSON."); }
  if (!payload || payload.format !== "cat-kitty-settings" || payload.schemaVersion !== 1 || !payload.settings || !Array.isArray(payload.exceptions) || (payload.customBlockedDomains !== undefined && !Array.isArray(payload.customBlockedDomains))) {
    throw new Error("Nieobsługiwany format kopii ustawień.");
  }
  if (payload.exceptions.length > 100 || payload.exceptions.some((x) => typeof x !== "string" || x.length > 253)) {
    throw new Error("Lista wyjątków jest nieprawidłowa lub przekracza limit 100 domen.");
  }
  const settings = {};
  for (const key of ["loggingEnabled", "detailedDiagnostics", "motionEnabled"]) {
    if (typeof payload.settings[key] !== "boolean") throw new Error(`Nieprawidłowa wartość ustawienia: ${key}.`);
    settings[key] = payload.settings[key];
  }
  // The background worker validates domains and atomically replaces managed DNR rules.
  await send({ type: "CAT_SAVE_EXCEPTIONS", exceptions: payload.exceptions });
  if (payload.customBlockedDomains !== undefined) await send({ type: "CAT_SAVE_CUSTOM_FILTERS", domains: payload.customBlockedDomains });
  await send({ type: "CAT_SAVE_SETTINGS", settings });
  setStatus("Ustawienia zaimportowane. Sprawdź listę wyjątków.");
  await refresh();
}

$("export-settings").addEventListener("click", exportSettings);
$("import-settings").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (!confirm("Import zastąpi bieżącą listę wyjątków i ustawienia prywatności. Kontynuować?")) return;
    await importSettingsFile(file);
  } catch (error) { setStatus(`Import nie powiódł się: ${error.message}`, true); }
  finally { event.target.value = ""; }
});


function parseCustomDomains(text) {
  const entries = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (entries.length > 200) throw new Error("Lista może zawierać maksymalnie 200 domen.");
  if (entries.some((entry) => entry.length > 253 || entry.includes("/") || entry.includes(":") || /\s/.test(entry))) {
    throw new Error("Każdy wpis musi być samą domeną, bez protokołu, ścieżki i spacji.");
  }
  return [...new Set(entries)];
}
function renderFilterPreview(preview) {
  const output = $("filter-preview-result");
  output.replaceChildren();
  const summary = document.createElement("p");
  summary.textContent = `Analiza lokalna: ${preview.lineCount} wierszy; ${preview.supportedDomainCount} unikalnych domen i ${preview.supportedRuleCount} reguł sieciowych rozpoznanych; ${preview.skippedRuleCount} wpisów pominiętych. Aktywacja: nie. Zapis: nie.`;
  output.append(summary);
  const reasons = Object.entries(preview.skippedReasons || {}).sort(([a], [b]) => a.localeCompare(b));
  if (reasons.length) {
    const reasonLine = document.createElement("p");
    reasonLine.textContent = `Powody pominięcia: ${reasons.map(([name, count]) => `${name}: ${count}`).join(" · ")}`;
    output.append(reasonLine);
  }
  if (preview.exampleDomains?.length) {
    const domains = document.createElement("p");
    domains.textContent = `Przykładowe domeny: ${preview.exampleDomains.join(", ")}`;
    output.append(domains);
  }
  if (preview.exampleRules?.length) {
    const rules = document.createElement("p");
    rules.textContent = `Przykładowe reguły: ${preview.exampleRules.map((rule) => `${rule.action.toUpperCase()} ${rule.filter} [${rule.resourceTypes.join(", ")}]`).join(" | ")}`;
    output.append(rules);
  }
  if (!preview.supportedDomainCount && !preview.supportedRuleCount) {
    const warning = document.createElement("p");
    warning.textContent = "Nie znaleziono obsługiwanych wpisów. Lista nie nadaje się do aktywacji w obecnej wersji Cat.";
    output.append(warning);
  }
}

$("preview-filter-list").addEventListener("click", async () => {
  const button = $("preview-filter-list");
  const text = $("filter-preview-text").value;
  if (!text.trim()) { setStatus("Wklej tekst listy do analizy.", true); return; }
  button.disabled = true;
  try {
    const response = await send({ type: "CAT_PREVIEW_FILTER_TEXT", text });
    renderFilterPreview(response.preview);
    setStatus("Podgląd zakończony. Aktywne reguły nie zostały zmienione.");
  } catch (error) {
    $("filter-preview-result").textContent = `Nie udało się przeanalizować listy: ${error.message}`;
    setStatus(`Podgląd nie powiódł się: ${error.message}`, true);
  } finally { button.disabled = false; }
});

$("clear-filter-preview").addEventListener("click", () => {
  $("filter-preview-text").value = "";
  $("filter-preview-result").textContent = "Nie wykonano analizy.";
  setStatus("Wyczyszczono podgląd. Nie zmieniono aktywnych reguł.");
});

$("save-custom-filters").addEventListener("click", async () => {
  try {
    const domains = parseCustomDomains($("custom-domains").value);
    const response = await send({ type: "CAT_SAVE_CUSTOM_FILTERS", domains });
    setStatus(`Zastosowano listę: ${response.count} domen.`);
    await refresh();
  } catch (error) { setStatus(`Nie udało się zastosować listy: ${error.message}`, true); }
});
$("clear-custom-filters").addEventListener("click", async () => {
  if (!confirm("Usunąć wszystkie własne reguły blokowania?")) return;
  try {
    await send({ type: "CAT_CLEAR_CUSTOM_FILTERS" });
    $("custom-domains").value = "";
    setStatus("Własna lista filtrów została wyczyszczona.");
    await refresh();
  } catch (error) { setStatus(`Nie udało się wyczyścić listy: ${error.message}`, true); }
});

function validateSourceUrl(value, fieldName) {
  let url;
  try { url = new URL(value.trim()); } catch (_) { throw new Error(`${fieldName}: wpisz prawidłowy adres HTTPS.`); }
  if (url.protocol !== "https:") throw new Error(`${fieldName}: dozwolone jest wyłącznie HTTPS.`);
  if (url.username || url.password) throw new Error(`${fieldName}: adres nie może zawierać danych logowania.`);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const reservedSuffixes = [".localhost", ".local", ".internal", ".test", ".invalid", ".example", ".home.arpa"];
  if (!hostname.includes(".") || hostname.includes(":") || hostname.startsWith("[") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === "localhost" || reservedSuffixes.some((suffix) => hostname.endsWith(suffix)) || url.port) {
    throw new Error(`${fieldName}: użyj publicznej nazwy DNS przez standardowy HTTPS, nie adresu IP, hosta lokalnego ani portu niestandardowego.`);
  }
  url.hostname = hostname;
  url.hash = "";
  return url;
}
function requestOriginPermissions(origins) {
  return new Promise((resolve, reject) => {
    if (!chrome.permissions || typeof chrome.permissions.request !== "function") {
      reject(new Error("Ta przeglądarka nie udostępnia prośby o uprawnienie do hosta."));
      return;
    }
    chrome.permissions.request({ origins }, (granted) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(Boolean(granted));
    });
  });
}

$("add-filter-source").addEventListener("click", async () => {
  try {
    const url = validateSourceUrl($("filter-source-url").value, "Adres listy");
    const checksumText = $("filter-source-checksum-url").value.trim();
    const checksumUrl = checksumText ? validateSourceUrl(checksumText, "Adres sumy kontrolnej") : null;
    if (checksumUrl && checksumUrl.origin !== url.origin) throw new Error("Plik sumy kontrolnej musi być na tym samym originie co lista.");
    const sha256 = $("filter-source-sha256").value.trim().toLowerCase();
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("SHA-256 musi zawierać dokładnie 64 znaki szesnastkowe.");
    if (sha256 && checksumUrl) throw new Error("Wybierz przypięty SHA-256 albo adres pliku kontrolnego, nie oba naraz.");
    const origins = [...new Set([url.origin, checksumUrl?.origin].filter(Boolean).map((origin) => `${origin}/*`))];
    const granted = await requestOriginPermissions(origins);
    if (!granted) throw new Error("Nie przyznano dostępu do hosta. Źródło nie zostało dodane.");
    const response = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: url.href, checksumUrl: checksumUrl?.href || null, sha256: sha256 || null } });
    $("filter-source-url").value = "";
    $("filter-source-sha256").value = "";
    $("filter-source-checksum-url").value = "";
    setStatus(`Dodano źródło ${response.source.name}. Lista nie zostanie aktywowana, dopóki nie przejdzie pobierania i walidacji.`);
    await refresh();
  } catch (error) { setStatus(`Nie udało się dodać źródła: ${error.message}`, true); }
});

$("update-filter-sources").addEventListener("click", async () => {
  const button = $("update-filter-sources");
  button.disabled = true;
  try {
    const response = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
    setStatus(`Zaktualizowano ${response.sourceCount} źródeł; ${response.remoteDomainCount} domen, ${response.remoteRuleCount || 0} reguł sieciowych; pominięto ${response.skippedRuleCount || 0} nieobsługiwanych wpisów.`);
    await refresh();
  } catch (error) {
    setStatus(`Aktualizacja nie powiodła się: ${error.message}`, true);
    await refresh();
  } finally { button.disabled = false; }
});

$("save-filter-schedule").addEventListener("click", async () => {
  try {
    const enabled = $("filter-auto-update").checked;
    const intervalHours = Number.parseInt($("filter-update-interval").value, 10);
    const response = await send({ type: "CAT_SET_FILTER_UPDATE_SCHEDULE", enabled, intervalHours });
    setStatus(response.enabled ? `Harmonogram włączony: co ${response.intervalHours} godzin.` : "Automatyczne aktualizacje wyłączone.");
    await refresh();
  } catch (error) { setStatus(`Nie udało się zapisać harmonogramu: ${error.message}`, true); await refresh(); }
});

refresh();


function parseImportedFilterList(raw) {
  const lines = raw.split(/\r?\n/);
  const domains = [];
  for (const original of lines) {
    const line = original.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    let domain = line;
    const hosts = line.match(/^(?:0\.0\.0\.0|127\.0\.0\.1|::1|0{1,4}(?::0{1,4}){7})\s+([^\s#]+)/i);
    if (hosts) domain = hosts[1];
    if (domain.includes(" ") || domain.includes("\t") || domain.includes("/") || domain.includes(":") || domain.length > 253) {
      throw new Error(`Nieobsługiwany wpis listy: ${line.slice(0, 80)}`);
    }
    if (!/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(domain)) {
      throw new Error(`Nieprawidłowa domena: ${domain.slice(0, 80)}`);
    }
    domains.push(domain.toLowerCase().replace(/\.$/, ""));
  }
  const unique = [...new Set(domains)];
  if (unique.length > 200) throw new Error("Import może zawierać maksymalnie 200 domen.");
  if (!unique.length) throw new Error("Nie znaleziono żadnych domen do importu.");
  return unique;
}

$("import-filter-list").addEventListener("click", () => $("filter-list-file").click());
$("filter-list-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 256 * 1024) throw new Error("Plik może mieć maksymalnie 256 KB.");
    const domains = parseImportedFilterList(await file.text());
    if (!confirm(`Zastąpić bieżącą listę ${stateCache?.customBlockedDomains?.length || 0} domen nową listą (${domains.length})? Poprzednia wersja zostanie zachowana do wycofania.`)) return;
    const response = await send({ type: "CAT_SAVE_CUSTOM_FILTERS", domains });
    $("custom-domains").value = response.domains.join("\n");
    setStatus(`Zaimportowano ${response.count} domen. Poprzednia lista może być przywrócona.`);
    await refresh();
  } catch (error) { setStatus(`Import listy nie powiódł się: ${error.message}`, true); }
  finally { event.target.value = ""; }
});

$("export-filter-list").addEventListener("click", () => {
  const domains = Array.isArray(stateCache?.customBlockedDomains) ? stateCache.customBlockedDomains : [];
  const blob = new Blob([`# Cat — Kitty Edition filter list\n# Exported ${new Date().toISOString()}\n${domains.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "cat-custom-filters.txt";
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus(`Wyeksportowano ${domains.length} domen.`);
});

$("rollback-filter-list").addEventListener("click", async () => {
  if (!confirm("Przywrócić poprzednią listę domen? Bieżąca lista zostanie zachowana w historii.")) return;
  try {
    const response = await send({ type: "CAT_ROLLBACK_FILTERS" });
    setStatus(`Przywrócono poprzednią listę (${response.count} domen).`);
    await refresh();
  } catch (error) { setStatus(`Nie udało się wycofać listy: ${error.message}`, true); }
});
