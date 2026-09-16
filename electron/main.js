const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, nativeImage } = require("electron");
const path = require("path");
const { registerHotkeys, unregisterHotkeys } = require("./hotkeys");
const { registerIpcHandlers } = require("./ipcHandlers");
const windows = require("./windows");
const { autoUpdater, initAutoUpdater } = require("./updater");

const isDev = process.env.NODE_ENV === "development";

let authWindow = null; // окно логина/настройки — обычное, непрозрачное
let tray = null;

function createAuthWindow() {
  authWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    frame: false,
    backgroundColor: "#0b1220",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const url = isDev
    ? "http://localhost:5173/#/auth"
    : `file://${path.join(__dirname, "..", "dist", "index.html")}#/auth`;
  authWindow.loadURL(url);
  if (isDev) authWindow.webContents.openDevTools({ mode: "detach" });

  authWindow.on("closed", () => {
    authWindow = null;
    app.quit();
  });

  return authWindow;
}

function createTray() {
  try {
    // 512×512 исходник ужимаем до 16×16 — Windows иногда некорректно
    // показывает трей-иконку, если отдать ей файл большого размера напрямую.
    const trayIcon = nativeImage
      .createFromPath(path.join(__dirname, "..", "build", "icon.png"))
      .resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
  } catch (e) {
    console.error("Не удалось создать значок в трее:", e.message);
    return;
  }
  const menu = Menu.buildFromTemplate([
    { label: "LSPD MDT Assistant", enabled: false },
    { type: "separator" },
    { label: "Показать Главную", click: () => windows.showPanel("dashboard") },
    { label: "Показать Police Assistant", click: () => windows.showPanel("quickmenu") },
    { label: "Показать/скрыть все панели (Ctrl+K)", click: () => windows.toggleAllVisibility() },
    {
      label: "Режим взаимодействия с панелями (Insert)",
      type: "checkbox",
      checked: windows.getInteractiveMode(),
      click: () => windows.toggleInteractiveMode()
    },
    { type: "separator" },
    { label: "Окно входа / настроек", click: () => authWindow?.show() },
    { type: "separator" },
    { label: "Выход", click: () => app.quit() }
  ]);
  tray.setToolTip("LSPD MDT Assistant");
  tray.setContextMenu(menu);
  // Двойной клик по значку — быстрый способ вернуть себе управление,
  // если все панели случайно свёрнуты/спрятаны.
  tray.on("double-click", () => windows.showPanel("dashboard"));
}

app.whenReady().then(() => {
  createAuthWindow();
  createTray();
  registerIpcHandlers({ ipcMain, getAuthWindow: () => authWindow, windows });
  registerHotkeys({ globalShortcut, windows, quit: () => app.quit() });
  initAutoUpdater(() => authWindow);

  // Автопроверка обновлений — тестировщику не нужно вспоминать про кнопку.
  // Первая проверка через 10 сек после запуска (даём приложению осесть),
  // дальше — раз в 2 часа, на случай долгой RP-сессии без перезапуска.
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 2 * 60 * 60 * 1000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createAuthWindow();
  });
});

app.on("will-quit", () => {
  unregisterHotkeys({ globalShortcut });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
