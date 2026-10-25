"use strict";
const cleaner = document.getElementById("cleaner");
const exceptions = document.getElementById("exceptions");
const status = document.getElementById("status");
function validHost(value) {
  const host = value.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.length > 253 || host.includes("..") || host.includes("/") || host.includes(":") || host.includes(" ")) return null;
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host) ? host : null;
}
async function load() {
  const data = await chrome.storage.local.get({ cleanerEnabled: true, exceptions: [] });
  cleaner.checked = data.cleanerEnabled !== false;
  exceptions.value = Array.isArray(data.exceptions) ? data.exceptions.join("\n") : "";
}
document.getElementById("save").addEventListener("click", async () => {
  const lines = exceptions.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (lines.length > 100) { status.textContent = "Maksymalnie 100 wyjątków."; return; }
  const hosts = lines.map(validHost);
  if (hosts.some(x => !x)) { status.textContent = "Lista zawiera nieprawidłową domenę."; return; }
  await chrome.storage.local.set({ cleanerEnabled: cleaner.checked, exceptions: [...new Set(hosts)] });
  status.textContent = "Ustawienia zapisane lokalnie.";
});
load().catch(() => { status.textContent = "Nie udało się wczytać ustawień."; });
