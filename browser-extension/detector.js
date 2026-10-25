/* Conservative DOM detector: ambiguous elements are REVIEW, never hidden automatically. */
(() => {
  "use strict";

  const STRONG_SELECTORS = [
    'ins.adsbygoogle',
    '[data-ad-slot]',
    '[data-ad-client]',
    '[data-ad-unit]',
    '[data-ad-container]',
    '[data-ad="true" i]'
  ];
  const CANDIDATE_SELECTOR = [
    "iframe[src]",
    ...STRONG_SELECTORS,
    '[aria-label*="advertisement" i]',
    '[aria-label*="sponsored" i]',
    '[aria-label*="reklama" i]',
    '[aria-label*="sponsorowane" i]',
    '[class~="ad" i]',
    '[class~="ads" i]',
    '[class*="advertisement" i]',
    '[id*="advertisement" i]',
    '[class*="sponsored" i]',
    '[id*="sponsored" i]',
    '[class*="reklama" i]',
    '[id*="reklama" i]',
    '[class*="sponsorowane" i]',
    '[id*="sponsorowane" i]'
  ].join(",");
  const AD_HOSTS = new Set([
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    "adservice.google.com", "amazon-adsystem.com", "taboola.com",
    "outbrain.com", "criteo.com", "adsrvr.org", "adnxs.com"
  ]);

  function hostMatches(host, domain) {
    return host === domain || host.endsWith(`.${domain}`);
  }

  function hasAdHost(element) {
    if (!element || !element.matches("iframe[src]")) return false;
    try {
      const host = new URL(element.getAttribute("src"), document.baseURI).hostname.toLowerCase();
      return [...AD_HOSTS].some((domain) => hostMatches(host, domain));
    } catch (_) {
      return false;
    }
  }

  function hasStrongMarker(element) {
    return STRONG_SELECTORS.some((selector) => {
      try { return element.matches(selector); } catch (_) { return false; }
    });
  }

  function getCandidate(element) {
    if (!(element instanceof HTMLElement)) return null;
    if (element.hasAttribute("data-cat-kitty-hidden") || element.hasAttribute("data-cat-kitty-reviewed")) return null;

    if (hasAdHost(element)) {
      return { element, verdict: "BLOCK", action: "BLOCK", category: "known_ad_network_frame", ruleId: "DOM-NETWORK-001", confidence: 0.99 };
    }
    if (hasStrongMarker(element)) {
      return { element, verdict: "BLOCK", action: "BLOCK", category: "explicit_ad_container", ruleId: "DOM-ATTR-001", confidence: 0.96 };
    }

    const ariaLabel = (element.getAttribute("aria-label") || "").toLowerCase();
    if (["advertisement", "sponsored", "reklama", "sponsorowane"].some((word) => ariaLabel.includes(word))) {
      return { element, verdict: "REVIEW", action: "REVIEW", category: "sponsored_label", ruleId: "DOM-LABEL-REVIEW", confidence: 0.68 };
    }
    const className = typeof element.className === "string" ? element.className : "";
    const idAndClass = `${element.id || ""} ${className}`;
    if (/(^|[\s_-])(ad|ads|advertisement|sponsored|reklama|sponsorowane)([\s_-]|$)/i.test(idAndClass) || /reklama|sponsorowane/i.test(idAndClass)) {
      return { element, verdict: "REVIEW", action: "REVIEW", category: "ad_like_marker", ruleId: "DOM-MARKER-REVIEW", confidence: 0.62 };
    }
    return null;
  }

  function scan(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return [];
    let elements;
    try { elements = root.querySelectorAll(CANDIDATE_SELECTOR); } catch (_) { return []; }
    const results = [];
    // Include a matching element root because querySelectorAll does not include the root itself.
    if (root instanceof HTMLElement && root.matches(CANDIDATE_SELECTOR)) {
      const rootResult = getCandidate(root);
      if (rootResult) results.push(rootResult);
    }
    // Cap fresh detections, not raw selector hits, so marked elements do not starve later candidates.
    for (let i = 0; i < elements.length && results.length < 500; i += 1) {
      const result = getCandidate(elements[i]);
      if (result) results.push(result);
    }
    return results;
  }

  globalThis.CatDetector = Object.freeze({ scan, version: "1.0.0" });
})();
