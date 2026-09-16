const { app, BrowserWindow, shell } = require("electron");
const store = require("./store");
const discordAuth = require("./discordAuth");
const backendClient = require("./backendClient");
const hotkeys = require("./hotkeys");
const { autoUpdater } = require("./updater");
const { codexArticles, defaultBinder } = require("./localData");

function registerIpcHandlers({ ipcMain, getAuthWindow, windows }) {
  const token = () => discordAuth.getToken();
  const be = (method, path, body) => backendClient.request(token(), method, path, body);

  // ---------- окно (общее для authWindow и любой панели, вызвавшей его) ----------
  ipcMain.handle("window:minimize", (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
  ipcMain.handle("window:close", (event) => BrowserWindow.fromWebContents(event.sender)?.close());
  ipcMain.handle("window:toggleAlwaysOnTop", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const next = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(next);
    store.set("ui.alwaysOnTop", next);
    return next;
  });
  ipcMain.handle("window:showAuth", () => {
    getAuthWindow()?.show();
    return true;
  });
  ipcMain.handle("app:quit", () => {
    app.quit();
    return true;
  });
  ipcMain.handle("shell:openExternal", (_e, url) => {
    shell.openExternal(url);
    return true;
  });

  // ---------- плавающие панели ----------
  ipcMain.handle("panel:open", (_e, name) => {
    windows.showPanel(name);
    return true;
  });
  ipcMain.handle("panel:hide", (_e, name) => {
    windows.hidePanel(name);
    return true;
  });
  ipcMain.handle("panel:resetLayout", () => {
    windows.resetLayout();
    return true;
  });
  ipcMain.handle("panel:applyRoleDefaults", () => {
    const session = discordAuth.getSession();
    if (!session?.officer) return { ok: false, error: "Нет активной сессии" };
    const preset = session.officer.defaultPanels;
    const panelsToOpen = preset && preset.length ? preset : ["quickmenu"];
    windows.closeAllPanels();
    panelsToOpen.forEach((p) => windows.showPanel(p));
    return { ok: true, panels: panelsToOpen };
  });

  // ---------- хоткеи ----------
  ipcMain.handle("hotkeys:get", () => hotkeys.getBindings());
  ipcMain.handle("hotkeys:save", (_e, bindings) => {
    store.set("hotkeys.bindings", bindings);
    const results = hotkeys.reloadHotkeys();
    return { ok: true, results };
  });
  ipcMain.handle("hotkeys:reset", () => {
    store.delete("hotkeys.bindings");
    const results = hotkeys.reloadHotkeys();
    return { bindings: hotkeys.getBindings(), results };
  });

  // ---------- прозрачность окон ----------
  ipcMain.handle("ui:getOpacitySettings", () => ({
    opacity: store.get("ui.opacity", 1),
    autoFade: store.get("ui.autoFade", false),
    fadeOpacity: store.get("ui.fadeOpacity", 0.35)
  }));
  ipcMain.handle("ui:saveOpacitySettings", (_e, { opacity, autoFade, fadeOpacity }) => {
    store.set("ui.opacity", opacity);
    store.set("ui.autoFade", autoFade);
    store.set("ui.fadeOpacity", fadeOpacity);
    windows.refreshOpacitySettings();
    return true;
  });

  // ---------- режим "клик сквозь панели" (не мешать мыши в игре) ----------
  ipcMain.handle("ui:getInteractiveMode", () => windows.getInteractiveMode());
  ipcMain.handle("ui:toggleInteractiveMode", () => windows.toggleInteractiveMode());

  // ---------- обновления ----------
  ipcMain.handle("update:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, version: result?.updateInfo?.version };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("update:download", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("update:install", () => {
    autoUpdater.quitAndInstall();
    return true;
  });

  // ---------- admin / настройка ----------
  // Discord-конфиг больше не хранится на клиенте — токены/каналы/маппинг
  // ролей переехали на backend. Клиенту нужен только его адрес.
  ipcMain.handle("config:isConfigured", () => store.has("backend.url"));

  ipcMain.handle("admin:login", (_e, pin) => {
    const hash = store.hashPin(pin);
    const ok = hash === store.get("admin.pinHash");
    return { ok, mustChangePin: ok ? store.get("admin.mustChangePin", false) : false };
  });

  ipcMain.handle("admin:changePin", (_e, { oldPin, newPin }) => {
    const currentHash = store.hashPin(oldPin);
    if (currentHash !== store.get("admin.pinHash")) {
      return { ok: false, error: "Текущий PIN указан неверно" };
    }
    if (!newPin || newPin.length < 4) {
      return { ok: false, error: "Новый PIN должен быть не короче 4 символов" };
    }
    store.set("admin.pinHash", store.hashPin(newPin));
    store.set("admin.mustChangePin", false);
    return { ok: true };
  });

  ipcMain.handle("config:getBackendUrl", () => store.get("backend.url", ""));
  ipcMain.handle("config:saveBackendUrl", (_e, url) => {
    store.set("backend.url", url.trim().replace(/\/$/, ""));
    return true;
  });

  // ---------- админ фракций (X-Admin-Secret, не сессия офицера) ----------
  // Отдельный секрет, не связанный с Discord-ролями — управление
  // фракциями/каналами/маппингом ролей для всего альянса. Хранится
  // локально только на машине того, кто его ввёл.
  const adminBe = (method, path, body) => backendClient.adminRequest(store.get("admin.superSecret", ""), method, path, body);

  ipcMain.handle("admin:hasSecret", () => Boolean(store.get("admin.superSecret", "")));
  ipcMain.handle("admin:saveSecret", (_e, secret) => {
    store.set("admin.superSecret", secret);
    return true;
  });
  ipcMain.handle("admin:clearSecret", () => {
    store.delete("admin.superSecret");
    return true;
  });

  ipcMain.handle("admin:listFactions", () => adminBe("GET", "/api/admin/factions"));
  ipcMain.handle("admin:createFaction", (_e, payload) => adminBe("POST", "/api/admin/factions", payload));
  ipcMain.handle("admin:updateFaction", (_e, { id, payload }) => adminBe("PATCH", `/api/admin/factions/${id}`, payload));
  ipcMain.handle("admin:deleteFaction", (_e, id) => adminBe("DELETE", `/api/admin/factions/${id}`));

  // Общий паттерн для 4 независимых измерений роли — Звания/Отделы/Должности/Академия
  function mappingChannels(kind, path) {
    ipcMain.handle(`admin:list${kind}`, (_e, factionId) => adminBe("GET", `/api/admin/factions/${factionId}/${path}`));
    ipcMain.handle(`admin:create${kind}`, (_e, { factionId, payload }) => adminBe("POST", `/api/admin/factions/${factionId}/${path}`, payload));
    ipcMain.handle(`admin:update${kind}`, (_e, { id, payload }) => adminBe("PATCH", `/api/admin/${path}/${id}`, payload));
    ipcMain.handle(`admin:delete${kind}`, (_e, id) => adminBe("DELETE", `/api/admin/${path}/${id}`));
  }
  mappingChannels("Rank", "ranks");
  mappingChannels("Department", "departments");
  mappingChannels("Position", "positions");
  mappingChannels("Academy", "academy");

  // ---------- discord auth (через backend) ----------
  ipcMain.handle("auth:loginWithDiscord", async () => {
    try {
      const session = await discordAuth.loginWithDiscord();
      // После успешного входа: прячем окно логина и открываем панели —
      // по пресету звания (defaultPanels), если он задан на backend'е,
      // иначе по умолчанию только Police Assistant.
      getAuthWindow()?.hide();
      const preset = session.officer.defaultPanels;
      const panelsToOpen = preset && preset.length ? preset : ["quickmenu"];
      panelsToOpen.forEach((p) => windows.showPanel(p));
      return { ok: true, officer: session.officer };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("auth:getSession", () => discordAuth.getSession());

  ipcMain.handle("auth:listProfiles", () => discordAuth.listSavedProfiles());

  ipcMain.handle("auth:continueWithProfile", async (_e, officerId) => {
    try {
      const session = await discordAuth.continueWithProfile(officerId);
      getAuthWindow()?.hide();
      const preset = session.officer.defaultPanels;
      const panelsToOpen = preset && preset.length ? preset : ["quickmenu"];
      panelsToOpen.forEach((p) => windows.showPanel(p));
      return { ok: true, officer: session.officer };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("auth:forgetProfile", (_e, officerId) => {
    discordAuth.forgetProfile(officerId);
    return true;
  });

  ipcMain.handle("auth:logout", () => {
    discordAuth.logout();
    windows.closeAllPanels();
    getAuthWindow()?.show();
    return true;
  });

  // ---------- Дела ----------
  ipcMain.handle("data:listCases", () => be("GET", "/api/cases"));
  ipcMain.handle("data:createCase", (_e, payload) => be("POST", "/api/cases", payload));
  ipcMain.handle("data:updateCaseStatus", (_e, { threadId, status }) => be("PATCH", `/api/cases/${threadId}/status`, { status }));
  ipcMain.handle("data:updateCase", (_e, { threadId, fields }) => be("PATCH", `/api/cases/${threadId}`, { fields }));

  // ---------- Граждане ----------
  ipcMain.handle("data:listCitizens", () => be("GET", "/api/citizens"));
  ipcMain.handle("data:createCitizen", (_e, payload) => be("POST", "/api/citizens", payload));
  ipcMain.handle("data:updateCitizen", (_e, { threadId, fields }) => be("PATCH", `/api/citizens/${threadId}`, { fields }));

  // ---------- BOLO ----------
  ipcMain.handle("data:listBolo", () => be("GET", "/api/bolo"));
  ipcMain.handle("data:createBolo", (_e, payload) => be("POST", "/api/bolo", payload));
  ipcMain.handle("data:updateBoloStatus", (_e, { threadId, status }) => be("PATCH", `/api/bolo/${threadId}/status`, { status }));

  // ---------- Транспорт ----------
  ipcMain.handle("data:listVehicles", () => be("GET", "/api/vehicles"));
  ipcMain.handle("data:createVehicle", (_e, payload) => be("POST", "/api/vehicles", payload));
  ipcMain.handle("data:updateVehicle", (_e, { threadId, fields }) => be("PATCH", `/api/vehicles/${threadId}`, { fields }));

  // ---------- Ордера ----------
  ipcMain.handle("data:listWarrants", () => be("GET", "/api/warrants"));
  ipcMain.handle("data:createWarrant", (_e, payload) => be("POST", "/api/warrants", payload));
  ipcMain.handle("data:updateWarrantStatus", (_e, { threadId, status }) => be("PATCH", `/api/warrants/${threadId}/status`, { status }));

  // ---------- Улики ----------
  ipcMain.handle("data:listEvidence", () => be("GET", "/api/evidence"));
  ipcMain.handle("data:createEvidence", (_e, payload) => be("POST", "/api/evidence", payload));
  ipcMain.handle("data:updateEvidence", (_e, { threadId, fields }) => be("PATCH", `/api/evidence/${threadId}`, { fields }));

  ipcMain.handle("data:listAccidents", () => be("GET", "/api/accidents"));
  ipcMain.handle("data:createAccident", (_e, payload) => be("POST", "/api/accidents", payload));
  ipcMain.handle("data:updateAccident", (_e, { threadId, fields }) => be("PATCH", `/api/accidents/${threadId}`, { fields }));
  ipcMain.handle("data:updateAccidentStatus", (_e, { threadId, status }) => be("PATCH", `/api/accidents/${threadId}/status`, { status }));

  // ---------- Памятка ----------
  ipcMain.handle("data:listCodex", () => be("GET", "/api/codex"));
  ipcMain.handle("data:createCodexArticle", (_e, payload) => be("POST", "/api/codex", payload));
  ipcMain.handle("data:updateCodexArticle", (_e, { threadId, payload }) => be("PATCH", `/api/codex/${threadId}`, payload));
  ipcMain.handle("data:deleteCodexArticle", (_e, threadId) => be("DELETE", `/api/codex/${threadId}`));
  ipcMain.handle("data:renameCodexCategory", (_e, { oldName, newName }) => be("POST", "/api/codex/rename-category", { oldName, newName }));

  // Локальный демо-фоллбек (используется в интерфейсе, только если backend
  // вернул "канал не настроен" — ничего общего с backend не имеет).
  ipcMain.handle("data:searchCodex", (_e, query) => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return codexArticles;
    return codexArticles
      .map((a) => {
        const haystack = `${a.title} ${a.description} ${a.keySigns.join(" ")}`.toLowerCase();
        const hit = haystack.includes(q);
        return { ...a, _match: hit ? 1 : 0 };
      })
      .filter((a) => a._match)
      .sort((a, b) => b._match - a._match);
  });

  // ---------- Сотрудники ----------
  ipcMain.handle("data:listOfficers", () => be("GET", "/api/officers"));
  ipcMain.handle("data:setOfficerStatus", async (_e, { code, label }) => {
    const res = await be("POST", "/api/officers/status", { code, label });
    if (res.ok) store.set("officer.status", { code, label, at: Date.now() });
    return res;
  });
  ipcMain.handle("data:getOfficerStatus", () => store.get("officer.status", null));

  // ---------- Рация ----------
  ipcMain.handle("data:listVoiceChannels", () => be("GET", "/api/radio"));
  ipcMain.handle("data:moveMember", (_e, { memberId, channelId }) => be("POST", "/api/radio/move", { memberId, channelId }));

  // ---------- Discord: живая лента + трансляция из Биндера ----------
  ipcMain.handle("data:listRecentLogs", () => be("GET", "/api/discordlog"));
  ipcMain.handle("data:broadcastMessage", (_e, message) => be("POST", "/api/discordlog/broadcast", { message }));

  // ---------- вложения — пока не перенесены на backend ----------
  // (multipart-загрузка файлов по HTTP ещё не реализована на сервере —
  // см. README backend-проекта, раздел "Что НЕ мигрировано")
  ipcMain.handle("data:attachScreenshots", () => ({
    ok: false,
    error: "Вложения временно недоступны — эта функция ещё не перенесена на backend."
  }));
  ipcMain.handle("data:listAttachments", () => ({ ok: true, attachments: [] }));

  // ---------- биндер (локальный, не связан с Discord) ----------
  ipcMain.handle("data:getBinder", () => store.get("binder.items", defaultBinder));
  ipcMain.handle("data:saveBinder", (_e, binder) => {
    store.set("binder.items", binder);
    return true;
  });
}

module.exports = { registerIpcHandlers };
