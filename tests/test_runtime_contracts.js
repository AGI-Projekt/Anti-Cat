/* Deterministic runtime contract tests for the WebExtension service worker. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const nodeCrypto = require("node:crypto");

const storageData = {};
const originPermissions = new Set();
const fetchResponses = new Map();
let fetchCallCount = 0;
const browserState = {
  enabledRulesets: ["cat_ads"],
  dynamicRules: [],
  installedListener: null,
  startupListener: null,
  messageListener: null,
  alarmListener: null,
  alarms: new Map()
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const chrome = {
  storage: {
    local: {
      async get(defaults) {
        const result = clone(defaults || {});
        for (const [key, value] of Object.entries(storageData)) result[key] = clone(value);
        return result;
      },
      async set(patch) { Object.assign(storageData, clone(patch)); }
    },
    onChanged: { addListener() {} }
  },
  declarativeNetRequest: {
    async getDynamicRules() { return clone(browserState.dynamicRules); },
    async updateDynamicRules({ removeRuleIds = [], addRules = [] }) {
      const retained = browserState.dynamicRules.filter((rule) => !removeRuleIds.includes(rule.id));
      const next = [...retained, ...clone(addRules)];
      const ids = next.map((rule) => rule.id);
      if (new Set(ids).size !== ids.length) throw new Error("Duplicate dynamic rule ID");
      if (addRules.some((rule) => !(rule.condition?.initiatorDomains?.length || rule.condition?.requestDomains?.length || rule.condition?.urlFilter) || !["allow", "block"].includes(rule.action?.type))) throw new Error("Invalid dynamic rule shape");
      browserState.dynamicRules = next;
    },
    async getEnabledRulesets() { return [...browserState.enabledRulesets]; },
    async updateEnabledRulesets({ enableRulesetIds = [], disableRulesetIds = [] }) {
      browserState.enabledRulesets = browserState.enabledRulesets.filter((id) => !disableRulesetIds.includes(id));
      for (const id of enableRulesetIds) if (!browserState.enabledRulesets.includes(id)) browserState.enabledRulesets.push(id);
    }
  },
  permissions: {
    async contains({ origins = [] }) { return origins.every((origin) => originPermissions.has(origin)); },
    async remove({ origins = [] }) { origins.forEach((origin) => originPermissions.delete(origin)); return true; },
    request({ origins = [] }, callback) { origins.forEach((origin) => originPermissions.add(origin)); callback(true); }
  },
  alarms: {
    async create(name, info) { browserState.alarms.set(name, clone(info)); },
    async clear(name) { return browserState.alarms.delete(name); },
    onAlarm: { addListener(listener) { browserState.alarmListener = listener; } }
  },
  runtime: {
    onInstalled: { addListener(listener) { browserState.installedListener = listener; } },
    onStartup: { addListener(listener) { browserState.startupListener = listener; } },
    onMessage: { addListener(listener) { browserState.messageListener = listener; } }
  }
};

async function mockFetch(url) {
  fetchCallCount += 1;
  const entry = fetchResponses.get(url);
  if (!entry) return { ok: false, status: 404, url, headers: { get: () => "text/plain" }, arrayBuffer: async () => new ArrayBuffer(0) };
  const encoded = new TextEncoder().encode(entry.text);
  return {
    ok: entry.status === undefined || entry.status >= 200 && entry.status < 300,
    status: entry.status === undefined ? 200 : entry.status,
    url: entry.finalUrl === undefined ? url : entry.finalUrl,
    headers: { get(name) { if (name === "content-type") return entry.contentType || "text/plain; charset=utf-8"; if (name === "content-length") return String(encoded.byteLength); return null; } },
    arrayBuffer: async () => encoded.slice().buffer
  };
}

const root = path.resolve(__dirname, "..");
const worker = fs.readFileSync(path.join(root, "src/background/service-worker.js"), "utf8");
vm.runInNewContext(worker, {
  chrome, console, URL, Date, setTimeout, clearTimeout, AbortController, TextDecoder, TextEncoder, Uint8Array,
  crypto: nodeCrypto.webcrypto, fetch: mockFetch
});

async function send(message, sender = {}) {
  return new Promise((resolve) => {
    const keepAlive = browserState.messageListener(message, sender, resolve);
    if (!keepAlive) resolve({ ok: false, error: "Message listener did not keep channel alive" });
  });
}

async function main() {
  assert.equal(typeof browserState.installedListener, "function", "install listener should be registered");
  assert.equal(typeof browserState.alarmListener, "function", "periodic alarm listener should be registered");
  browserState.installedListener();
  await new Promise((resolve) => setTimeout(resolve, 5));

  // 1.0.0: local filter preview is bounded, useful for diagnostics, and read-only.
  let result;
  const storageBeforePreview = clone(storageData);
  const rulesBeforePreview = clone(browserState.dynamicRules);
  const permissionsBeforePreview = [...originPermissions].sort();
  const fetchCallsBeforePreview = fetchCallCount;
  const mixedFixture = fs.readFileSync(path.join(root, "tests/fixtures/filter-preview-mixed.txt"), "utf8");
  result = await send({ type: "CAT_PREVIEW_FILTER_TEXT", text: mixedFixture });
  assert.equal(result.ok, true, "mixed list should be previewed without activation");
  assert.equal(result.preview.supportedDomainCount, 2);
  assert.equal(result.preview.supportedRuleCount, 2);
  assert.equal(result.preview.skippedRuleCount, 3);
  assert.equal(result.preview.skippedReasons.cosmetic_filter, 1);
  assert.equal(result.preview.skippedReasons.unsupported_option, 1);
  assert.equal(result.preview.skippedReasons.invalid_pattern, 1);
  assert.equal(result.preview.activated, false);
  assert.equal(result.preview.persisted, false);
  assert.deepEqual(storageData, storageBeforePreview, "preview must not write extension storage");
  assert.deepEqual(browserState.dynamicRules, rulesBeforePreview, "preview must not change dynamic DNR rules");
  assert.deepEqual([...originPermissions].sort(), permissionsBeforePreview, "preview must not request host permissions");
  assert.equal(fetchCallCount, fetchCallsBeforePreview, "preview must not issue network requests");

  const unsupportedFixture = fs.readFileSync(path.join(root, "tests/fixtures/filter-preview-unsupported.txt"), "utf8");
  result = await send({ type: "CAT_PREVIEW_FILTER_TEXT", text: unsupportedFixture });
  assert.equal(result.ok, true, "unsupported-only input should be diagnosable in preview mode");
  assert.equal(result.preview.supportedDomainCount, 0);
  assert.equal(result.preview.supportedRuleCount, 0);
  assert.equal(result.preview.skippedRuleCount, 3);
  assert.equal(result.preview.activated, false);

  result = await send({ type: "CAT_PREVIEW_FILTER_TEXT", text: "<!doctype html><html><body>wrong content</body></html>" });
  assert.equal(result.ok, false, "HTML must be rejected by preview");
  result = await send({ type: "CAT_PREVIEW_FILTER_TEXT", text: "bad..host" });
  assert.equal(result.ok, false, "malformed domain lines must be rejected by preview");
  result = await send({ type: "CAT_PREVIEW_FILTER_TEXT", text: "x".repeat(262145) });
  assert.equal(result.ok, false, "preview must enforce a 256 KiB byte limit");
  assert.deepEqual(storageData, storageBeforePreview, "failed preview attempts must remain side-effect-free");
  assert.deepEqual(browserState.dynamicRules, rulesBeforePreview, "failed preview attempts must not mutate DNR rules");
  assert.equal(fetchCallCount, fetchCallsBeforePreview, "failed preview attempts must also remain offline");

  result = await send({ type: "CAT_TOGGLE_SITE_EXCEPTION", hostname: "https://Example.com/path?q=private", enabled: true });
  assert.equal(result.ok, true, "valid URL should become a domain exception");
  assert.deepEqual(storageData.exceptions, ["example.com"]);
  assert.equal(browserState.dynamicRules.length, 1);
  assert.deepEqual(browserState.dynamicRules[0].condition.initiatorDomains, ["example.com"]);
  assert.equal(browserState.dynamicRules[0].priority, 1000);
  assert.equal(browserState.dynamicRules[0].action.type, "allow");

  result = await send({ type: "CAT_SAVE_CUSTOM_FILTERS", domains: ["ads.example.net", "tracker.example.org", "ads.example.net"] });
  assert.equal(result.ok, true, "valid custom domains should be accepted");
  assert.deepEqual(storageData.customBlockedDomains, ["ads.example.net", "tracker.example.org"]);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 2);
  result = await send({ type: "CAT_SAVE_CUSTOM_FILTERS", domains: ["valid.example", "bad host"] });
  assert.equal(result.ok, false, "invalid custom list should be rejected");
  assert.deepEqual(storageData.customBlockedDomains, ["ads.example.net", "tracker.example.org"], "invalid custom list must not replace prior list");
  result = await send({ type: "CAT_CLEAR_CUSTOM_FILTERS" });
  assert.equal(result.ok, true);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 0);

  result = await send({ type: "CAT_GET_STATE", hostname: "news.example.com" });
  assert.equal(result.ok, true);
  assert.equal(result.state.activeSiteException, true, "parent domain exception should cover subdomains");
  result = await send({ type: "CAT_SAVE_EXCEPTIONS", exceptions: ["valid.example", "bad host!!!"] });
  assert.equal(result.ok, false, "invalid domain list should be rejected");
  assert.deepEqual(storageData.exceptions, ["example.com"], "failed updates must not replace prior exception storage");
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "allow").length, 1, "failed updates must leave prior dynamic rules intact");
  result = await send({ type: "CAT_TOGGLE_SITE_EXCEPTION", hostname: "https://user@example.org/path", enabled: true });
  assert.equal(result.ok, false, "URLs with credentials must not be accepted as exceptions");

  result = await send({ type: "CAT_SET_ENABLED", enabled: false });
  assert.equal(result.ok, true);
  assert.equal(browserState.enabledRulesets.includes("cat_ads"), false);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 0, "global OFF must also disable dynamic domain block rules");
  result = await send({ type: "CAT_SAVE_CUSTOM_FILTERS", domains: ["off.example.net"] });
  assert.equal(result.ok, true, "settings may be edited while protection is off");
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 0, "updates must not silently re-enable blocking while global protection is off");
  const offState = await send({ type: "CAT_GET_OPTIONS_STATE" });
  assert.equal(offState.state.activeFilterDomainCount, 0, "UI state should not claim dynamic rules are active while protection is off");
  assert.equal(offState.state.configuredFilterDomainCount, 1, "configured rules remain available for re-enabling protection");
  result = await send({ type: "CAT_SET_ENABLED", enabled: true });
  assert.equal(result.ok, true);
  assert.equal(browserState.enabledRulesets.includes("cat_ads"), true);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 1, "re-enabling protection should restore dynamic rules from validated state");
  await send({ type: "CAT_CLEAR_CUSTOM_FILTERS" });

  for (let i = 0; i < 6; i += 1) {
    await send({ type: "CAT_LOG_EVENTS", events: Array.from({ length: 20 }, (_, j) => ({ module: "detector", category: `test_${i}_${j}`, action: "REVIEW", ruleId: "TEST-RULE" })) });
  }
  assert.equal(storageData.decisionLog.length, 100, "decision log must be bounded to 100 events");
  assert.equal(Object.hasOwn(storageData.decisionLog[0], "site"), false, "host is not logged when detailed diagnostics are off");
  await send({ type: "CAT_SAVE_SETTINGS", settings: { loggingEnabled: true, detailedDiagnostics: true } });
  await send({ type: "CAT_LOG_EVENTS", events: [{ module: "detector", category: "host_test", action: "REVIEW" }] }, { tab: { url: "https://private.example/path?token=should-not-be-recorded" } });
  const lastEvent = storageData.decisionLog.at(-1);
  assert.equal(lastEvent.site, "private.example", "diagnostics may store host only after opt-in");
  assert.equal(JSON.stringify(lastEvent).includes("token=should-not-be-recorded"), false, "full URL query must never be stored");

  // Source validation: HTTP, credentials, IP literals and oversized allowlists are rejected.
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: "http://lists.example.org/ads.txt" } });
  assert.equal(result.ok, false, "unencrypted filter source must be rejected");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: "https://127.0.0.1/ads.txt" } });
  assert.equal(result.ok, false, "IP-literal source must be rejected");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: "https://lists.internal/ads.txt" } });
  assert.equal(result.ok, false, "reserved internal DNS suffix must be rejected");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: "https://lists.example.org:8443/ads.txt" } });
  assert.equal(result.ok, false, "non-standard HTTPS port must be rejected");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: "https://user:pass@lists.example.org/ads.txt" } });
  assert.equal(result.ok, false, "source URL credentials must be rejected");

  const sourceUrl = "https://lists.example.org/ads.txt";
  const sourceText = "# test list\n0.0.0.0 ads.remote.example\ntracker.remote.example\n";
  const sourceHash = nodeCrypto.createHash("sha256").update(sourceText, "utf8").digest("hex");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: sourceUrl, sha256: sourceHash } });
  assert.equal(result.ok, true, "valid HTTPS source should be saved without immediate activation");
  assert.equal(storageData.remoteFilterCache.length, 0, "adding a source alone must not activate any domains");
  const sourceId = result.source.id;
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  assert.equal(result.ok, false, "fetch must not occur before per-origin permission is granted");
  assert.equal(storageData.remoteFilterCache.length, 0, "failed permission check must retain empty cache");

  originPermissions.add("https://lists.example.org/*");
  fetchResponses.set(sourceUrl, { text: sourceText });
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  assert.equal(result.ok, true, "valid list with the pinned digest should be activated");
  assert.equal(result.sourceCount, 1);
  assert.equal(result.remoteDomainCount, 2);
  assert.equal(storageData.remoteFilterCache[0].sourceId, sourceId);
  assert.deepEqual(storageData.remoteFilterCache[0].domains, ["ads.remote.example", "tracker.remote.example"]);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 2);
  assert.equal(storageData.filterSources[0].lastHash, sourceHash);

  // Failed refresh preserves the last known-good DNR rules and remote cache.
  const knownGoodRules = clone(browserState.dynamicRules.filter((rule) => rule.action.type === "block"));
  const knownGoodCache = clone(storageData.remoteFilterCache);
  fetchResponses.set(sourceUrl, { text: "adulterated.example\n" });
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  assert.equal(result.ok, false, "pinned digest mismatch must abort refresh");
  assert.deepEqual(storageData.remoteFilterCache, knownGoodCache, "failed refresh must keep last known-good cache");
  assert.deepEqual(browserState.dynamicRules.filter((rule) => rule.action.type === "block"), knownGoodRules, "failed refresh must keep last known-good network rules");
  assert.match(storageData.filterSources[0].lastError, /SHA-256/);

  // Restore source content and check manual domains coexist with remote domains.
  fetchResponses.set(sourceUrl, { text: sourceText });
  result = await send({ type: "CAT_SAVE_CUSTOM_FILTERS", domains: ["manual.block.example"] });
  assert.equal(result.ok, true);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 3);
  result = await send({ type: "CAT_SET_FILTER_UPDATE_SCHEDULE", enabled: true, intervalHours: 12 });
  assert.equal(result.ok, true, "scheduler should enable after source permission exists");
  assert.deepEqual(browserState.alarms.get("cat-filter-source-update"), { delayInMinutes: 1, periodInMinutes: 720 });
  result = await send({ type: "CAT_SET_FILTER_UPDATE_SCHEDULE", enabled: true, intervalHours: 3 });
  assert.equal(result.ok, true);
  assert.equal(storageData.filterUpdateIntervalHours, 24, "unsupported interval falls back to 24 hours");

  // Removing a source removes its domains, and rollback restores the complete prior state.
  result = await send({ type: "CAT_REMOVE_FILTER_SOURCE", sourceId });
  assert.equal(result.ok, true);
  assert.equal(storageData.remoteFilterCache.length, 0);
  assert.deepEqual(storageData.customBlockedDomains, ["manual.block.example"]);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 1);
  result = await send({ type: "CAT_ROLLBACK_FILTERS" });
  assert.equal(result.ok, true);
  assert.equal(storageData.filterSources.length, 1, "rollback should restore removed source config");
  assert.equal(storageData.remoteFilterCache.length, 1, "rollback should restore remote cache");
  assert.equal(browserState.dynamicRules.filter((rule) => rule.action.type === "block").length, 3, "rollback should restore remote rules and the prior manual list");

  result = await send({ type: "CAT_GET_OPTIONS_STATE" });
  assert.equal(result.ok, true);
  assert.equal(result.state.activeFilterDomainCount, 3);
  assert.equal(result.state.filterAutoUpdate, false, "removing the last configured source disables the scheduler; re-enable explicitly after reviewing permissions");

  // Dynamic checksum sidecar is supported, but a mismatching checksum or HTML response must preserve the cache.
  originPermissions.add("https://lists.example.org/*"); // Simulate the user re-granting host access after rollback.
  const secondUrl = "https://lists.example.org/more.txt";
  const checksumUrl = "https://lists.example.org/more.txt.sha256";
  const secondText = "0.0.0.0 sidecar.remote.example\n";
  const secondHash = nodeCrypto.createHash("sha256").update(secondText, "utf8").digest("hex");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: secondUrl, checksumUrl } });
  assert.equal(result.ok, true, "same-origin checksum sidecar source should be accepted");
  fetchResponses.set(sourceUrl, { text: sourceText });
  fetchResponses.set(secondUrl, { text: secondText });
  fetchResponses.set(checksumUrl, { text: `${secondHash}  more.txt\n` });
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  assert.equal(result.ok, true, "matching SHA-256 sidecar should allow activation");
  assert.equal(result.sourceCount, 2);
  assert.equal(result.activeDomainCount, 4);
  const sidecarGoodCache = clone(storageData.remoteFilterCache);
  const sidecarGoodRules = clone(browserState.dynamicRules.filter((rule) => rule.action.type === "block"));
  fetchResponses.set(checksumUrl, { text: `${"0".repeat(64)}  more.txt\n` });
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  assert.equal(result.ok, false, "mismatching sidecar digest must abort activation");
  assert.deepEqual(storageData.remoteFilterCache, sidecarGoodCache, "sidecar failure must retain the full last known-good cache");
  assert.deepEqual(browserState.dynamicRules.filter((rule) => rule.action.type === "block"), sidecarGoodRules, "sidecar failure must retain active network rules");
  fetchResponses.set(secondUrl, { text: "<html><body>not a list</body></html>", contentType: "text/html" });
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  assert.equal(result.ok, false, "HTML content must be rejected as a filter source");
  assert.deepEqual(storageData.remoteFilterCache, sidecarGoodCache, "HTML response must not replace known-good cache");

  result = await send({ type: "CAT_GET_OPTIONS_STATE" });
  assert.equal(result.ok, true);
  assert.equal(result.state.activeFilterDomainCount, 4);
  assert.equal(result.state.filterSources.length, 2);

  // 1.0.0: parser preview is read-only; filter lists can be analyzed before activation.
  const abpUrl = "https://lists.example.org/network-abp.txt";
  const abpRules = [
    "! Title: Cat ABP subset test",
    "||cdn.ad-network.test^$script,image,third-party",
    "@@||safe.cdn-ad-network.test/allowed^$script,domain=portal.example|~private.portal.example",
    "|https://assets.example.org/ad-path/|$stylesheet",
    "||unsupported.test^$redirect=empty",
    "@@*$script",
    "example.org##.sponsored-card",
    "/regular-expression-filter/"
  ];
  for (let i = 0; i < 300; i += 1) abpRules.push(`||cdn${i}.load-test.example^$script,third-party`);
  const abpText = `${abpRules.join("\n")}\n`;
  const abpHash = nodeCrypto.createHash("sha256").update(abpText, "utf8").digest("hex");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: abpUrl, sha256: abpHash } });
  assert.equal(result.ok, true, "ABP-compatible source should be accepted for later fetch");
  originPermissions.add("https://lists.example.org/*");
  fetchResponses.set(sourceUrl, { text: sourceText });
  fetchResponses.set(secondUrl, { text: secondText });
  fetchResponses.set(checksumUrl, { text: `${secondHash}  more.txt\n` });
  fetchResponses.set(abpUrl, { text: abpText });
  const startParse = Date.now();
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  const parseMilliseconds = Date.now() - startParse;
  assert.equal(result.ok, true, "source containing supported ABP rules and unsupported extras should update");
  assert.equal(result.remoteRuleCount, 303, "300 test rules plus three hand-authored rules should be active after deduplication");
  assert.equal(result.skippedRuleCount, 4, "unsupported redirect, global unanchored exception, cosmetic and regex entries should be counted as skipped");
  assert.ok(parseMilliseconds < 3000, `300-rule parser/update runtime should remain bounded, took ${parseMilliseconds} ms`);
  const networkRules = browserState.dynamicRules.filter((rule) => rule.id >= 13000 && rule.id < 13500);
  assert.equal(networkRules.length, 303);
  assert.equal(networkRules.some((rule) => rule.action.type === "allow" && rule.condition.urlFilter === "*"), false, "global unanchored allow filters must be rejected to avoid neutralizing protection");
  const thirdPartyRule = networkRules.find((rule) => rule.condition.urlFilter === "||cdn.ad-network.test^");
  assert.ok(thirdPartyRule, "anchored domain filter should become a DNR urlFilter");
  assert.equal(thirdPartyRule.condition.domainType, "thirdParty");
  assert.deepEqual(thirdPartyRule.condition.resourceTypes, ["script", "image"]);
  const exceptionRule = networkRules.find((rule) => rule.action.type === "allow" && rule.condition.urlFilter === "||safe.cdn-ad-network.test/allowed^");
  assert.ok(exceptionRule, "@@ exception filter should become a DNR allow rule");
  assert.deepEqual(exceptionRule.condition.initiatorDomains, ["portal.example"]);
  assert.deepEqual(exceptionRule.condition.excludedInitiatorDomains, ["private.portal.example"]);
  const optionRule = networkRules.find((rule) => rule.condition.urlFilter === "|https://assets.example.org/ad-path/|");
  assert.deepEqual(optionRule.condition.resourceTypes, ["stylesheet"]);

  // Removing the ABP source and rolling back must restore its network rules as well as domain rules.
  const abpSource = result.sourceCount === 3 ? storageData.filterSources.find((source) => source.url === abpUrl) : null;
  assert.ok(abpSource, "ABP source metadata should be retained");
  result = await send({ type: "CAT_REMOVE_FILTER_SOURCE", sourceId: abpSource.id });
  assert.equal(result.ok, true);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.id >= 13000 && rule.id < 13500).length, 0);
  result = await send({ type: "CAT_ROLLBACK_FILTERS" });
  assert.equal(result.ok, true);
  assert.equal(browserState.dynamicRules.filter((rule) => rule.id >= 13000 && rule.id < 13500).length, 303, "rollback should reinstate the prior ABP network rules");

  // A feed with no supported rules must not replace the last good rule set.
  const unsupportedUrl = "https://lists.example.org/unsupported-only.txt";
  const unsupportedText = "||only-unsupported.example^$redirect=empty\nunsupported.example##.ad\n";
  const unsupportedHash = nodeCrypto.createHash("sha256").update(unsupportedText, "utf8").digest("hex");
  result = await send({ type: "CAT_ADD_FILTER_SOURCE", source: { url: unsupportedUrl, sha256: unsupportedHash } });
  assert.equal(result.ok, true);
  fetchResponses.set(abpUrl, { text: abpText });
  fetchResponses.set(unsupportedUrl, { text: unsupportedText });
  const goodNetworkRules = clone(browserState.dynamicRules.filter((rule) => rule.id >= 13000 && rule.id < 13500));
  result = await send({ type: "CAT_UPDATE_FILTER_SOURCES" });
  assert.equal(result.ok, false, "a source with no supported rules should be rejected");
  assert.deepEqual(browserState.dynamicRules.filter((rule) => rule.id >= 13000 && rule.id < 13500), goodNetworkRules, "unsupported-only source must preserve the last good network rules");

  result = await send({ type: "CAT_GET_OPTIONS_STATE" });
  assert.equal(result.ok, true);
  assert.equal(result.state.activeFilterRuleCount, 303);
  assert.ok(result.state.skippedFilterRuleCount >= 4);
  console.log(`Runtime contract tests: PASS (300-rule synthetic refresh ${parseMilliseconds} ms)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
