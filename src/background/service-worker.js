/* CAT — Kitty Edition 1.0.0 */
"use strict";
const DEFAULTS = { enabled: true, cleanerEnabled: true, exceptions: [], decisionLog: [], rulesVersion: "2026.10.25.8" };
const RULESET_ID = "cat_ads";
async function readState() { return { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) }; }
async function setProtection(enabled) {
  const state = await readState();
  await chrome.storage.local.set({ enabled: Boolean(enabled) });
  try { await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: enabled ? [RULESET_ID] : [], disableRulesetIds: enabled ? [] : [RULESET_ID] }); } catch (_) {}
  return { ...state, enabled: Boolean(enabled) };
}
async function logDecision(entry) {
  const state = await readState();
  const event = { at: new Date().toISOString(), module: String(entry.module || "detector"), category: String(entry.category || "unknown"), ruleId: String(entry.ruleId || "n/a"), verdict: String(entry.verdict || "REVIEW") };
  const decisionLog = [...(Array.isArray(state.decisionLog) ? state.decisionLog : []), event].slice(-100);
  await chrome.storage.local.set({ decisionLog });
}
if (typeof chrome !== "undefined" && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(async () => {
    const state = await readState();
    await chrome.storage.local.set(state);
    if (state.enabled === false) await setProtection(false);
  });
}
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message.type !== "string") return false;
    if (message.type === "CAT_GET_STATE") { readState().then(sendResponse); return true; }
    if (message.type === "CAT_SET_PROTECTION") { setProtection(message.enabled).then(sendResponse); return true; }
    if (message.type === "CAT_LOG_DECISION") { logDecision(message.entry || {}).then(() => sendResponse({ ok: true })); return true; }
    return false;
  });
}
