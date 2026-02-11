function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || "en";
  return lang.slice(0, 2).toLowerCase();
}

// ---------- MAIN ----------
browser.runtime.onMessage.addListener(async (msg, sender) => {

  // ---------- SEND URL ----------
  if (msg.action === "sendURL") {
    const cfg = await browser.storage.local.get(["apikey", "language"]);

    if (!cfg.apikey) {
      return { error: "ERR_API_KEY_NOT_CONFIGURED" };
    }

    const language = cfg.language || getBrowserLanguage();
    const params = new URLSearchParams();
    params.append("url", msg.url);
    params.append("language", language);
    params.append("apikey", cfg.apikey);

    try {
      const res = await fetch(
        "https://server1.killbait.com/api/public/queueURL",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        const errorKey = mapApiError(res.status, text);
        return { error: errorKey };
      }

      const text = await res.text();

      let message = "";
      let data = null;

      try {
        data = JSON.parse(text);

        incrementDailyCounter(data.countToday);

        switch (data.status) {
          case "A":
          case "N":
            message = null;
            break;
          case "H":
            message = "NEWS_IN_ARCHIVE";
            break;
          case "D":
            message = "INFO_DISCARDED";
            break;
          default:
            message = "ERR_UNKNOWN";
        }
      } catch (e) {
        const ridText = text.trim();
        const ridPattern =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (ridPattern.test(ridText)) {
          message = "INFO_PENDING_PROCESS";
          data = { rid: ridText };
        } else {
          message = "ERR_UNEXPECTED_RESPONSE";
        }
      }

      return { message, data };

    } catch (e) {
      return { error: e.message };
    }
  }

  // ---------- KB_APIKEY ----------
  if (msg.type === "KB_APIKEY" && msg.apikey) {
    const data = await browser.storage.local.get("apikey");

    if (!data.apikey) {
      await browser.storage.local.set({ apikey: msg.apikey });
      return { ok: true, source: "web" };
    }

    return { ok: false, reason: "already-set" };
  }

  // ---------- RESET DAY ----------
  if (msg.type === "RESET_DAY") {
    await checkAndResetDailyCounter();
    return { ok: true };
  }

});


(async () => {
  const data = await browser.storage.local.get(["day", "count"]);
  const today = todayKey();

  if (data.day === today) {
    updateBadge(data.count || 0);
  } else {
    await browser.storage.local.set({ day: today, count: 0 });
    updateBadge(0);
  }
})();


function mapApiError(status, text) {
  const code = (text || "").trim();

  if (status === 400) {
    switch (code) {
      case "URL_NOT_VALID":
        return "ERR_URL_NOT_VALID";
      case "LANGUAGE_NOT_VALID":
        return "ERR_LANGUAGE_NOT_VALID";
      case "API_KEY_NOT_VALID":
        return "ERR_API_KEY_NOT_VALID";
      case "ONLY_TEN_URLS_BY_DAY":
        return "ERR_ONLY_TEN_URLS_BY_DAY";
      default:
        return "ERR_BAD_REQUEST";
    }
  }

  switch (status) {
    case 406:
      return "ERR_NOT_ACCEPTABLE";
    case 417:
      return "ERR_MEDIA_UNDER_REVIEW";
    case 409:
      return "ERR_ALREADY_EXISTS";
    case 500:
      return "ERR_INTERNAL";
    default:
      return "ERR_UNKNOWN";
  }
}



browser.runtime.onInstalled.addListener(async () => {
  const tabs = await browser.tabs.query({ url: "*://killbait.com/*" });

  for (const tab of tabs) {
    if (!tab.id) continue;

    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-script.js"],
      });
    } catch (err) {
      console.warn("Cannot inject in tab", tab.id, err.message);
    }
  }
});


function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function updateBadge(count) {
  browser.action.setBadgeText({ text: count > 0 ? String(count) : "" });

  browser.action.setBadgeBackgroundColor({
    color: count >= 10 ? "#d00" : count >= 7 ? "#f90" : "#0a0",
  });
}

async function incrementDailyCounter(count) {
  const today = todayKey();
  await browser.storage.local.set({ day: today, count });
  updateBadge(count);
}


async function checkAndResetDailyCounter() {
  const today = todayKey();

  const data = await browser.storage.local.get(["day", "count"]);

  if (data.day !== today) {
    await browser.storage.local.set({ day: today });
    await browser.storage.local.remove("count");
    updateBadge(0);
  } else {
    updateBadge(data.count || 0);
  }
}


browser.runtime.onStartup.addListener(async () => {
  const data = await browser.storage.local.get("count");
  updateBadge(data.count || 0);
});
