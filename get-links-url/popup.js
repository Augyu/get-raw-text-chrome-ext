const linksBox = document.getElementById("linksBox");
const copyBtn = document.getElementById("copyBtn");
const loadBtn = document.getElementById("loadBtn");
const statusEl = document.getElementById("status");

const VERSION = "1.4";

function getMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<a[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
    .replace(/<strong[^>]*>|<\/strong>/gi, "")
    .replace(/<b[^>]*>|<\/b>/gi, "")
    .replace(/<em[^>]*>|<\/em>/gi, "")
    .replace(/<i[^>]*>|<\/i>/gi, "")
    .replace(/<span[^>]*>|<\/span>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#\d+;|&[a-z]+;/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchGreenhouseJob(iframeSrc) {
  try {
    const url = new URL(iframeSrc);
    const company = url.searchParams.get("for");
    const token = url.searchParams.get("token");

    if (!company || !token) return null;

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${token}`;
    const res = await fetch(apiUrl);

    if (!res.ok) return null;

    const data = await res.json();

    const parts = [];

    if (data.title) {
      parts.push(`Title: ${data.title}`);
    }

    if (data.location?.name) {
      parts.push(`Location: ${data.location.name}`);
    }

    if (data.content) {
      parts.push(htmlToText(data.content));
    }

    return htmlToText(parts.join("\n\n"));
  } catch (e) {
    return null;
  }
}

async function getTabContent(tab) {
  try {
    const frameResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const iframe = document.querySelector(
          "iframe[src*='boards.greenhouse.io'], iframe[src*='greenhouse.io/embed']"
        );

        return iframe ? iframe.src : null;
      }
    });

    const iframeSrc = frameResults[0]?.result;

    if (iframeSrc) {
      const greenhouseContent = await fetchGreenhouseJob(iframeSrc);

      if (greenhouseContent) {
        return htmlToText(greenhouseContent);
      }
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const main = document.querySelector("main, article, [role='main']");
        const root = main || document.body;
        const clone = root.cloneNode(true);

        clone
          .querySelectorAll(
            "nav, footer, header, script, style, iframe, noscript, svg, [aria-hidden='true']"
          )
          .forEach(el => el.remove());

        return clone.innerHTML;
      }
    });

    return htmlToText(results[0]?.result || "");
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

  const validTabs = tabs.filter(tab => {
    return (
      tab.url &&
      !tab.url.startsWith("chrome://") &&
      !tab.url.startsWith("chrome-extension://") &&
      !tab.url.startsWith("about:") &&
      !tab.url.startsWith("edge://") &&
      !tab.url.startsWith("brave://")
    );
  });

  const mode = getMode();
  const output = [];

  for (let i = 0; i < validTabs.length; i++) {
    const tab = validTabs[i];

    statusEl.textContent = `Reading tab ${i + 1} of ${validTabs.length}...`;

    if (mode === "content") {
      const rawContent = await getTabContent(tab);
      const content = htmlToText(rawContent);

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

  statusEl.textContent = `Done — ${validTabs.length} tab${
    validTabs.length !== 1 ? "s" : ""
  } loaded`;

  loadBtn.disabled = false;
  copyBtn.disabled = false;
}

loadBtn.addEventListener("click", loadTabs);

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(linksBox.value);

  copyBtn.textContent = "Copied!";

  setTimeout(() => {
    copyBtn.textContent = "Copy All";
  }, 2000);
});

document.addEventListener("DOMContentLoaded", () => {
  const loadBtn = document.getElementById("loadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const linksBox = document.getElementById("linksBox");

  loadBtn.addEventListener("click", loadTabs);

  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(linksBox.value);

    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy All";
    }, 2000);
  });
});