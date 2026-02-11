const lblApi = document.getElementById("lblApi");
const lblLang = document.getElementById("lblLang");
const saveBtn = document.getElementById("save");
const labelText = document.getElementById("apikey-label-text");
const registerLink = document.getElementById("registerLink");
const titleSettings = document.getElementById("titleSettings");
const titleHelp = document.getElementById("titleHelp");

document.addEventListener("DOMContentLoaded", () => {
  if (!window.T) {
    console.error("i18n not loaded");
    return;
  }

  lblApi.textContent = window.T.apiKey;
  lblLang.textContent = window.T.language;
  saveBtn.textContent = window.T.save;
  labelText.textContent = window.T.noApiKey;
  registerLink.textContent = window.T.register;
  titleSettings.textContent = window.T.TITLE_SETTING;
  titleHelp.textContent = window.T.TITLE_HELP;

  chrome.storage.local.get(["apikey", "language"], (data) => {
    if (data.apikey) {
      document.getElementById("apikey").value = data.apikey;
    }
    if (data.language) {
      document.getElementById("language").value = data.language;
    }
  });

  saveBtn.addEventListener("click", () => {
    chrome.storage.local.set(
      {
        apikey: document.getElementById("apikey").value,
        language: document.getElementById("language").value,
      },
      () => showStatus(window.T.saved)
    );
  });

  const lang = getBrowserLanguage();

  loadFaqs(lang).then(renderFaqs);
});

function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || "en";
  return lang.slice(0, 2).toLowerCase();
}

function showStatus(msg) {
  const statusDiv = document.getElementById("statusMessage");
  statusDiv.textContent = msg;
  statusDiv.classList.add("show");

  // Desaparece automáticamente tras 2 segundos
  setTimeout(() => statusDiv.classList.remove("show"), 2000);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "KB_APIKEY" && msg.apikey) {
    const input = document.getElementById("apikey");

    if (!input.value) {
      input.value = msg.apikey;
      showStatus(window.T.apiDetected);
    }
  }
});

document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const answer = btn.nextElementSibling;
    const isOpen = answer.style.display === "block";

    document
      .querySelectorAll(".faq-answer")
      .forEach((a) => (a.style.display = "none"));
    answer.style.display = isOpen ? "none" : "block";
  });
});

async function loadFaqs(lang) {
  const res = await fetch(chrome.runtime.getURL(`faqs.${lang}.json`));
  return res.json();
}

function renderFaqs(faqs) {
  const container = document.getElementById("faq-container");
  container.innerHTML = "";

  if (!faqs || !faqs.length) return;

  const table = document.createElement("div");
  table.className = "faq-table";

  faqs.forEach((faq, i) => {
    const row = document.createElement("div");
    row.className = "faq-row" + (i % 2 ? " alt" : "");

    const question = document.createElement("button");
    question.type = "button";
    question.className = "faq-question";

    question.appendChild(document.createTextNode(faq.icon + " "));

    const htmlContainer = document.createElement("span");
    htmlContainer.innerHTML = window.DOMPurify
      ? DOMPurify.sanitize(faq.question)
      : faq.question; 
    question.appendChild(htmlContainer);

    question.addEventListener("click", () => {
      table.querySelectorAll(".faq-row.open").forEach((r) => {
        if (r !== row) r.classList.remove("open");
      });
      row.classList.toggle("open");
    });

    const answer = document.createElement("div");
    answer.className = "faq-answer";
    answer.innerHTML = window.DOMPurify
      ? DOMPurify.sanitize(faq.answer)
      : faq.answer;

    row.appendChild(question);
    row.appendChild(answer);
    table.appendChild(row);
  });

  container.appendChild(table);
}
