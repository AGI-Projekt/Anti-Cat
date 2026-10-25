/* Cat — Kitty Edition 1.0.0. Local-first, no telemetry, no full browsing URLs in logs. */
"use strict";

const RULESET_ID = "cat_ads";
const EXCEPTION_RULE_BASE = 10000;
const MAX_EXCEPTION_SITES = 100;
const CUSTOM_RULE_BASE = 11000;
const MAX_CUSTOM_DOMAINS = 200;
const MAX_ACTIVE_FILTER_DOMAINS = 1000;
const NETWORK_RULE_BASE = 13000;
const MAX_ACTIVE_NETWORK_RULES = 500;
const MAX_FILTER_SOURCES = 5;
const MAX_SOURCE_DOMAINS = 1000;
const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_SOURCE_LINE_COUNT = 12000;
const MAX_LOG_EVENTS = 100;
const FILTER_UPDATE_ALARM = "cat-filter-source-update";
const FETCH_TIMEOUT_MS = 15000;
const RESOURCE_TYPES = ["script", "image", "stylesheet", "font", "sub_frame", "xmlhttprequest", "ping", "media", "other"];
const RULES_VERSION = "2026.10.25.8";
const DEFAULTS = Object.freeze({
  enabled: true,
  cleanerEnabled: true,
  cleanedCount: 0,
  exceptions: [],
  customBlockedDomains: [],
  remoteFilterCache: [],
  filterSources: [],
  filterHistory: [],
  filterAutoUpdate: false,
  filterUpdateIntervalHours: 24,
  decisionLog: [],
  loggingEnabled: true,
  detailedDiagnostics: false,
  motionEnabled: true,
  rulesVersion: RULES_VERSION
});

function normalizeHostname(input) {
  if (typeof input !== "string" || !input.trim() || input.length > 2048) return null;
  const raw = input.trim();
  let url;
  try {
    url = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? new URL(raw) : new URL(`https://${raw}`);
  } catch (_) { return null; }
  if (!(url.protocol === "http:" || url.protocol === "https:")) return null;
  if (url.username || url.password) return null;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > 253 || hostname.includes("..")) return null;
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname)) return null;
  return hostname;
}

function isIpLiteral(hostname) {
  return hostname.includes(":") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith("[");
}

function normalizeFilterSourceUrl(input) {
  if (typeof input !== "string" || !input.trim() || input.length > 2048) throw new Error("Adres źródła jest pusty lub zbyt długi.");
  let url;
  try { url = new URL(input.trim()); } catch (_) { throw new Error("Adres źródła nie jest poprawnym URL."); }
  if (url.protocol !== "https:") throw new Error("Źródła list filtrów muszą korzystać z HTTPS.");
  if (url.username || url.password) throw new Error("Adres źródła nie może zawierać danych logowania.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const reservedSuffixes = [".localhost", ".local", ".internal", ".test", ".invalid", ".example", ".home.arpa"];
  if (!hostname.includes(".") || isIpLiteral(hostname) || hostname === "localhost" || reservedSuffixes.some((suffix) => hostname.endsWith(suffix)) || url.port) {
    throw new Error("Źródło musi używać publicznej nazwy DNS przez standardowy HTTPS, a nie adresu IP, hosta lokalnego ani portu niestandardowego.");
  }
  if (!normalizeHostname(hostname)) throw new Error("Nazwa hosta źródła jest nieprawidłowa.");
  url.hostname = hostname;
  url.hash = "";
  return url.href;
}

function normalizeSourceConfig(input) {
  if (!input || typeof input !== "object") throw new Error("Nieprawidłowa konfiguracja źródła.");
  const url = normalizeFilterSourceUrl(input.url);
  const parsedUrl = new URL(url);
  const checksumUrl = input.checksumUrl ? normalizeFilterSourceUrl(input.checksumUrl) : null;
  if (checksumUrl && new URL(checksumUrl).origin !== parsedUrl.origin) {
    throw new Error("Adres sumy kontrolnej musi być w tym samym originie HTTPS co lista.");
  }
  const sha256 = input.sha256 == null || input.sha256 === "" ? null : String(input.sha256).trim().toLowerCase();
  if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("SHA-256 musi zawierać dokładnie 64 znaki szesnastkowe.");
  if (sha256 && checksumUrl) throw new Error("Wybierz przypięty SHA-256 albo adres pliku sumy kontrolnej — nie oba naraz.");
  const sourceId = `src-${hashString(url)}`;
  return {
    id: sourceId,
    name: parsedUrl.hostname,
    url,
    checksumUrl,
    sha256,
    addedAt: typeof input.addedAt === "string" ? input.addedAt : new Date().toISOString(),
    lastAttemptAt: typeof input.lastAttemptAt === "string" ? input.lastAttemptAt : null,
    lastSuccessAt: typeof input.lastSuccessAt === "string" ? input.lastSuccessAt : null,
    lastHash: typeof input.lastHash === "string" && /^[a-f0-9]{64}$/.test(input.lastHash) ? input.lastHash : null,
    lastDomainCount: Number.isSafeInteger(input.lastDomainCount) && input.lastDomainCount >= 0 ? input.lastDomainCount : 0,
    lastRuleCount: Number.isSafeInteger(input.lastRuleCount) && input.lastRuleCount >= 0 ? input.lastRuleCount : 0,
    lastSkippedRuleCount: Number.isSafeInteger(input.lastSkippedRuleCount) && input.lastSkippedRuleCount >= 0 ? input.lastSkippedRuleCount : 0,
    lastError: typeof input.lastError === "string" ? input.lastError.slice(0, 160) : null
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function getState() {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

function normalizeDomainArray(input, maximum, label) {
  if (!Array.isArray(input)) throw new Error(`${label} musi być tablicą.`);
  if (input.length > maximum) throw new Error(`Maksymalny limit dla ${label.toLowerCase()}: ${maximum}.`);
  const mapped = input.map(normalizeHostname);
  if (mapped.some((domain) => !domain)) throw new Error(`${label} zawiera nieprawidłową domenę lub adres URL.`);
  return [...new Set(mapped)].sort();
}

function normalizeNetworkFilterRule(input) {
  if (!input || typeof input !== "object") throw new Error("Nieprawidłowa reguła sieciowa.");
  const action = input.action === "allow" ? "allow" : input.action === "block" ? "block" : null;
  const filter = typeof input.filter === "string" ? input.filter : "";
  if (!action || !filter || filter.length > 512 || /[\r\n\t ]/.test(filter) || /^\s*\//.test(filter)) {
    throw new Error("Nieprawidłowy lub zbyt długi wzorzec sieciowy.");
  }
  // DNR's urlFilter supports the ABP-compatible anchors (*, ^ and |). Regex rules are intentionally unsupported.
  if (/^\/.+\/$/.test(filter) || /[{}<>]/.test(filter) || /[^\x00-\x7F]/.test(filter) || filter.startsWith("||*")) throw new Error("Reguły regularne, nie-ASCII i wzorce nieobsługiwane przez DNR nie są dozwolone.");
  const allowedTypes = new Set(["script", "image", "stylesheet", "font", "sub_frame", "xmlhttprequest", "ping", "media", "other"]);
  let resourceTypes = Array.isArray(input.resourceTypes) ? input.resourceTypes.slice() : [...RESOURCE_TYPES];
  if (!resourceTypes.length || resourceTypes.some((type) => !allowedTypes.has(type))) throw new Error("Reguła zawiera nieobsługiwany typ zasobu.");
  resourceTypes = [...new Set(resourceTypes)];
  const domainType = input.domainType == null ? null : input.domainType;
  if (domainType !== null && !["firstParty", "thirdParty"].includes(domainType)) throw new Error("Nieprawidłowy zakres first-party/third-party.");
  const normalizeDomainList = (value, label) => {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 20) throw new Error(`${label}: nieprawidłowa lista domen.`);
    const list = value.map((domain) => normalizeHostname(domain));
    if (list.some((domain) => !domain || isIpLiteral(domain))) throw new Error(`${label}: nieprawidłowa domena.`);
    return [...new Set(list)].sort();
  };
  const initiatorDomains = normalizeDomainList(input.initiatorDomains, "domain=");
  const excludedInitiatorDomains = normalizeDomainList(input.excludedInitiatorDomains, "domain=~");
  const urlAnchored = filter.startsWith("||") || filter.startsWith("|https://") || filter.startsWith("|http://");
  if (action === "allow" && !urlAnchored && initiatorDomains.length === 0) {
    throw new Error("Reguła wyjątku allow musi być zakotwiczona na domenie/adresie lub ograniczona opcją domain=.");
  }
  if (initiatorDomains.length && excludedInitiatorDomains.length) {
    const overlap = initiatorDomains.some((domain) => excludedInitiatorDomains.includes(domain));
    if (overlap) throw new Error("Ta sama domena nie może być jednocześnie dozwolona i wykluczona w domain=.");
  }
  return {
    filter,
    action,
    resourceTypes,
    domainType,
    initiatorDomains,
    excludedInitiatorDomains,
    isUrlFilterCaseSensitive: input.isUrlFilterCaseSensitive === true
  };
}

function normalizeRemoteCache(input) {
  if (!Array.isArray(input)) throw new Error("Pamięć podręczna źródeł filtrów musi być tablicą.");
  const ids = new Set();
  const normalized = input.map((entry) => {
    if (!entry || typeof entry.sourceId !== "string" || !/^src-[a-f0-9]{8}$/.test(entry.sourceId)) throw new Error("Nieprawidłowy identyfikator pamięci podręcznej źródła.");
    if (ids.has(entry.sourceId)) throw new Error("Powtórzony identyfikator źródła.");
    ids.add(entry.sourceId);
    const domains = normalizeDomainArray(Array.isArray(entry.domains) ? entry.domains : [], MAX_SOURCE_DOMAINS, "Domeny źródła");
    const rules = Array.isArray(entry.rules) ? entry.rules.map(normalizeNetworkFilterRule) : [];
    if (!domains.length && !rules.length) throw new Error("Źródło nie może aktywować pustej listy ani pustego zestawu reguł.");
    if (rules.length > MAX_ACTIVE_NETWORK_RULES) throw new Error(`Źródło przekracza limit ${MAX_ACTIVE_NETWORK_RULES} reguł sieciowych.`);
    if (typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("Brak prawidłowej sumy SHA-256 w pamięci źródła.");
    return { sourceId: entry.sourceId, domains, rules, sha256: entry.sha256, updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString() };
  });
  return normalized;
}

function effectiveBlockedDomains(customDomains, remoteCache) {
  const union = [...new Set([
    ...(Array.isArray(customDomains) ? customDomains : []),
    ...(Array.isArray(remoteCache) ? remoteCache.flatMap((source) => Array.isArray(source.domains) ? source.domains : []) : [])
  ])].sort();
  if (union.length > MAX_ACTIVE_FILTER_DOMAINS) {
    throw new Error(`Łączna liczba aktywnych domen przekracza limit ${MAX_ACTIVE_FILTER_DOMAINS}. Usuń część domen lub źródeł.`);
  }
  return union;
}

function effectiveNetworkFilters(remoteCache) {
  const unique = new Map();
  for (const source of Array.isArray(remoteCache) ? remoteCache : []) {
    for (const rawRule of Array.isArray(source.rules) ? source.rules : []) {
      const rule = normalizeNetworkFilterRule(rawRule);
      unique.set(JSON.stringify(rule), rule);
    }
  }
  const rules = [...unique.values()];
  if (rules.length > MAX_ACTIVE_NETWORK_RULES) {
    throw new Error(`Łączny zestaw przekracza limit ${MAX_ACTIVE_NETWORK_RULES} reguł sieciowych.`);
  }
  return rules;
}

async function saveDecisionEvents(events, sender) {
  const state = await getState();
  if (!state.loggingEnabled || !Array.isArray(events)) return { ok: true, skipped: true };
  const accepted = [];
  const senderHost = state.detailedDiagnostics && sender && sender.tab && sender.tab.url ? normalizeHostname(sender.tab.url) : null;
  for (const input of events.slice(0, 20)) {
    if (!input || typeof input !== "object") continue;
    const moduleName = ["detector", "cleaner", "blocker", "settings"].includes(input.module) ? input.module : "detector";
    const category = typeof input.category === "string" ? input.category.slice(0, 48) : "unknown";
    const action = ["ALLOW", "BLOCK", "REVIEW", "INFO", "ERROR"].includes(input.action) ? input.action : "INFO";
    const event = { time: new Date().toISOString(), module: moduleName, category, action, ruleId: typeof input.ruleId === "string" ? input.ruleId.slice(0, 80) : null };
    if (senderHost) event.site = senderHost;
    accepted.push(event);
  }
  if (!accepted.length) return { ok: true, added: 0 };
  const nextLog = [...(Array.isArray(state.decisionLog) ? state.decisionLog : []), ...accepted].slice(-MAX_LOG_EVENTS);
  await chrome.storage.local.set({ decisionLog: nextLog });
  return { ok: true, added: accepted.length };
}

async function applyExceptions(input) {
  if (!Array.isArray(input)) throw new Error("Lista wyjątków musi być tablicą.");
  const mapped = input.map(normalizeHostname);
  if (mapped.some((domain) => !domain)) throw new Error("Lista zawiera nieprawidłową domenę.");
  const normalized = [...new Set(mapped)].sort();
  if (normalized.length > MAX_EXCEPTION_SITES) throw new Error(`Maksymalna liczba wyjątków: ${MAX_EXCEPTION_SITES}.`);
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldManagedIds = currentRules.filter((rule) => rule.id >= EXCEPTION_RULE_BASE && rule.id < EXCEPTION_RULE_BASE + MAX_EXCEPTION_SITES).map((rule) => rule.id);
  const newRules = normalized.map((domain, index) => ({
    id: EXCEPTION_RULE_BASE + index,
    priority: 1000,
    action: { type: "allow" },
    condition: { initiatorDomains: [domain], resourceTypes: RESOURCE_TYPES }
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldManagedIds, addRules: newRules });
  await chrome.storage.local.set({ exceptions: normalized });
  return normalized;
}

function snapshotFilterState(state) {
  return {
    customBlockedDomains: Array.isArray(state.customBlockedDomains) ? [...state.customBlockedDomains] : [],
    remoteFilterCache: Array.isArray(state.remoteFilterCache) ? state.remoteFilterCache.map((source) => ({ ...source, domains: [...(source.domains || [])], rules: (source.rules || []).map((rule) => ({ ...rule, resourceTypes: [...(rule.resourceTypes || [])], initiatorDomains: [...(rule.initiatorDomains || [])], excludedInitiatorDomains: [...(rule.excludedInitiatorDomains || [])] })) })) : [],
    filterSources: Array.isArray(state.filterSources) ? state.filterSources.map((source) => ({ ...source })) : [],
    savedAt: new Date().toISOString()
  };
}

function filterContentChanged(state, customDomains, remoteCache) {
  return JSON.stringify(state.customBlockedDomains || []) !== JSON.stringify(customDomains) ||
    JSON.stringify(state.remoteFilterCache || []) !== JSON.stringify(remoteCache);
}

async function replaceManagedBlockRules(domains, enabled = true, networkFilters = []) {
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const isManaged = (rule) =>
    (rule.id >= CUSTOM_RULE_BASE && rule.id < CUSTOM_RULE_BASE + MAX_ACTIVE_FILTER_DOMAINS) ||
    (rule.id >= NETWORK_RULE_BASE && rule.id < NETWORK_RULE_BASE + MAX_ACTIVE_NETWORK_RULES);
  const oldManagedRules = currentRules.filter(isManaged);
  if (domains.length > MAX_ACTIVE_FILTER_DOMAINS) throw new Error("Za dużo domen do aktywacji.");
  if (networkFilters.length > MAX_ACTIVE_NETWORK_RULES) throw new Error("Za dużo reguł sieciowych do aktywacji.");
  const domainRules = enabled ? domains.map((domain, index) => ({
    id: CUSTOM_RULE_BASE + index,
    priority: 1,
    action: { type: "block" },
    condition: { requestDomains: [domain], resourceTypes: RESOURCE_TYPES }
  })) : [];
  const parsedNetworkRules = enabled ? networkFilters.map((input, index) => {
    const item = normalizeNetworkFilterRule(input);
    const condition = { urlFilter: item.filter, resourceTypes: item.resourceTypes };
    if (item.domainType) condition.domainType = item.domainType;
    if (item.initiatorDomains.length) condition.initiatorDomains = item.initiatorDomains;
    if (item.excludedInitiatorDomains.length) condition.excludedInitiatorDomains = item.excludedInitiatorDomains;
    if (item.isUrlFilterCaseSensitive) condition.isUrlFilterCaseSensitive = true;
    return {
      id: NETWORK_RULE_BASE + index,
      priority: item.action === "allow" ? 100 : 2,
      action: { type: item.action },
      condition
    };
  }) : [];
  const newRules = [...domainRules, ...parsedNetworkRules];
  const oldIds = oldManagedRules.map((rule) => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldIds, addRules: newRules });
  return oldManagedRules;
}

async function commitFilterState(input, options = {}) {
  const currentState = await getState();
  const customDomains = normalizeDomainArray(input.customBlockedDomains, MAX_CUSTOM_DOMAINS, "Własna lista domen");
  const remoteCache = normalizeRemoteCache(input.remoteFilterCache);
  const filterSources = Array.isArray(input.filterSources) ? input.filterSources.map(normalizeSourceConfig) : [];
  if (filterSources.length > MAX_FILTER_SOURCES) throw new Error(`Można skonfigurować maksymalnie ${MAX_FILTER_SOURCES} źródeł.`);
  if (new Set(filterSources.map((source) => source.id)).size !== filterSources.length) throw new Error("Źródła filtrów nie mogą się powtarzać.");
  const activeDomains = effectiveBlockedDomains(customDomains, remoteCache);
  const activeNetworkFilters = effectiveNetworkFilters(remoteCache);
  const historyBase = Array.isArray(currentState.filterHistory) ? currentState.filterHistory : [];
  let history = Array.isArray(options.historyOverride) ? options.historyOverride.slice(-5) : historyBase.slice(-5);
  const changed = filterContentChanged(currentState, customDomains, remoteCache);
  if (options.recordHistory !== false && changed) history = [...history, snapshotFilterState(currentState)].slice(-5);
  const oldRules = await replaceManagedBlockRules(activeDomains, currentState.enabled !== false, activeNetworkFilters);
  try {
    await chrome.storage.local.set({
      customBlockedDomains: customDomains,
      remoteFilterCache: remoteCache,
      filterSources,
      filterHistory: history
    });
  } catch (error) {
    try {
      const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
      const currentManagedIds = currentRules.filter((rule) => (rule.id >= CUSTOM_RULE_BASE && rule.id < CUSTOM_RULE_BASE + MAX_ACTIVE_FILTER_DOMAINS) || (rule.id >= NETWORK_RULE_BASE && rule.id < NETWORK_RULE_BASE + MAX_ACTIVE_NETWORK_RULES)).map((rule) => rule.id);
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: currentManagedIds, addRules: oldRules });
    } catch (rollbackError) {
      console.error("Cat: failed to compensate after filter storage failure", rollbackError);
    }
    throw error;
  }
  return { customDomains, remoteCache, filterSources, activeDomains, history };
}

async function applyCustomBlockedDomains(input) {
  const state = await getState();
  const customDomains = normalizeDomainArray(input, MAX_CUSTOM_DOMAINS, "Własna lista domen");
  return (await commitFilterState({
    customBlockedDomains: customDomains,
    remoteFilterCache: state.remoteFilterCache || [],
    filterSources: state.filterSources || []
  })).customDomains;
}

const ABP_RESOURCE_TYPES = Object.freeze({
  script: "script", image: "image", stylesheet: "stylesheet", font: "font",
  subdocument: "sub_frame", xmlhttprequest: "xmlhttprequest", ping: "ping",
  media: "media", other: "other"
});

function parseAdblockNetworkRule(original) {
  let line = original.trim();
  let action = "block";
  if (line.startsWith("@@")) { action = "allow"; line = line.slice(2); }
  if (!line || line.length > 512 || line.startsWith("/") || /[{}<>]/.test(line)) return { skipped: true, reason: "invalid_pattern" };
  const splitAt = line.indexOf("$");
  const filter = splitAt >= 0 ? line.slice(0, splitAt) : line;
  const optionText = splitAt >= 0 ? line.slice(splitAt + 1) : "";
  if (!filter || /\s/.test(filter) || /[\r\n]/.test(filter)) return { skipped: true, reason: "invalid_pattern" };
  const rule = {
    filter, action, resourceTypes: [...RESOURCE_TYPES], domainType: null,
    initiatorDomains: [], excludedInitiatorDomains: [], isUrlFilterCaseSensitive: false
  };
  if (optionText) {
    const options = optionText.split(",");
    const selectedTypes = [];
    for (const rawOption of options) {
      const option = rawOption.trim();
      if (!option) return { skipped: true, reason: "invalid_options" };
      if (Object.prototype.hasOwnProperty.call(ABP_RESOURCE_TYPES, option)) {
        selectedTypes.push(ABP_RESOURCE_TYPES[option]);
      } else if (option === "third-party" || option === "3p") {
        if (rule.domainType === "firstParty") return { skipped: true, reason: "conflicting_party_options" };
        rule.domainType = "thirdParty";
      } else if (option === "first-party" || option === "1p") {
        if (rule.domainType === "thirdParty") return { skipped: true, reason: "conflicting_party_options" };
        rule.domainType = "firstParty";
      } else if (option === "match-case") {
        rule.isUrlFilterCaseSensitive = true;
      } else if (option.startsWith("domain=")) {
        const values = option.slice(7).split("|");
        if (!values.length || values.length > 20 || values.some((value) => !value)) return { skipped: true, reason: "invalid_domain_option" };
        for (const value of values) {
          const excluded = value.startsWith("~");
          const hostname = value.replace(/^~/, "");
          const normalized = normalizeHostname(hostname);
          if (!normalized || isIpLiteral(normalized)) return { skipped: true, reason: "invalid_domain_option" };
          const target = excluded ? rule.excludedInitiatorDomains : rule.initiatorDomains;
          target.push(normalized);
        }
      } else {
        // Options such as redirect, removeparam, CSP, cosmetic-only and regex features are not implemented.
        return { skipped: true, reason: "unsupported_option" };
      }
    }
    if (selectedTypes.length) rule.resourceTypes = [...new Set(selectedTypes)];
    rule.initiatorDomains = [...new Set(rule.initiatorDomains)].sort();
    rule.excludedInitiatorDomains = [...new Set(rule.excludedInitiatorDomains)].sort();
    if (rule.initiatorDomains.some((domain) => rule.excludedInitiatorDomains.includes(domain))) return { skipped: true, reason: "conflicting_domain_option" };
  }
  try { return { rule: normalizeNetworkFilterRule(rule) }; }
  catch (_) { return { skipped: true, reason: "invalid_rule" }; }
}

function normalizeSourceText(raw, options = {}) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Źródło zwróciło pustą listę.");
  if (raw.length > MAX_SOURCE_BYTES) throw new Error("Treść źródła przekracza limit rozmiaru.");
  if (/^\s*(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(raw)) throw new Error("Źródło zwróciło HTML zamiast listy tekstowej.");
  const lines = raw.split(/\r?\n/);
  if (lines.length > MAX_SOURCE_LINE_COUNT) throw new Error(`Źródło przekracza limit ${MAX_SOURCE_LINE_COUNT} wierszy.`);
  const domains = [];
  const rules = [];
  let skippedRules = 0;
  const skippedReasons = Object.create(null);
  const recordSkipped = (reason) => { skippedRules += 1; skippedReasons[reason] = (skippedReasons[reason] || 0) + 1; };
  const localAliases = new Set(["localhost", "localhost.localdomain", "local", "broadcasthost"]);
  for (const original of lines) {
    let line = original.trim();
    if (!line || line.startsWith("!") || /^\[Adblock(?:\s+Plus)?\b/i.test(line)) continue;
    if (line.startsWith("#") && !line.startsWith("##") && !line.startsWith("#@#")) continue;
    line = line.replace(/\s+#.*$/, "").trim();
    if (!line) continue;
    // Cosmetic rules are intentionally skipped; this release only executes network rules.
    if (/(?:#@?#|#\?#|#\$#)/.test(line)) { recordSkipped("cosmetic_filter"); continue; }
    const hostsMatch = line.match(/^(?:0\.0\.0\.0|127(?:\.\d{1,3}){3}|::1|::)\s+([^\s#]+)(?:\s+#.*)?$/i);
    const domainCandidate = hostsMatch ? hostsMatch[1] : line;
    if (!domainCandidate.includes("||") && !domainCandidate.startsWith("@@") && !domainCandidate.includes("$") && !domainCandidate.startsWith("|") && !/[\s/:?#@*^]/.test(domainCandidate)) {
      if (localAliases.has(domainCandidate.toLowerCase())) continue;
      const normalized = normalizeHostname(domainCandidate);
      if (!normalized || isIpLiteral(normalized) || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(normalized) || !normalized.includes(".")) {
        throw new Error(`Nieprawidłowa domena na liście: ${domainCandidate.slice(0, 60)}`);
      }
      domains.push(normalized);
      if (domains.length > MAX_SOURCE_DOMAINS) throw new Error(`Źródło przekracza limit ${MAX_SOURCE_DOMAINS} domen.`);
      continue;
    }
    const parsed = parseAdblockNetworkRule(line);
    if (parsed.rule) rules.push(parsed.rule);
    else recordSkipped(parsed.reason || "unsupported_rule");
    if (rules.length > MAX_ACTIVE_NETWORK_RULES) throw new Error(`Źródło przekracza limit ${MAX_ACTIVE_NETWORK_RULES} obsługiwanych reguł sieciowych.`);
  }
  const uniqueDomains = [...new Set(domains)].sort();
  const uniqueRules = [...new Map(rules.map((rule) => [JSON.stringify(rule), rule])).values()];
  if (!uniqueDomains.length && !uniqueRules.length && options.allowEmptyPreview !== true) {
    throw new Error(skippedRules ? "Nie znaleziono obsługiwanych reguł; źródło może używać nieobsługiwanych opcji lub filtrów kosmetycznych." : "Po walidacji źródło nie zawiera reguł.");
  }
  return { domains: uniqueDomains, rules: uniqueRules, skippedRules, skippedReasons: { ...skippedReasons }, lineCount: lines.length };
}

function previewFilterText(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("Wklej tekst listy filtrów do podglądu.");
  const byteLength = new TextEncoder().encode(input).byteLength;
  if (byteLength > MAX_SOURCE_BYTES) throw new Error("Tekst do podglądu przekracza limit 256 KiB.");
  const parsed = normalizeSourceText(input, { allowEmptyPreview: true });
  return {
    lineCount: parsed.lineCount,
    supportedDomainCount: parsed.domains.length,
    supportedRuleCount: parsed.rules.length,
    skippedRuleCount: parsed.skippedRules,
    skippedReasons: parsed.skippedReasons,
    exampleDomains: parsed.domains.slice(0, 10),
    exampleRules: parsed.rules.slice(0, 10).map((rule) => ({
      filter: rule.filter,
      action: rule.action,
      resourceTypes: [...rule.resourceTypes],
      domainType: rule.domainType || null,
      initiatorDomains: [...rule.initiatorDomains],
      excludedInitiatorDomains: [...rule.excludedInitiatorDomains]
    })),
    activated: false,
    persisted: false
  };
}

async function sha256Hex(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readBoundedHttpsText(urlValue) {
  const sourceUrl = normalizeFilterSourceUrl(urlValue);
  const parsed = new URL(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "text/plain, application/octet-stream;q=0.9" },
      signal: controller.signal
    });
    if (!response || !response.ok) throw new Error(`Źródło zwróciło status HTTP ${response ? response.status : "?"}.`);
    if (response.url) {
      let finalUrl;
      try { finalUrl = new URL(response.url); } catch (_) { throw new Error("Nieprawidłowy docelowy adres odpowiedzi."); }
      if (finalUrl.origin !== parsed.origin) throw new Error("Przekierowanie do innego originu jest niedozwolone.");
    }
    const contentType = response.headers && response.headers.get ? (response.headers.get("content-type") || "").toLowerCase() : "";
    if (contentType.includes("text/html") || contentType.includes("application/json") || contentType.includes("application/xml")) {
      throw new Error("Źródło musi zwracać zwykły plik tekstowy, nie HTML, JSON ani XML.");
    }
    const headerLength = Number(response.headers && response.headers.get ? response.headers.get("content-length") : 0);
    if (Number.isFinite(headerLength) && headerLength > MAX_SOURCE_BYTES) throw new Error("Źródło przekracza limit 256 KiB.");
    let bytes;
    if (response.body && typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          const chunk = next.value instanceof Uint8Array ? next.value : new Uint8Array(next.value);
          total += chunk.byteLength;
          if (total > MAX_SOURCE_BYTES) {
            try { await reader.cancel(); } catch (_) { /* cancellation is best effort */ }
            throw new Error("Źródło przekracza limit 256 KiB.");
          }
          chunks.push(chunk);
        }
      } finally {
        try { reader.releaseLock(); } catch (_) { /* not all stream implementations expose a lock */ }
      }
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    } else {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_SOURCE_BYTES) throw new Error("Źródło przekracza limit 256 KiB.");
      bytes = new Uint8Array(buffer);
    }
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch (_) { throw new Error("Źródło nie zawiera poprawnego tekstu UTF-8."); }
    return { text, bytes, origin: parsed.origin };
  } catch (error) {
    if (error && error.name === "AbortError") throw new Error("Przekroczono limit czasu pobierania (15 s).");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function hasSourcePermission(urlValue) {
  const origin = new URL(normalizeFilterSourceUrl(urlValue)).origin;
  if (!chrome.permissions || typeof chrome.permissions.contains !== "function") return false;
  return chrome.permissions.contains({ origins: [`${origin}/*`] });
}

async function fetchAndValidateSource(source) {
  const requiredUrls = [source.url, source.checksumUrl].filter(Boolean);
  for (const url of requiredUrls) {
    if (!(await hasSourcePermission(url))) throw new Error("Brak zgody na dostęp do hosta źródła. Usuń i dodaj źródło ponownie, akceptując uprawnienie.");
  }
  const payload = await readBoundedHttpsText(source.url);
  const digest = await sha256Hex(payload.bytes);
  if (source.sha256 && digest !== source.sha256) throw new Error("Suma SHA-256 nie zgadza się z przypiętym wzorcem.");
  if (source.checksumUrl) {
    const checksumPayload = await readBoundedHttpsText(source.checksumUrl);
    const match = checksumPayload.text.trim().match(/^([a-f0-9]{64})(?:\s+\*?[\w.-]+)?\s*$/i);
    if (!match) throw new Error("Plik sumy kontrolnej musi zawierać 64 znaki SHA-256 i opcjonalną nazwę pliku.");
    if (match[1].toLowerCase() !== digest) throw new Error("Suma SHA-256 pobranej listy nie zgadza się z plikiem kontrolnym.");
  }
  const parsed = normalizeSourceText(payload.text);
  return { sourceId: source.id, domains: parsed.domains, rules: parsed.rules, skippedRules: parsed.skippedRules, sha256: digest, updatedAt: new Date().toISOString() };
}

function sanitiseSourceError(error) {
  let message = error instanceof Error ? error.message : "Błąd aktualizacji źródła.";
  message = message.replace(/https?:\/\/[^\s)]+/gi, "[adres źródła]").replace(/[\r\n]+/g, " ").slice(0, 150);
  return message || "Błąd aktualizacji źródła.";
}

async function updateFilterSources(automatic = false) {
  const state = await getState();
  const sources = Array.isArray(state.filterSources) ? state.filterSources.map(normalizeSourceConfig) : [];
  if (!sources.length) throw new Error("Nie skonfigurowano żadnych źródeł list filtrów.");
  const now = new Date().toISOString();
  let failedSourceId = null;
  try {
    const fetched = [];
    const updatedSources = [];
    for (const source of sources) {
      failedSourceId = source.id;
      const cacheItem = await fetchAndValidateSource(source);
      fetched.push(cacheItem);
      updatedSources.push({
        ...source,
        lastAttemptAt: now,
        lastSuccessAt: now,
        lastHash: cacheItem.sha256,
        lastDomainCount: cacheItem.domains.length,
        lastRuleCount: (cacheItem.rules || []).length,
        lastSkippedRuleCount: cacheItem.skippedRules || 0,
        lastError: null
      });
    }
    // All sources are fetched and validated before the current rule set changes.
    const remoteDomains = [...new Set(fetched.flatMap((item) => item.domains))];
    const remoteRules = effectiveNetworkFilters(fetched);
    const active = effectiveBlockedDomains(state.customBlockedDomains || [], fetched);
    if (active.length > MAX_ACTIVE_FILTER_DOMAINS) throw new Error(`Łączny zestaw przekracza limit ${MAX_ACTIVE_FILTER_DOMAINS} domen.`);
    if (remoteRules.length > MAX_ACTIVE_NETWORK_RULES) throw new Error(`Łączny zestaw przekracza limit ${MAX_ACTIVE_NETWORK_RULES} reguł sieciowych.`);
    const result = await commitFilterState({
      customBlockedDomains: state.customBlockedDomains || [],
      remoteFilterCache: fetched,
      filterSources: updatedSources
    });
    await appendInfoEvent(automatic ? "filter_sources_auto_updated" : "filter_sources_updated", "INFO");
    return { ok: true, sourceCount: updatedSources.length, remoteDomainCount: remoteDomains.length, remoteRuleCount: remoteRules.length, skippedRuleCount: fetched.reduce((count, item) => count + (item.skippedRules || 0), 0), configuredDomainCount: result.activeDomains.length, activeDomainCount: state.enabled === false ? 0 : result.activeDomains.length, activeRuleCount: state.enabled === false ? 0 : remoteRules.length };
  } catch (error) {
    const latest = await getState();
    const safeError = sanitiseSourceError(error);
    const nextSources = (Array.isArray(latest.filterSources) ? latest.filterSources : []).map((source) => ({
      ...source,
      lastAttemptAt: source.id === failedSourceId ? now : source.lastAttemptAt,
      lastError: source.id === failedSourceId ? safeError : source.lastError
    }));
    await chrome.storage.local.set({ filterSources: nextSources });
    // A failure never replaces the prior remote cache or active rules.
    await appendInfoEvent("filter_sources_update_failed", "ERROR");
    throw new Error(`Aktualizacja anulowana; poprzedni poprawny zestaw pozostaje aktywny. ${safeError}`);
  }
}

async function addFilterSource(input) {
  const source = normalizeSourceConfig(input);
  const state = await getState();
  const sources = Array.isArray(state.filterSources) ? state.filterSources.map(normalizeSourceConfig) : [];
  if (sources.some((current) => current.url === source.url)) throw new Error("To źródło zostało już dodane.");
  if (sources.length >= MAX_FILTER_SOURCES) throw new Error(`Maksymalnie ${MAX_FILTER_SOURCES} źródeł filtrów.`);
  const next = [...sources, source];
  await chrome.storage.local.set({ filterSources: next });
  await appendInfoEvent("filter_source_added", "INFO");
  return source;
}

async function removeFilterSource(sourceId) {
  if (typeof sourceId !== "string" || !/^src-[a-f0-9]{8}$/.test(sourceId)) throw new Error("Nieprawidłowy identyfikator źródła.");
  const state = await getState();
  const sources = (state.filterSources || []).map(normalizeSourceConfig);
  if (!sources.some((source) => source.id === sourceId)) throw new Error("Nie znaleziono wskazanego źródła.");
  const nextSources = sources.filter((source) => source.id !== sourceId);
  const nextCache = (state.remoteFilterCache || []).filter((item) => item.sourceId !== sourceId);
  await commitFilterState({
    customBlockedDomains: state.customBlockedDomains || [],
    remoteFilterCache: nextCache,
    filterSources: nextSources
  });
  if (!nextSources.length && state.filterAutoUpdate) {
    await configureFilterAlarm(false, state.filterUpdateIntervalHours);
  }
  const removed = sources.find((source) => source.id === sourceId);
  const remainingOrigins = new Set(nextSources.flatMap((source) => [source.url, source.checksumUrl].filter(Boolean).map((url) => new URL(url).origin)));
  const removedOrigin = new URL(removed.url).origin;
  if (!remainingOrigins.has(removedOrigin) && chrome.permissions && typeof chrome.permissions.remove === "function") {
    try { await chrome.permissions.remove({ origins: [`${removedOrigin}/*`] }); } catch (_) { /* optional permission cleanup is best effort */ }
  }
  await appendInfoEvent("filter_source_removed", "INFO");
  return { ok: true, remaining: nextSources.length };
}

async function configureFilterAlarm(enabled, intervalHours) {
  if (typeof enabled !== "boolean") throw new Error("Nieprawidłowa wartość harmonogramu.");
  const interval = [6, 12, 24].includes(intervalHours) ? intervalHours : 24;
  if (enabled) {
    const state = await getState();
    if (!Array.isArray(state.filterSources) || !state.filterSources.length) throw new Error("Dodaj co najmniej jedno źródło przed włączeniem harmonogramu.");
    for (const source of state.filterSources) {
      if (!(await hasSourcePermission(source.url))) throw new Error("Brakuje zgody na co najmniej jeden host źródła. Sprawdź uprawnienia i dodaj źródło ponownie.");
    }
    if (!chrome.alarms || typeof chrome.alarms.create !== "function") throw new Error("Ta przeglądarka nie udostępnia API harmonogramu.");
    await chrome.alarms.create(FILTER_UPDATE_ALARM, { delayInMinutes: 1, periodInMinutes: interval * 60 });
  } else if (chrome.alarms && typeof chrome.alarms.clear === "function") {
    await chrome.alarms.clear(FILTER_UPDATE_ALARM);
  }
  await chrome.storage.local.set({ filterAutoUpdate: enabled, filterUpdateIntervalHours: interval });
  return { enabled, intervalHours: interval };
}

async function setProtectionEnabled(enabled) {
  if (typeof enabled !== "boolean") throw new Error("Nieprawidłowy stan ochrony.");
  const state = await getState();
  const active = await chrome.declarativeNetRequest.getEnabledRulesets();
  const isActive = active.includes(RULESET_ID);
  if (enabled) {
    if (!isActive) await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [RULESET_ID], disableRulesetIds: [] });
    // Restore dynamic rule sets from the local, validated state when protection is re-enabled.
    await applyExceptions(state.exceptions || []);
    await replaceManagedBlockRules(effectiveBlockedDomains(state.customBlockedDomains || [], state.remoteFilterCache || []), true, effectiveNetworkFilters(state.remoteFilterCache || []));
  } else {
    // A global OFF switch must also stop custom/remote dynamic blocking, not only the static ruleset.
    await replaceManagedBlockRules([], false, []);
    if (isActive) await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [], disableRulesetIds: [RULESET_ID] });
  }
  await chrome.storage.local.set({ enabled });
  return enabled;
}

async function appendInfoEvent(category, action, module = "settings") {
  return saveDecisionEvents([{ module, category, action }], null);
}

async function handleMessage(message, sender) {
  if (!message || typeof message.type !== "string") return { ok: false, error: "Nieznany komunikat." };
  switch (message.type) {
    case "CAT_PREVIEW_FILTER_TEXT": {
      // Local, read-only analysis: no fetch, storage write, permissions or DNR mutation.
      const preview = previewFilterText(message.text);
      return { ok: true, preview };
    }
    case "CAT_GET_OPTIONS_STATE": {
      const state = await getState();
      const activeDomains = effectiveBlockedDomains(state.customBlockedDomains || [], state.remoteFilterCache || []);
      const activeNetworkFilters = effectiveNetworkFilters(state.remoteFilterCache || []);
      return { ok: true, state: {
        ...state,
        decisionLog: Array.isArray(state.decisionLog) ? state.decisionLog.slice(-MAX_LOG_EVENTS).reverse() : [],
        activeFilterDomainCount: state.enabled === false ? 0 : activeDomains.length,
        configuredFilterDomainCount: activeDomains.length,
        remoteFilterDomainCount: [...new Set((state.remoteFilterCache || []).flatMap((source) => source.domains || []))].length,
        configuredFilterRuleCount: activeNetworkFilters.length,
        activeFilterRuleCount: state.enabled === false ? 0 : activeNetworkFilters.length,
        remoteFilterRuleCount: activeNetworkFilters.length,
        skippedFilterRuleCount: (state.filterSources || []).reduce((count, source) => count + (Number(source.lastSkippedRuleCount) || 0), 0)
      } };
    }
    case "CAT_GET_STATE": {
      const state = await getState();
      const hostname = normalizeHostname(message.hostname || "");
      const excepted = hostname ? state.exceptions.some((d) => hostname === d || hostname.endsWith(`.${d}`)) : false;
      let rulesetActive = false;
      try { rulesetActive = (await chrome.declarativeNetRequest.getEnabledRulesets()).includes(RULESET_ID); } catch (_) { /* report inactive */ }
      return { ok: true, state: {
        ...state,
        decisionLog: Array.isArray(state.decisionLog) ? state.decisionLog.slice(-10).reverse() : [],
        activeSiteException: excepted,
        rulesetActive,
        rulesVersion: RULES_VERSION
      } };
    }
    case "CAT_SET_ENABLED": {
      const enabled = await setProtectionEnabled(message.enabled);
      await appendInfoEvent("protection_toggle", "INFO");
      return { ok: true, enabled };
    }
    case "CAT_SET_CLEANER_ENABLED": {
      if (typeof message.enabled !== "boolean") throw new Error("Nieprawidłowy stan Ad. Clean.");
      await chrome.storage.local.set({ cleanerEnabled: message.enabled });
      await appendInfoEvent("cleaner_toggle", "INFO");
      return { ok: true, cleanerEnabled: message.enabled };
    }
    case "CAT_TOGGLE_SITE_EXCEPTION": {
      const hostname = normalizeHostname(message.hostname || "");
      if (!hostname) throw new Error("Nieprawidłowa domena wyjątku.");
      if (typeof message.enabled !== "boolean") throw new Error("Nieprawidłowe ustawienie wyjątku.");
      const state = await getState();
      const exactAlready = state.exceptions.includes(hostname);
      const next = message.enabled ? (exactAlready ? state.exceptions : [...state.exceptions, hostname]) : state.exceptions.filter((d) => d !== hostname);
      const exceptions = await applyExceptions(next);
      await appendInfoEvent(message.enabled ? "site_exception_added" : "site_exception_removed", "INFO");
      return { ok: true, exceptions, hostname, enabled: exceptions.includes(hostname) };
    }
    case "CAT_SAVE_EXCEPTIONS": {
      const exceptions = await applyExceptions(message.exceptions);
      await appendInfoEvent("exception_list_updated", "INFO");
      return { ok: true, exceptions };
    }
    case "CAT_SAVE_CUSTOM_FILTERS": {
      const domains = await applyCustomBlockedDomains(message.domains);
      await appendInfoEvent("custom_filter_list_updated", "INFO");
      return { ok: true, domains, count: domains.length };
    }
    case "CAT_CLEAR_CUSTOM_FILTERS": {
      const domains = await applyCustomBlockedDomains([]);
      await appendInfoEvent("custom_filter_list_cleared", "INFO");
      return { ok: true, domains, count: 0 };
    }
    case "CAT_ROLLBACK_FILTERS": {
      const state = await getState();
      const history = Array.isArray(state.filterHistory) ? state.filterHistory : [];
      if (!history.length) throw new Error("Brak zapisanej poprzedniej wersji listy.");
      const previous = history[history.length - 1];
      const customDomains = previous.customBlockedDomains || previous.domains || [];
      const remoteCache = Array.isArray(previous.remoteFilterCache) ? previous.remoteFilterCache : (state.remoteFilterCache || []);
      const filterSources = Array.isArray(previous.filterSources) ? previous.filterSources : (state.filterSources || []);
      const result = await commitFilterState({ customBlockedDomains: customDomains, remoteFilterCache: remoteCache, filterSources }, { recordHistory: false, historyOverride: history.slice(0, -1) });
      await appendInfoEvent("filter_list_rollback", "INFO");
      return { ok: true, domains: result.customDomains, count: result.customDomains.length, configuredDomainCount: result.activeDomains.length, activeDomainCount: state.enabled === false ? 0 : result.activeDomains.length, sourceCount: result.filterSources.length };
    }
    case "CAT_ADD_FILTER_SOURCE": {
      const source = await addFilterSource(message.source);
      return { ok: true, source };
    }
    case "CAT_REMOVE_FILTER_SOURCE":
      return removeFilterSource(message.sourceId);
    case "CAT_UPDATE_FILTER_SOURCES":
      return updateFilterSources(false);
    case "CAT_SET_FILTER_UPDATE_SCHEDULE": {
      const response = await configureFilterAlarm(message.enabled, message.intervalHours);
      await appendInfoEvent(response.enabled ? "filter_auto_update_enabled" : "filter_auto_update_disabled", "INFO");
      return { ok: true, ...response };
    }
    case "CAT_SAVE_SETTINGS": {
      const allowed = ["loggingEnabled", "detailedDiagnostics", "motionEnabled"];
      const patch = {};
      for (const key of allowed) if (typeof message.settings?.[key] === "boolean") patch[key] = message.settings[key];
      await chrome.storage.local.set(patch);
      return { ok: true, settings: { ...(await getState()) } };
    }
    case "CAT_LOG_EVENTS":
      return saveDecisionEvents(message.events, sender);
    case "CAT_CLEANED": {
      const count = Number.isSafeInteger(message.count) ? Math.min(500, Math.max(0, message.count)) : 0;
      if (count < 1) return { ok: true, cleanedCount: (await getState()).cleanedCount };
      const state = await getState();
      const next = Math.min(1000000, Math.max(0, Number(state.cleanedCount) || 0) + count);
      await chrome.storage.local.set({ cleanedCount: next });
      return { ok: true, cleanedCount: next };
    }
    case "CAT_RESET_COUNT":
      await chrome.storage.local.set({ cleanedCount: 0 });
      return { ok: true };
    case "CAT_CLEAR_LOG":
      await chrome.storage.local.set({ decisionLog: [] });
      return { ok: true };
    default:
      return { ok: false, error: "Nieobsługiwany typ komunikatu." };
  }
}

async function initialize() {
  const state = await getState();
  await chrome.storage.local.set({ ...DEFAULTS, ...state, rulesVersion: RULES_VERSION });
  try { await applyExceptions(state.exceptions || []); } catch (error) {
    console.warn("Cat: nie udało się odtworzyć wyjątków; dotychczasowe reguły pozostają aktywne.", error);
  }
  try {
    await commitFilterState({
      customBlockedDomains: state.customBlockedDomains || [],
      remoteFilterCache: state.remoteFilterCache || [],
      filterSources: state.filterSources || []
    }, { recordHistory: false });
  } catch (error) {
    console.warn("Cat: nie udało się odtworzyć list filtrów; poprzednie aktywne reguły powinny pozostać bez zmian.", error);
  }
  try { await setProtectionEnabled(state.enabled !== false); } catch (error) {
    console.error("Cat: nie udało się ustawić reguł sieciowych.", error);
  }
  try {
    if (state.filterAutoUpdate) await configureFilterAlarm(true, state.filterUpdateIntervalHours);
    else if (chrome.alarms && typeof chrome.alarms.clear === "function") await chrome.alarms.clear(FILTER_UPDATE_ALARM);
  } catch (error) {
    console.warn("Cat: nie udało się odtworzyć harmonogramu list filtrów.", error);
  }
}

chrome.runtime.onInstalled.addListener(() => { initialize().catch((error) => console.error("Cat initialization failed", error)); });
chrome.runtime.onStartup.addListener(() => { initialize().catch((error) => console.error("Cat startup failed", error)); });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Wystąpił nieznany błąd." }));
  return true;
});
if (chrome.alarms && chrome.alarms.onAlarm && typeof chrome.alarms.onAlarm.addListener === "function") {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm || alarm.name !== FILTER_UPDATE_ALARM) return;
    updateFilterSources(true).catch((error) => console.warn("Cat: zaplanowana aktualizacja list nie powiodła się; poprzedni zestaw pozostaje aktywny.", sanitiseSourceError(error)));
  });
}
