/* CAT — Anti-Cat Detector. Unknown signals are REVIEW, never auto-blocked. */
"use strict";
(() => {
  const MAX_SCAN = 120;
  const REVIEW_ATTR = "data-cat-review";
  const BLOCK_ATTR = "data-cat-hidden";
  const adTokens = /(?:^|[-_\s])(ad|ads|advert|advertisement|sponsored|promoted)(?:$|[-_\s])/i;
  function classify(element) {
    if (!(element instanceof Element)) return { verdict: "ALLOW", reason: "not-element" };
    if (element.matches("nav,main,article,form,header,footer,button,input,textarea,video,audio")) return { verdict: "ALLOW", reason: "protected-semantic-element" };
    const values = [
      element.id || "",
      typeof element.className === "string" ? element.className : "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("data-ad-slot") || "",
      element.getAttribute("data-ad-unit") || "",
      element.getAttribute("data-ad-container") || ""
    ];
    const explicit = element.hasAttribute("data-ad-slot") || element.hasAttribute("data-ad-unit") || element.hasAttribute("data-ad-container");
    if (explicit) return { verdict: "BLOCK", reason: "explicit-ad-attribute" };
    if (values.some(value => adTokens.test(value))) return { verdict: "REVIEW", reason: "ad-like-label" };
    return { verdict: "ALLOW", reason: "no-ad-signal" };
  }
  function scan(root = document) {
    const nodes = [];
    if (root instanceof Element) nodes.push(root);
    if (root && root.querySelectorAll) nodes.push(...root.querySelectorAll("div,aside,section,iframe"));
    return nodes.slice(0, MAX_SCAN).map(element => ({ element, ...classify(element) }));
  }
  globalThis.CatDetector = { classify, scan, REVIEW_ATTR, BLOCK_ATTR };
})();