"use strict";
const stateNode = document.getElementById("state");
const toggle = document.getElementById("toggle");
async function refresh() {
  try {
    const state = await chrome.runtime.sendMessage({ type: "CAT_GET_STATE" });
    stateNode.textContent = state.enabled ? "Ochrona aktywna" : "Ochrona wyłączona";
    toggle.textContent = state.enabled ? "Wyłącz ochronę" : "Włącz ochronę";
  } catch (_) { stateNode.textContent = "Nie udało się odczytać stanu"; }
}
toggle.addEventListener("click", async () => {
  const state = await chrome.runtime.sendMessage({ type: "CAT_GET_STATE" });
  await chrome.runtime.sendMessage({ type: "CAT_SET_PROTECTION", enabled: !state.enabled });
  await refresh();
});
refresh();
