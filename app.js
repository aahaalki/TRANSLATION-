const languages = [
  { code: "auto", name: "Auto Detect" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

const state = {
  history: [],
  maxChars: 500,
};

const els = {
  fromLang: document.getElementById("fromLang"),
  toLang: document.getElementById("toLang"),
  sourceText: document.getElementById("sourceText"),
  targetText: document.getElementById("targetText"),
  translateButton: document.getElementById("translateButton"),
  copyButton: document.getElementById("copyButton"),
  status: document.getElementById("status"),
  charCount: document.getElementById("charCount"),
  swapButton: document.getElementById("swapButton"),
  historyList: document.getElementById("historyList"),
  clearHistory: document.getElementById("clearHistory"),
  historyTemplate: document.getElementById("historyItemTemplate"),
};

function init() {
  populateLanguageSelects();
  restoreHistory();
  bindEvents();
  updateCharCount();
}

function populateLanguageSelects() {
  languages.forEach((lang) => {
    const optionFrom = document.createElement("option");
    optionFrom.value = lang.code;
    optionFrom.textContent = lang.name;
    if (lang.code === "auto") {
      optionFrom.selected = true;
    }
    els.fromLang.appendChild(optionFrom);

    if (lang.code === "auto") {
      return;
    }

    const optionTo = document.createElement("option");
    optionTo.value = lang.code;
    optionTo.textContent = lang.name;
    if (lang.code === "es") {
      optionTo.selected = true;
    }
    els.toLang.appendChild(optionTo);
  });
}

function bindEvents() {
  els.sourceText.addEventListener("input", updateCharCount);
  els.translateButton.addEventListener("click", handleTranslate);
  els.copyButton.addEventListener("click", handleCopy);
  els.swapButton.addEventListener("click", swapLanguages);
  els.clearHistory.addEventListener("click", clearHistory);
}

function updateCharCount() {
  const text = els.sourceText.value.slice(0, state.maxChars);
  if (text.length !== els.sourceText.value.length) {
    els.sourceText.value = text;
  }
  els.charCount.textContent = `${text.length} / ${state.maxChars}`;
  els.translateButton.disabled = text.trim().length === 0;
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#b91c1c" : "#475569";
}

async function handleTranslate() {
  const source = els.sourceText.value.trim();
  if (!source) return;

  const from = els.fromLang.value;
  const to = els.toLang.value;

  if (from === to) {
    setStatus("Pick different languages", true);
    return;
  }

  setStatus("Translating...");
  els.translateButton.disabled = true;

  try {
    const translation = await fetchTranslation(source, from, to);
    els.targetText.value = translation;
    setStatus("Done");
    addToHistory({ source, translation, from, to });
  } catch (error) {
    console.error(error);
    setStatus("Translation failed", true);
  } finally {
    els.translateButton.disabled = false;
  }
}

async function fetchTranslation(text, from, to) {
  const params = new URLSearchParams({
    q: text,
    langpair: `${from === "auto" ? "auto" : from}|${to}`,
  });

  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();
  const translatedText = data?.responseData?.translatedText;
  if (!translatedText) {
    throw new Error("Missing translation");
  }
  return translatedText;
}

async function handleCopy() {
  const text = els.targetText.value.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard");
  } catch (error) {
    console.error(error);
    setStatus("Clipboard blocked", true);
  }
}

function swapLanguages() {
  const from = els.fromLang.value;
  const to = els.toLang.value;
  if (to === "auto") return;
  els.fromLang.value = to;
  els.toLang.value = from === "auto" ? "en" : from;

  if (els.targetText.value) {
    els.sourceText.value = els.targetText.value;
    els.targetText.value = "";
    updateCharCount();
  }
  setStatus("Languages swapped");
}

function addToHistory(entry) {
  const withStamp = { ...entry, ts: Date.now() };
  state.history = [withStamp, ...state.history].slice(0, 10);
  localStorage.setItem("qt-history", JSON.stringify(state.history));
  renderHistory();
}

function restoreHistory() {
  const saved = localStorage.getItem("qt-history");
  if (saved) {
    state.history = JSON.parse(saved);
    renderHistory();
  }
}

function renderHistory() {
  els.historyList.innerHTML = "";
  if (state.history.length === 0) {
    els.historyList.innerHTML = "<li>No history yet.</li>";
    return;
  }
  state.history.forEach((item) => {
    const node = els.historyTemplate.content.cloneNode(true);
    node.querySelector(".history__meta").textContent = `${formatCode(
      item.from
    )} → ${formatCode(item.to)} · ${new Date(item.ts).toLocaleTimeString()}`;
    node.querySelector(".history__source").textContent = item.source;
    node.querySelector(".history__target").textContent = item.translation;
    node.querySelector(".history__reapply").addEventListener("click", () => {
      els.sourceText.value = item.source;
      els.targetText.value = item.translation;
      els.fromLang.value = item.from;
      els.toLang.value = item.to;
      updateCharCount();
      setStatus("Reused from history");
    });
    els.historyList.appendChild(node);
  });
}

function formatCode(code) {
  const label = languages.find((lang) => lang.code === code)?.name;
  return label ?? code;
}

function clearHistory() {
  state.history = [];
  localStorage.removeItem("qt-history");
  renderHistory();
  setStatus("History cleared");
}

window.addEventListener("DOMContentLoaded", init);

