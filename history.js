const btnClearHistory = document.getElementById("clearHistory");
const btnRefreshHistory = document.getElementById("refreshHistory");

document.addEventListener("DOMContentLoaded", () => {
  if (!window.T) return;

  document.getElementById("pageTitle").textContent = T.historyPageTitle;
  document.getElementById("mainTitle").textContent = T.historyMainTitle;
  document.getElementById("activeTitle").textContent = T.historyActiveTitle;
  document.getElementById("discardedTitle").textContent =
    T.historyDiscardedTitle;
  btnClearHistory.textContent = window.T.CLEAR_HISTORY;
  btnRefreshHistory.textContent = window.T.REFRESH_HISTORY;

  btnClearHistory.addEventListener("click", () => {
    if (!confirm(T.CLEAR_HISTORY + "?")) return;

    chrome.storage.local.set({ newsHistory: {} }, () => {
      renderHistoryTable(document.getElementById("historyActive"), []);
      renderHistoryTable(document.getElementById("historyDiscarded"), []);
      checkHistoryButton();
      alert(T.HISTORY_CLEARED + " ✅");
    });
  });

  btnRefreshHistory.addEventListener("click", () => {
    window.location.reload();
  });
});

function renderHistoryTable(container, items) {
  container.innerHTML = "";

  if (!items || items.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-history";
    p.textContent = T.historyEmpty;
    container.appendChild(p);
    return;
  }

  const lang = getBrowserLanguage();

  const headers =
    lang === "es"
      ? [
          "",
          "Noticia original:",
          "Resumen:",
          "Idioma:",
          "Categoría:",
          "Decisión IA:",
          "Motivo IA:",
          "Decisión final (usuarios):",
          "Estado:",
          "Fecha de comprobación:",
        ]
      : [
          "",
          "Original news:",
          "Summary:",
          "Language:",
          "Category:",
          "AI decision:",
          "AI Reason:",
          "Final decision (users):",
          "Status:",
          "Check date:",
        ];

  const table = document.createElement("table");

  // ===== HEADER =====
  const headerRow = document.createElement("tr");

  headers.forEach((h) => {
    const th = document.createElement("th");
    th.style.textAlign = "left";
    th.style.paddingLeft = "8px";
    th.textContent = h;
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  // ===== ROWS =====
  items.forEach((item) => {
    const tr = document.createElement("tr");

    // IMAGE
    const tdImg = document.createElement("td");
    if (item.url_image) {
      const img = document.createElement("img");
      img.src = item.url_image;
      img.width = 50;
      tdImg.appendChild(img);
    }
    tr.appendChild(tdImg);

    // ORIGINAL NEWS
    const tdOriginal = document.createElement("td");
    const aOriginal = document.createElement("a");
    aOriginal.href = item.original_url;
    aOriginal.target = "_blank";
    aOriginal.rel = "noopener noreferrer";
    aOriginal.textContent =
      item.original_title || item.original_url || "";
    tdOriginal.appendChild(aOriginal);
    tr.appendChild(tdOriginal);

    // SUMMARY
    const tdSummary = document.createElement("td");
    const aSummary = document.createElement("a");
    aSummary.href = item.url;
    aSummary.target = "_blank";
    aSummary.rel = "noopener noreferrer";
    aSummary.textContent = item.title || item.url || "";
    tdSummary.appendChild(aSummary);
    tr.appendChild(tdSummary);

    // LANGUAGE
    const tdLang = document.createElement("td");
    const aLang = document.createElement("a");
    aLang.href = `https://killbait.com/?language=${item.language}`;
    aLang.target = "_blank";
    aLang.rel = "noopener noreferrer";
    aLang.textContent =
      item.language === "es" ? "Español" : "English";
    tdLang.appendChild(aLang);
    tr.appendChild(tdLang);

    // CATEGORY
    const tdCategory = document.createElement("td");
    const aCategory = document.createElement("a");
    aCategory.href = `https://killbait.com/posts/published?category=${item.category || ""}`;
    aCategory.target = "_blank";
    aCategory.rel = "noopener noreferrer";
    aCategory.textContent = item.category || "";
    tdCategory.appendChild(aCategory);
    tr.appendChild(tdCategory);

    // AI DECISION
    const tdAI = document.createElement("td");
    tdAI.style.textAlign = "center";
    tdAI.textContent =
      item.status === "P"
        ? "⏳"
        : item.isclickbait_ia === null
        ? "❌"
        : item.isclickbait_ia
        ? "🔴"
        : "🟢";
    tr.appendChild(tdAI);

    // AI REASON
    const tdReason = document.createElement("td");
    tdReason.textContent = item.reason || "";
    tr.appendChild(tdReason);

    // USER DECISION
    const tdUser = document.createElement("td");
    tdUser.style.textAlign = "center";
    tdUser.textContent =
      item.status === "P"
        ? "⏳"
        : item.isclickbait_users === null
        ? "❌"
        : item.isclickbait_users
        ? "🔴"
        : "🟢";
    tr.appendChild(tdUser);

    // STATUS
    const tdStatus = document.createElement("td");
    tdStatus.textContent = mapStatus(
      item.status,
      item.isclickbait_users
    );
    tr.appendChild(tdStatus);

    // CHECK DATE
    const tdDate = document.createElement("td");
    tdDate.textContent = item.checked_at
      ? new Date(item.checked_at).toLocaleString()
      : "";
    tr.appendChild(tdDate);

    table.appendChild(tr);
  });

  container.appendChild(table);
}


function renderHistoryTables()
{
  chrome.storage.local.get(["newsHistory"], (data) => {
    const history = Object.values(data.newsHistory || {});

    history.sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));

    const active = history.filter(
      (item) => item.status !== "D" && item.status != "X"
    );
    const discarded = history.filter(
      (i) => i.status === "D" || i.status === "X"
    );

    renderHistoryTable(document.getElementById("historyActive"), active);

    renderHistoryTable(document.getElementById("historyDiscarded"), discarded);
  });
}



function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || "en";
  return lang.slice(0, 2).toLowerCase();
}

function mapStatus(status, isclickbait_users) {
  const isSpanish = getBrowserLanguage() === "es";

  const labels = isSpanish
    ? {
      checked: "Comprobada",
      pending: "En proceso",
      discarded: "Descartada",
      unverifiable: "No comprobable",
    }
    : {
      checked: "Checked",
      pending: "Processing",
      discarded: "Discarded",
      unverifiable: "Unverifiable",
    };

  switch (status) {
    case "A":
    case "N":
    case "H":
      return labels.checked;
    case "P":
      return labels.pending;
    case "D":
      if (isclickbait_users) {
        return labels.discarded;
      } else {
        return labels.unverifiable;
      }
    case "X":
      return labels.unverifiable;
    default:
      return status;
  }
}

async function recheckPendingNews() {
  chrome.storage.local.get(["apikey"], async (cfg) => {
    if (!cfg.apikey) return;

    chrome.storage.local.get(["newsHistory"], async (data) => {
      const newsHistory = data.newsHistory || {};
      const pendingItems = Object.values(newsHistory).filter(
        (item) => item.status === "P"
      );

      if (pendingItems.length === 0) return;

      let changed = false;

      for (const item of pendingItems) {
        try {
          const res = await fetch(
            `https://server1.killbait.com/api/public/checkURL` +
            `?ridpost=${encodeURIComponent(item.rid)}` +
            `&apikey=${encodeURIComponent(cfg.apikey)}`
          );

          if (res.status === 406) {
            item.status = "D";
            changed = true;
            continue;
          }

          if (!res.ok) continue;

          const text = await res.text();

          try {
            const json = JSON.parse(text);

            if (json.status === "D") {
              item.status = "D";
              changed = true;
              continue;
            }

            Object.assign(item, {
              url: json.url || item.url,
              title: json.title || item.title,
              original_url: json.original_url || item.original_url,
              original_title: json.original_title || item.original_title,
              language: json.language || item.language,
              category: json.category || item.category,
              url_image: json.url_image || item.url_image,
              isclickbait_ia: json.isclickbait_ia ?? item.isclickbait_ia,
              isclickbait_users:
                json.isclickbait_users ?? item.isclickbait_users,
              reason: json.reason || item.reason,
              status: json.status,
              checked_at: new Date().toISOString(),
            });

            changed = true;
          } catch {
            continue;
          }
        } catch (e) {
          continue;
        }
      }

      if (changed) {
        chrome.storage.local.set({ newsHistory }, () => {
          renderHistoryTables();
        });
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderHistoryTables();
  recheckPendingNews();
  const legends = [
    { id: "legendPending", text: T.pending },
    { id: "legendNotClickbait", text: T.notClickbait },
    { id: "legendClickbait", text: T.clickbait },
    { id: "legendNotCheckable", text: T.NOT_CHECKABLE_MEDIA },

    { id: "legendPendingDiscarded", text: T.pending },
    { id: "legendNotClickbaitDiscarded", text: T.notClickbait },
    { id: "legendClickbaitDiscarded", text: T.clickbait },
    { id: "legendNotCheckableDiscarded", text: T.NOT_CHECKABLE_MEDIA },
  ];

  legends.forEach((l) => {
    const el = document.getElementById(l.id);
    if (el) el.textContent = l.text;
  });

  checkHistoryButton();
});

function checkHistoryButton() {
  chrome.storage.local.get(["newsHistory"], (data) => {
    const hasHistory =
      data.newsHistory && Object.keys(data.newsHistory).length > 0;
    btnClearHistory.disabled = !hasHistory;
  });
}
