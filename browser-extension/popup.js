"use strict";
const $ = (id) => document.getElementById(id);
const networkStatus = $("network-status");
const cleanerStatus = $("cleaner-status");
const protectionButton = $("toggle-protection");
const cleanerButton = $("toggle-cleaner");
const exceptionButton = $("toggle-exception");
let currentState = null;
let currentHost = null;
let currentExceptionDomain = null;

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

function setButtonBusy(button, busy) { button.disabled = busy; }
function matchingException(host, exceptions) {
  if (!host || !Array.isArray(exceptions)) return null;
  return exceptions
    .filter((domain) => host === domain || host.endsWith(`.${domain}`))
    .sort((a, b) => b.length - a.length)[0] || null;
}
function siteMatchesException(host, exceptions) { return Boolean(matchingException(host, exceptions)); }
function readableAction(action) {
  return ({ BLOCK: "zablokowano/ukryto", REVIEW: "wymaga ostrożności", ALLOW: "dozwolono", INFO: "informacja", ERROR: "błąd" })[action] || action || "zdarzenie";
}

function renderEvents(events) {
  const list = $("events");
  list.replaceChildren();
  if (!Array.isArray(events) || events.length === 0) {
    const item = document.createElement("li"); item.className = "muted"; item.textContent = "Brak zapisanych zdarzeń."; list.append(item); return;
  }
  for (const event of events.slice(0, 5)) {
    const item = document.createElement("li");
    const title = document.createElement("div");
    title.textContent = `${event.category || "zdarzenie"} · ${readableAction(event.action)}`;
    const meta = document.createElement("div"); meta.className = "event-time";
    const date = new Date(event.time);
    meta.textContent = `${Number.isNaN(date.getTime()) ? "czas nieznany" : date.toLocaleString()} · ${event.module || "Cat"}${event.ruleId ? ` · ${event.ruleId}` : ""}`;
    item.append(title, meta); list.append(item);
  }
}

function render(state) {
  currentState = state;
  const networkOn = state.enabled !== false && state.rulesetActive === true;
  networkStatus.textContent = networkOn ? "● Ochrona sieciowa aktywna" : state.enabled === false ? "● Ochrona sieciowa wstrzymana" : "! Reguły sieciowe nie zostały potwierdzone";
  networkStatus.className = `status ${networkOn ? "good" : "warn"}`;
  protectionButton.textContent = state.enabled === false ? "Włącz ochronę sieciową" : "Wstrzymaj ochronę sieciową";

  const cleanerOn = state.enabled !== false && state.cleanerEnabled !== false;
  cleanerStatus.textContent = cleanerOn ? "aktywny" : "wstrzymany";
  cleanerStatus.className = `status ${cleanerOn ? "good" : "warn"}`;
  cleanerButton.textContent = state.cleanerEnabled === false ? "Włącz Ad. Clean" : "Wstrzymaj Ad. Clean";
  $("count").textContent = String(state.cleanedCount || 0);
  $("rules-version").textContent = state.rulesVersion || "nieznana";
  $("log-status").textContent = state.loggingEnabled === false ? "dziennik wyłączony" : "dziennik lokalny";
  renderEvents(state.decisionLog || []);

  if (currentHost) {
    $("site-host").textContent = currentHost;
    currentExceptionDomain = matchingException(currentHost, state.exceptions || []);
    exceptionButton.disabled = false;
    exceptionButton.textContent = currentExceptionDomain
      ? `Usuń wyjątek: ${currentExceptionDomain}`
      : "Pozwól na reklamy na tej stronie";
    exceptionButton.className = currentExceptionDomain ? "" : "secondary";
    const title = $("site-title");
    title.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = currentExceptionDomain && currentExceptionDomain !== currentHost
      ? "Wyjątek odziedziczony z domeny nadrzędnej"
      : "Wyjątek dla bieżącej strony";
    title.append(heading);
  } else {
    $("site-host").textContent = "Ta karta nie udostępnia zwykłego adresu HTTP/HTTPS (np. strona ustawień przeglądarki).";
    exceptionButton.disabled = true;
    exceptionButton.textContent = "Wyjątek niedostępny";
  }
}

async function refresh() {
  try {
    const tabs = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
    const rawUrl = tabs?.[0]?.url;
    try { currentHost = rawUrl ? new URL(rawUrl).hostname.toLowerCase() : null; } catch (_) { currentHost = null; }
    const response = await send({ type: "CAT_GET_STATE", hostname: currentHost || "" });
    render(response.state);
  } catch (error) {
    networkStatus.textContent = `Błąd odczytu stanu: ${error.message}`;
    networkStatus.className = "status bad";
  }
}

protectionButton.addEventListener("click", async () => {
  setButtonBusy(protectionButton, true);
  try { await send({ type: "CAT_SET_ENABLED", enabled: currentState?.enabled === false }); await refresh(); }
  catch (error) { networkStatus.textContent = `Nie udało się zmienić stanu: ${error.message}`; networkStatus.className = "status bad"; }
  finally { setButtonBusy(protectionButton, false); }
});

cleanerButton.addEventListener("click", async () => {
  setButtonBusy(cleanerButton, true);
  try { await send({ type: "CAT_SET_CLEANER_ENABLED", enabled: currentState?.cleanerEnabled === false }); await refresh(); }
  catch (error) { cleanerStatus.textContent = error.message; cleanerStatus.className = "status bad"; }
  finally { setButtonBusy(cleanerButton, false); }
});

exceptionButton.addEventListener("click", async () => {
  if (!currentHost || !currentState) return;
  setButtonBusy(exceptionButton, true);
  const targetDomain = currentExceptionDomain || currentHost;
  const enabled = !currentExceptionDomain;
  try { await send({ type: "CAT_TOGGLE_SITE_EXCEPTION", hostname: targetDomain, enabled }); await refresh(); }
  catch (error) { $("site-host").textContent = `Nie udało się zapisać wyjątku: ${error.message}`; }
  finally { setButtonBusy(exceptionButton, false); }
});

$("reset").addEventListener("click", async () => {
  try { await send({ type: "CAT_RESET_COUNT" }); await refresh(); } catch (_) { /* state remains unchanged */ }
});
$("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
refresh();
