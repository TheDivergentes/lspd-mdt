const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // окно
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggleAlwaysOnTop"),
  showAuthWindow: () => ipcRenderer.invoke("window:showAuth"),
  quitApp: () => ipcRenderer.invoke("app:quit"),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  listRecentLogs: () => ipcRenderer.invoke("data:listRecentLogs"),
  applyRoleDefaults: () => ipcRenderer.invoke("panel:applyRoleDefaults"),

  // плавающие панели
  openPanel: (name) => ipcRenderer.invoke("panel:open", name),
  hidePanel: (name) => ipcRenderer.invoke("panel:hide", name),
  resetLayout: () => ipcRenderer.invoke("panel:resetLayout"),

  // хоткеи
  getHotkeys: () => ipcRenderer.invoke("hotkeys:get"),
  saveHotkeys: (bindings) => ipcRenderer.invoke("hotkeys:save", bindings),
  resetHotkeys: () => ipcRenderer.invoke("hotkeys:reset"),

  // прозрачность
  getOpacitySettings: () => ipcRenderer.invoke("ui:getOpacitySettings"),
  saveOpacitySettings: (settings) => ipcRenderer.invoke("ui:saveOpacitySettings", settings),

  getInteractiveMode: () => ipcRenderer.invoke("ui:getInteractiveMode"),
  toggleInteractiveMode: () => ipcRenderer.invoke("ui:toggleInteractiveMode"),
  onInteractiveModeChanged: (cb) => ipcRenderer.on("ui:interactiveModeChanged", (_e, value) => cb(value)),

  // обновления
  checkForUpdate: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdateStatus: (cb) => ipcRenderer.on("update:status", (_e, payload) => cb(payload)),

  // рация
  listVoiceChannels: () => ipcRenderer.invoke("data:listVoiceChannels"),
  moveMember: (memberId, channelId) => ipcRenderer.invoke("data:moveMember", { memberId, channelId }),

  // admin / settings
  isConfigured: () => ipcRenderer.invoke("config:isConfigured"),
  adminLogin: (pin) => ipcRenderer.invoke("admin:login", pin),
  changeAdminPin: (oldPin, newPin) => ipcRenderer.invoke("admin:changePin", { oldPin, newPin }),
  getBackendUrl: () => ipcRenderer.invoke("config:getBackendUrl"),
  saveBackendUrl: (url) => ipcRenderer.invoke("config:saveBackendUrl", url),

  // управление фракциями/маппингом ролей (отдельный секрет, не сессия)
  hasAdminSecret: () => ipcRenderer.invoke("admin:hasSecret"),
  saveAdminSecret: (secret) => ipcRenderer.invoke("admin:saveSecret", secret),
  clearAdminSecret: () => ipcRenderer.invoke("admin:clearSecret"),

  listFactions: () => ipcRenderer.invoke("admin:listFactions"),
  createFaction: (payload) => ipcRenderer.invoke("admin:createFaction", payload),
  updateFaction: (id, payload) => ipcRenderer.invoke("admin:updateFaction", { id, payload }),
  deleteFaction: (id) => ipcRenderer.invoke("admin:deleteFaction", id),

  listRanks: (factionId) => ipcRenderer.invoke("admin:listRank", factionId),
  createRank: (factionId, payload) => ipcRenderer.invoke("admin:createRank", { factionId, payload }),
  updateRank: (id, payload) => ipcRenderer.invoke("admin:updateRank", { id, payload }),
  deleteRank: (id) => ipcRenderer.invoke("admin:deleteRank", id),

  listDepartments: (factionId) => ipcRenderer.invoke("admin:listDepartment", factionId),
  createDepartment: (factionId, payload) => ipcRenderer.invoke("admin:createDepartment", { factionId, payload }),
  updateDepartment: (id, payload) => ipcRenderer.invoke("admin:updateDepartment", { id, payload }),
  deleteDepartment: (id) => ipcRenderer.invoke("admin:deleteDepartment", id),

  listPositions: (factionId) => ipcRenderer.invoke("admin:listPosition", factionId),
  createPosition: (factionId, payload) => ipcRenderer.invoke("admin:createPosition", { factionId, payload }),
  updatePosition: (id, payload) => ipcRenderer.invoke("admin:updatePosition", { id, payload }),
  deletePosition: (id) => ipcRenderer.invoke("admin:deletePosition", id),

  listAcademy: (factionId) => ipcRenderer.invoke("admin:listAcademy", factionId),
  createAcademy: (factionId, payload) => ipcRenderer.invoke("admin:createAcademy", { factionId, payload }),
  updateAcademy: (id, payload) => ipcRenderer.invoke("admin:updateAcademy", { id, payload }),
  deleteAcademy: (id) => ipcRenderer.invoke("admin:deleteAcademy", id),

  // discord auth
  loginWithDiscord: () => ipcRenderer.invoke("auth:loginWithDiscord"),
  getSession: () => ipcRenderer.invoke("auth:getSession"),
  listProfiles: () => ipcRenderer.invoke("auth:listProfiles"),
  continueWithProfile: (officerId) => ipcRenderer.invoke("auth:continueWithProfile", officerId),
  forgetProfile: (officerId) => ipcRenderer.invoke("auth:forgetProfile", officerId),
  logout: () => ipcRenderer.invoke("auth:logout"),

  // discord data modules (форум-каналы = БД)
  listCases: () => ipcRenderer.invoke("data:listCases"),
  createCase: (payload) => ipcRenderer.invoke("data:createCase", payload),
  updateCaseStatus: (threadId, status, changedBy) => ipcRenderer.invoke("data:updateCaseStatus", { threadId, status, changedBy }),

  listCitizens: () => ipcRenderer.invoke("data:listCitizens"),
  createCitizen: (payload) => ipcRenderer.invoke("data:createCitizen", payload),
  updateCitizen: (threadId, fields) => ipcRenderer.invoke("data:updateCitizen", { threadId, fields }),

  listBolo: () => ipcRenderer.invoke("data:listBolo"),
  createBolo: (payload) => ipcRenderer.invoke("data:createBolo", payload),
  updateBoloStatus: (threadId, status) => ipcRenderer.invoke("data:updateBoloStatus", { threadId, status }),

  listCodex: () => ipcRenderer.invoke("data:listCodex"),
  createCodexArticle: (payload) => ipcRenderer.invoke("data:createCodexArticle", payload),
  updateCodexArticle: (threadId, payload) => ipcRenderer.invoke("data:updateCodexArticle", { threadId, payload }),
  deleteCodexArticle: (threadId) => ipcRenderer.invoke("data:deleteCodexArticle", threadId),
  renameCodexCategory: (oldName, newName) => ipcRenderer.invoke("data:renameCodexCategory", { oldName, newName }),

  // вложения и статусы
  updateCase: (threadId, fields, newTitle) => ipcRenderer.invoke("data:updateCase", { threadId, fields, newTitle }),
  attachScreenshots: (threadId, note) => ipcRenderer.invoke("data:attachScreenshots", { threadId, note }),
  listAttachments: (threadId) => ipcRenderer.invoke("data:listAttachments", threadId),
  setOfficerStatus: (code, label) => ipcRenderer.invoke("data:setOfficerStatus", { code, label }),
  broadcastMessage: (message) => ipcRenderer.invoke("data:broadcastMessage", message),
  getOfficerStatus: () => ipcRenderer.invoke("data:getOfficerStatus"),

  // статичные локальные справочники (пока без форум-каналов)
  listVehicles: () => ipcRenderer.invoke("data:listVehicles"),

  listEvidence: () => ipcRenderer.invoke("data:listEvidence"),
  createEvidence: (payload) => ipcRenderer.invoke("data:createEvidence", payload),
  updateEvidence: (threadId, fields) => ipcRenderer.invoke("data:updateEvidence", { threadId, fields }),

  listAccidents: () => ipcRenderer.invoke("data:listAccidents"),
  createAccident: (payload) => ipcRenderer.invoke("data:createAccident", payload),
  updateAccident: (threadId, fields) => ipcRenderer.invoke("data:updateAccident", { threadId, fields }),
  updateAccidentStatus: (threadId, status) => ipcRenderer.invoke("data:updateAccidentStatus", { threadId, status }),
  createVehicle: (payload) => ipcRenderer.invoke("data:createVehicle", payload),
  updateVehicle: (threadId, fields) => ipcRenderer.invoke("data:updateVehicle", { threadId, fields }),

  listWarrants: () => ipcRenderer.invoke("data:listWarrants"),
  createWarrant: (payload) => ipcRenderer.invoke("data:createWarrant", payload),
  updateWarrantStatus: (threadId, status) => ipcRenderer.invoke("data:updateWarrantStatus", { threadId, status }),

  listOfficers: () => ipcRenderer.invoke("data:listOfficers"),
  searchCodex: (query) => ipcRenderer.invoke("data:searchCodex", query),

  // биндер (локальный редактируемый справочник хоткеев/команд)
  getBinder: () => ipcRenderer.invoke("data:getBinder"),
  saveBinder: (binder) => ipcRenderer.invoke("data:saveBinder", binder),

  // события от main-процесса (живые уведомления, на будущее)
  onDiscordLog: (cb) => ipcRenderer.on("discord:log", (_e, entry) => cb(entry))
});
