const result = document.getElementById("result");
const btnSend = document.getElementById("send");
const btnConfig = document.getElementById("config");
const btnHistory = document.getElementById("openHistory");


document.addEventListener("DOMContentLoaded", () => {
  btnSend.textContent = "🔍 " + T.send;
  btnConfig.textContent = "⚙️ " + T.config;
  btnHistory.textContent = "📜 " + T.HISTORY;
});


btnHistory.addEventListener("click", async () => {
  await browser.tabs.create({
    url: browser.runtime.getURL("history.html"),
  });
});

function render(msg, cls = "") {
  result.className = `status ${cls}`;
  result.innerHTML = msg;
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab.url && tab.url.includes("//killbait.com/")) {
    btnSend.disabled = true;
    render(`ℹ️ ${T.alreadyKillbait}`, "warn");
  }
}

init();

btnSend.addEventListener("click", async () => {
  render(`⏳ ${T.sending}`, "loading");

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  try {
    const res = await browser.runtime.sendMessage({ action: "sendURL", url: tab.url });

    if (!res) {
      render(`ℹ️ ${T.NO_SERVER_RESPONSE}`, "error");
      return;
    }

    if (res.error) {
      const msg = T[res.error] || T.ERR_UNKNOWN;
      render("❌ " + msg, "error");
      return;
    }

    if (res.data && res.data.rid) {
      const data = await browser.storage.local.get(["newsHistory"]);
      const newsHistory = data.newsHistory || {};
      const d = res.data;
      const now = new Date().toISOString();
      const item = newsHistory[d.rid] || {};

      const originalUrl = d.original_url ?? tab.url;
      const isNonCheckable =
        originalUrl.startsWith("https://www.youtube.com/") ||
        originalUrl.startsWith("https://tiktok.com") ||
        originalUrl.startsWith("https://www.tiktok.com/");

      if (isNonCheckable) {
        Object.assign(item, {
          rid: d.rid,
          original_url: originalUrl,
          original_title: "",
          url: "",
          title: "",
          language: d.language ?? getBrowserLanguage(),
          status: "X",
          category: "",
          url_image: "",
          isclickbait_ia: null,
          isclickbait_users: null,
          reason: T.INFO_NOT_CHECKABLE_MEDIA,
          checked_at: now,
        });
      } else {
        Object.assign(item, {
          rid: d.rid,
          original_url: originalUrl,
          original_title: d.original_title ?? originalUrl,
          url: d.url ?? item.url ?? "",
          title: d.title ?? item.title ?? "",
          language: d.language ?? item.language ?? getBrowserLanguage(),
          status: item.status !== "X" ? d.status ?? item.status ?? "P" : item.status,
          category: d.category ?? item.category ?? "",
          url_image: d.url_image ?? item.url_image ?? "",
          isclickbait_ia: d.isclickbait_ia ?? item.isclickbait_ia ?? null,
          isclickbait_users: d.isclickbait_users ?? item.isclickbait_users ?? null,
          reason: d.reason ?? item.reason ?? "",
          checked_at: now,
        });
      }

      newsHistory[d.rid] = item;
      await browser.storage.local.set({ newsHistory });
    }

    let html = "";
    if (res.message) {
      const translatedMessage = T[res.message] || res.message;
      html += translatedMessage + "<br>";
    }

    const d = res.data;
    if (d && d.title && d.url) {
      html += `<strong><a href="${d.url}" target="_blank">${d.title}</a></strong><br>`;
    }

    if (d && d.reason) {
      html +=
        `<div style="margin-top:10px">${d.isclickbait_ia ? `🔴 ${T.clickbaitIA}:` : `🟢 ${T.notClickbaitIA}:`}</div>` +
        `<div style="margin-top:10px"><em>${d.reason}</em></div>`;
    }

    if (d && d.reason && d.rid) {
      html += `
        <div class="kb-vote-buttons" style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
          <button style="cursor:pointer;" class="kb-btn kb-yes" data-vote="true" data-rid="${d.rid}">
            👎 ${T.isClickbait}
          </button>
          <button style="cursor:pointer;" class="kb-btn kb-no" data-vote="false" data-rid="${d.rid}">
            👍 ${T.notClickbait}
          </button>
          <button style="cursor:pointer;" class="kb-btn kb-summary" data-url="${d.url}">
            📊 ${T.summary || "Resumen"}
          </button>
        </div>
      `;
    }

    if (!html && !res.message) {
      html = `ℹ️ ${T.pending}`;
    }

    render(html, "ok");
  } catch (e) {
    console.error(e);
    render(`❌ ${T.ERR_INTERNAL}`, "error");
  }
});

btnConfig.addEventListener("click", async () => {
  if (browser.runtime.openOptionsPage) {
    await browser.runtime.openOptionsPage();
  } else {
    window.open(browser.runtime.getURL("options.html"));
  }
});

function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || "en";
  return lang.slice(0, 2).toLowerCase();
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.classList.contains("kb-yes") || btn.classList.contains("kb-no")) {
    const vote = btn.dataset.vote === "true";
    const rid = btn.dataset.rid;

    const { apikey } = await browser.storage.local.get("apikey");
    if (!apikey) {
      render(`❌ ${T.API_KEY_NOT_VALID}`, "error");
      return;
    }

    try {
      const body = new URLSearchParams({
        ridpost: rid,
        apikey,
        vote,
      });

      const res = await fetch("https://server1.killbait.com/api/public/clickbaitVote", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (res.status === 200) render(`✅ ${T.VOTE_OK}`, "ok");
      else if (res.status === 400) render(`❌ ${T.API_KEY_NOT_VALID}`, "error");
      else if (res.status === 406) render(`❌ ${T.ERR_NOT_ACCEPTABLE}`, "error");
      else render(`❌ ${T.ERR_INTERNAL}`, "error");
    } catch (e) {
      render(`❌ ${T.ERR_INTERNAL}`, "error");
    }
  }

  if (btn.classList.contains("kb-summary")) {
    const url = btn.dataset.url;
    if (url) await browser.tabs.create({ url });
  }
});

// Resetea contador diario
browser.runtime.sendMessage({ type: "RESET_DAY" });
