/* DOM modifications are reversible, scoped to explicit ad markers, and local-only. */
(() => {
  "use strict";
  const STYLE_ID = "cat-kitty-clean-style";
  const HIDDEN_ATTR = "data-cat-kitty-hidden";
  const REVIEWED_ATTR = "data-cat-kitty-reviewed";
  let protectionEnabled = true;
  let cleanerEnabled = true;
  let motionEnabled = true;
  let settingsReady = false;
  let exceptions = [];
  let timer = null;
  let pendingCleanedCount = 0;
  let pendingEvents = [];
  let processedOnPage = 0;
  let styleElement = null;
  const MAX_ITEMS_PER_DOCUMENT = 1000;
  const MAX_PENDING_EVENTS = 20;

  function pageIsExcepted() {
    const host = location.hostname.toLowerCase();
    return exceptions.some((domain) => host === domain || host.endsWith(`.${domain}`));
  }

  function injectStyle() {
    if (styleElement && styleElement.isConnected) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `[${HIDDEN_ATTR}="1"]{display:none!important}`;
    (document.head || document.documentElement).appendChild(style);
    styleElement = style;
  }

  function isEssential(element) {
    if (!(element instanceof HTMLElement)) return true;
    if (element.matches("html,body,main,nav,header,footer,form,input,button,select,textarea,dialog,[role='main'],[role='navigation'],[role='dialog']")) return true;
    // Never hide an explicitly marked container if doing so would also remove controls or substantial media.
    return Boolean(element.querySelector("form,input,button,select,textarea,video,audio,[role='dialog'],[role='navigation']"));
  }

  function queueEvent(result, action = result.action) {
    if (pendingEvents.length >= MAX_PENDING_EVENTS) return;
    pendingEvents.push({ module: action === "BLOCK" ? "cleaner" : "detector", category: result.category, action, ruleId: result.ruleId });
  }

  function hideCandidate(result) {
    const element = result.element;
    if (!(element instanceof HTMLElement) || isEssential(element)) {
      if (element instanceof HTMLElement) element.setAttribute(REVIEWED_ATTR, "1");
      processedOnPage += 1;
      queueEvent({ ...result, category: "essential_content_preserved" }, "REVIEW");
      return false;
    }
    element.setAttribute(HIDDEN_ATTR, "1");
    pendingCleanedCount += 1;
    processedOnPage += 1;
    queueEvent(result, "BLOCK");
    return true;
  }

  function sendPending() {
    if (pendingCleanedCount > 0) {
      const count = pendingCleanedCount;
      pendingCleanedCount = 0;
      try { chrome.runtime.sendMessage({ type: "CAT_CLEANED", count }, () => void chrome.runtime.lastError); } catch (_) { /* extension may reload */ }
    }
    if (pendingEvents.length > 0) {
      const events = pendingEvents.splice(0, MAX_PENDING_EVENTS);
      try { chrome.runtime.sendMessage({ type: "CAT_LOG_EVENTS", events }, () => void chrome.runtime.lastError); } catch (_) { /* extension may reload */ }
    }
  }

  const pendingRoots = new Set();

  function scanRoots() {
    timer = null;
    if (!settingsReady || !protectionEnabled || !cleanerEnabled || pageIsExcepted() || !document.documentElement || !globalThis.CatDetector) {
      pendingRoots.clear();
      return;
    }
    injectStyle();
    if (processedOnPage >= MAX_ITEMS_PER_DOCUMENT) { pendingRoots.clear(); return; }
    const roots = [...pendingRoots];
    pendingRoots.clear();
    for (const root of roots) {
      if (processedOnPage >= MAX_ITEMS_PER_DOCUMENT) break;
      const results = globalThis.CatDetector.scan(root);
      for (const result of results) {
        if (processedOnPage >= MAX_ITEMS_PER_DOCUMENT) break;
        if (result.verdict === "BLOCK") hideCandidate(result);
        else if (result.verdict === "REVIEW") {
          result.element.setAttribute(REVIEWED_ATTR, "1");
          processedOnPage += 1;
          queueEvent(result, "REVIEW");
        }
      }
    }
    sendPending();
  }

  function restore() {
    document.querySelectorAll(`[${HIDDEN_ATTR}="1"]`).forEach((element) => element.removeAttribute(HIDDEN_ATTR));
    document.querySelectorAll(`[${REVIEWED_ATTR}="1"]`).forEach((element) => element.removeAttribute(REVIEWED_ATTR));
    if (styleElement) styleElement.remove();
    styleElement = null;
    processedOnPage = 0;
  }

  function scheduleScan(roots = [document]) {
    for (const root of roots) {
      if (root && (root === document || root instanceof Element || root instanceof DocumentFragment)) pendingRoots.add(root);
    }
    if (timer !== null) return;
    timer = window.setTimeout(scanRoots, 250);
  }

  async function readSettings() {
    try {
      const data = await chrome.storage.local.get({ enabled: true, cleanerEnabled: true, exceptions: [], motionEnabled: true });
      protectionEnabled = data.enabled !== false;
      cleanerEnabled = data.cleanerEnabled !== false;
      motionEnabled = data.motionEnabled !== false;
      settingsReady = true;
      exceptions = Array.isArray(data.exceptions) ? data.exceptions.filter((item) => typeof item === "string") : [];
      if (protectionEnabled && cleanerEnabled && !pageIsExcepted()) scheduleScan([document]);
      else restore();
    } catch (_) { /* fail safely: don't alter page if extension storage is unavailable */ }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!settingsReady) { readSettings(); return; }
    if (changes.enabled) protectionEnabled = changes.enabled.newValue !== false;
    if (changes.cleanerEnabled) cleanerEnabled = changes.cleanerEnabled.newValue !== false;
    if (changes.motionEnabled) motionEnabled = changes.motionEnabled.newValue !== false;
    if (changes.exceptions) exceptions = Array.isArray(changes.exceptions.newValue) ? changes.exceptions.newValue : [];
    if (protectionEnabled && cleanerEnabled && !pageIsExcepted()) scheduleScan([document]);
    else restore();
  });

  const observer = new MutationObserver((mutations) => {
    if (!settingsReady || !protectionEnabled || !cleanerEnabled || pageIsExcepted()) return;
    const roots = new Set();
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof Element) roots.add(mutation.target);
      for (const node of mutation.addedNodes || []) {
        if (node instanceof Element || node instanceof DocumentFragment) roots.add(node);
      }
    }
    if (roots.size) scheduleScan([...roots]);
  });
  if (document.documentElement) observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-ad-slot", "data-ad-client", "data-ad-unit", "data-ad-container", "data-ad", "src"]
  });
  readSettings();
})();
