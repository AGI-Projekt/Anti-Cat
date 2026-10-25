/* CAT — Ad. Clean. Never removes DOM nodes; only marks confirmed ad containers. */
"use strict";
(() => {
  const HIDDEN_ATTR = "data-cat-hidden";
  const STYLE_ID = "cat-cleaner-style";
  let enabled = true;
  let protectionEnabled = true;
  let exceptions = [];
  let observer;
  let timer;
  let count = 0;
  function isExcepted() {
    return exceptions.some(host => location.hostname === host || location.hostname.endsWith("." + host));
  }
  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = '[' + HIDDEN_ATTR + '="1"]{display:none!important;visibility:hidden!important}';
    (document.head || document.documentElement).appendChild(style);
  }
  function scan() {
    timer = null;
    if (!enabled || !protectionEnabled || isExcepted() || !globalThis.CatDetector) return;
    installStyle();
    for (const item of globalThis.CatDetector.scan(document)) {
      if (item.verdict === "BLOCK" && !item.element.hasAttribute(HIDDEN_ATTR)) {
        item.element.setAttribute(HIDDEN_ATTR, "1");
        count += 1;
      } else if (item.verdict === "REVIEW") {
        item.element.setAttribute(globalThis.CatDetector.REVIEW_ATTR, "1");
      }
    }
  }
  function schedule() { if (timer === undefined || timer === null) timer = setTimeout(scan, 200); }
  function restore() {
    document.querySelectorAll('[' + HIDDEN_ATTR + '="1"]').forEach(el => el.removeAttribute(HIDDEN_ATTR));
    document.querySelectorAll('[data-cat-review="1"]').forEach(el => el.removeAttribute("data-cat-review"));
    document.getElementById(STYLE_ID)?.remove();
    count = 0;
  }
  async function readSettings() {
    try {
      const data = await chrome.storage.local.get({ enabled: true, cleanerEnabled: true, exceptions: [] });
      protectionEnabled = data.enabled !== false;
      enabled = data.cleanerEnabled !== false;
      exceptions = Array.isArray(data.exceptions) ? data.exceptions.filter(x => typeof x === "string") : [];
      if (enabled && protectionEnabled && !isExcepted()) schedule(); else restore();
    } catch (_) { /* fail closed: don't alter page when storage is unavailable */ }
  }
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.enabled) protectionEnabled = changes.enabled.newValue !== false;
      if (changes.cleanerEnabled) enabled = changes.cleanerEnabled.newValue !== false;
      if (changes.exceptions) exceptions = Array.isArray(changes.exceptions.newValue) ? changes.exceptions.newValue : [];
      if (enabled && protectionEnabled && !isExcepted()) schedule(); else restore();
    });
    readSettings();
  }
  if (document.documentElement && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => schedule());
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ad-slot","data-ad-unit","data-ad-container","aria-label","class","id"] });
  }
  globalThis.CatCleaner = { restore, getCount: () => count };
})();