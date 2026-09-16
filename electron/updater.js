// Автообновление через electron-updater. Работает только если в
// package.json → build.publish указан реальный источник релизов
// (например, ваш GitHub-репозиторий) и туда реально опубликована сборка
// (npm run dist -- --publish always, с переменной окружения GH_TOKEN).
// Без этого "Проверить обновления" просто вернёт понятную ошибку —
// ничего не сломается.

const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false; // сначала спросим, не будем качать в фоне без спроса

// Последний известный статус — храним отдельно от события, чтобы окно
// аккаунта могло подхватить актуальный статус даже если оно было закрыто
// (не смонтирован React-компонент) в момент, когда пришло само событие —
// иначе автопроверка на старте могла "потеряться" молча.
let lastStatus = null;

function getLastStatus() {
  return lastStatus;
}

function initAutoUpdater(getAuthWindow) {
  const send = (channel, payload) => {
    lastStatus = payload;
    const win = getAuthWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  autoUpdater.on("update-available", (info) => send("update:status", { state: "available", version: info.version }));
  autoUpdater.on("update-not-available", () => send("update:status", { state: "latest" }));
  autoUpdater.on("download-progress", (p) => send("update:status", { state: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", () => send("update:status", { state: "ready" }));
  autoUpdater.on("error", (err) => send("update:status", { state: "error", message: err.message }));
}

module.exports = { autoUpdater, initAutoUpdater, getLastStatus };
