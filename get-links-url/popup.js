const linksBox = document.getElementById("linksBox");
const copyBtn = document.getElementById("copyBtn");
const loadBtn = document.getElementById("loadBtn");
const statusEl = document.getElementById("status");

function getMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

async function getTabContent(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Prefer <main> or <article> for cleaner content, fall back to body
        const main = document.querySelector("main, article, [role='main']");
        return (main || document.body).innerText.trim();
      }
    });
    return results[0]?.result || "";
  } catch (e) {
    return `[Could not read content: ${e.message}]`;
  }
}

async function loadTabs() {
  loadBtn.disabled = true;
  copyBtn.disabled = true;
  linksBox.value = "";
  statusEl.textContent = "Loading...";

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const validTabs = tabs.filter(t => t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("about:"));

  const mode = getMode();
  const output = [];

  for (let i = 0; i < validTabs.length; i++) {
    const tab = validTabs[i];
    statusEl.textContent = `Reading tab ${i + 1} of ${validTabs.length}...`;

    if (mode === "content") {
      const content = await getTabContent(tab);
      output.push(
        `${"=".repeat(60)}\n` +
        `TAB ${i + 1}: ${tab.title}\n` +
        `URL: ${tab.url}\n` +
        `${"=".repeat(60)}\n` +
        content
      );
    } else {
      output.push(tab.url);
    }
  }

  linksBox.value = mode === "content"
    ? output.join("\n\n")
    : output.join("\n");

  statusEl.textContent = `Done — ${validTabs.length} tab${validTabs.length !== 1 ? "s" : ""} loaded`;
  loadBtn.disabled = false;
  copyBtn.disabled = false;
}

loadBtn.addEventListener("click", loadTabs);

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(linksBox.value);
  copyBtn.textContent = "Copied!";
  setTimeout(() => { copyBtn.textContent = "Copy All"; }, 2000);
});
