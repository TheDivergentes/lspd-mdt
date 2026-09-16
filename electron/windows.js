const { BrowserWindow, screen } = require("electron");
const path = require("path");
const store = require("./store");

const isDev = process.env.NODE_ENV === "development";
const DEV_URL = "http://localhost:5173";

// Размеры и расположение подобраны под ваши макеты:
// Police Assistant — верх-право, MDT — низ-лево (крупная панель),
// Памятка/Биндер — по центру (тоже крупные), Discord-лог — низ-право.
const PANEL_CONFIG = {
  quickmenu: { width: 430, height: 740, corner: "top-right" },
  mdt: { width: 900, height: 620, corner: "bottom-left" },
  codex: { width: 1000, height: 650, corner: "center" },
  binder: { width: 660, height: 680, corner: "center" },
  discordlog: { width: 400, height: 480, corner: "bottom-right" },
  radio: { width: 380, height: 330, corner: "top-left" },
  dashboard: { width: 1180, height: 760, corner: "center" },
  settings: { width: 820, height: 700, corner: "center" },
  playersettings: { width: 480, height: 620, corner: "center" },
  factionadmin: { width: 1000, height: 720, corner: "center" },
  bodycam: { width: 320, height: 200, corner: "bottom-left" }
};

const panels = {}; // name -> BrowserWindow
let allVisible = true;

function computePosition(corner, size) {
  const { workArea } = screen.getPrimaryDisplay();
  const margin = 26;
  const positions = {
    "top-right": { x: workArea.x + workArea.width - size.width - margin, y: workArea.y + margin },
    "top-left": { x: workArea.x + margin, y: workArea.y + margin },
    "bottom-left": { x: workArea.x + margin, y: workArea.y + workArea.height - size.height - margin },
    "bottom-right": {
      x: workArea.x + workArea.width - size.width - margin,
      y: workArea.y + workArea.height - size.height - margin
    },
    center: {
      x: workArea.x + (workArea.width - size.width) / 2,
      y: workArea.y + (workArea.height - size.height) / 2
    }
  };
  return positions[corner] || positions.center;
}

/** Применяет поведение прозрачности к окну: тускнеет при потере фокуса,
 * если включён автофейд, возвращается к базовой прозрачности при фокусе. */
function applyOpacityBehavior(win) {
  const applyFocused = () => {
    if (win.isDestroyed()) return;
    win.setOpacity(store.get("ui.opacity", 1));
  };
  const applyUnfocused = () => {
    if (win.isDestroyed()) return;
    const autoFade = store.get("ui.autoFade", false);
    win.setOpacity(autoFade ? store.get("ui.fadeOpacity", 0.35) : store.get("ui.opacity", 1));
  };
  applyFocused();
  win.on("focus", applyFocused);
  win.on("blur", applyUnfocused);
}

/** Переприменяет текущие настройки прозрачности ко всем открытым панелям сразу. */
function refreshOpacitySettings() {
  Object.values(panels).forEach((win) => {
    if (win.isDestroyed()) return;
    if (win.isFocused()) win.setOpacity(store.get("ui.opacity", 1));
    else {
      const autoFade = store.get("ui.autoFade", false);
      win.setOpacity(autoFade ? store.get("ui.fadeOpacity", 0.35) : store.get("ui.opacity", 1));
    }
  });
}

/** Прозрачность окна для мыши: по умолчанию панели ЛОВЯТ клики (обычный
 * режим, можно нажимать кнопки) — так надёжнее для первого запуска.
 * Хоткей Insert включает "клик сквозь панель" (для игры), если он
 * зарегистрировался — на части ноутбуков физической клавиши Insert нет
 * вообще, поэтому дефолт сделан безопасным: без риска заблокировать себя
 * в кликнутом состоянии. Переключить можно и через трей — независимо
 * от того, работает хоткей или нет. */
function getInteractiveMode() {
  return store.get("ui.interactiveMode", true);
}

function applyInteractiveMode(win) {
  const interactive = getInteractiveMode();
  // forward:true — событие mousemove всё равно доходит до окна, чтобы
  // в будущем можно было делать более тонкую логику (наведение и т.п.),
  // но клики/наведение не перехватываются, пока явно не включили режим.
  win.setIgnoreMouseEvents(!interactive, { forward: true });
}

function toggleInteractiveMode() {
  const next = !getInteractiveMode();
  store.set("ui.interactiveMode", next);
  Object.values(panels).forEach((win) => {
    if (win.isDestroyed()) return;
    applyInteractiveMode(win);
    win.webContents.send("ui:interactiveModeChanged", next);
  });
  return next;
}

function createPanel(name) {
  const cfg = PANEL_CONFIG[name];
  if (!cfg) throw new Error(`Неизвестная панель: ${name}`);

  // Восстанавливаем сохранённые размеры/позицию, если пользователь их менял
  const saved = store.get(`panels.${name}`, null);
  const pos = saved || { ...computePosition(cfg.corner, cfg), width: cfg.width, height: cfg.height };

  const win = new BrowserWindow({
    width: pos.width || cfg.width,
    height: pos.height || cfg.height,
    x: pos.x,
    y: pos.y,
    minWidth: 320,
    minHeight: 220,
    frame: false,
    transparent: true, // именно это даёт "плавающую карточку" поверх игры
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setAlwaysOnTop(true, "screen-saver"); // держит окно поверх игры в полноэкранном режиме

  const url = isDev
    ? `${DEV_URL}/#/${name}`
    : `file://${path.join(__dirname, "..", "dist", "index.html")}#/${name}`;
  win.loadURL(url);

  // Запоминаем размер и позицию, чтобы вернуть их при следующем открытии
  const persistBounds = () => {
    if (win.isDestroyed()) return;
    store.set(`panels.${name}`, win.getBounds());
  };
  win.on("resized", persistBounds);
  win.on("moved", persistBounds);

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    delete panels[name];
  });

  applyOpacityBehavior(win);
  applyInteractiveMode(win);

  panels[name] = win;
  return win;
}

/** Сбрасывает сохранённые размеры/позиции всех панелей к значениям по умолчанию. */
function resetLayout() {
  Object.keys(PANEL_CONFIG).forEach((name) => store.delete(`panels.${name}`));
  Object.entries(panels).forEach(([name, win]) => {
    if (win.isDestroyed()) return;
    const cfg = PANEL_CONFIG[name];
    const pos = computePosition(cfg.corner, cfg);
    win.setBounds({ x: pos.x, y: pos.y, width: cfg.width, height: cfg.height });
  });
}

/** Открыть панель, если её ещё нет; иначе — переключить видимость. */
function togglePanel(name) {
  const existing = panels[name];
  if (existing && !existing.isDestroyed()) {
    if (existing.isVisible()) existing.hide();
    else {
      existing.show();
      existing.focus();
    }
  } else {
    createPanel(name);
  }
}

function showPanel(name) {
  const existing = panels[name];
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
  } else {
    createPanel(name);
  }
}

function hidePanel(name) {
  const win = panels[name];
  if (win && !win.isDestroyed()) win.hide();
}

/** Личная раскладка окон: какие панели считать "моим рабочим набором".
 * Без этого Ctrl+K показывает вообще всё, что хоть раз открывали за
 * сессию — даже случайно открытую и забытую панель. Сохранённая раскладка
 * — то, что реально нужно показывать при разворачивании. */
function saveCurrentLayout() {
  const visible = Object.entries(panels)
    .filter(([, w]) => !w.isDestroyed() && w.isVisible())
    .map(([name]) => name);
  store.set("layout.savedPanels", visible);
  return visible;
}

function getSavedLayout() {
  return store.get("layout.savedPanels", null);
}

function clearSavedLayout() {
  store.delete("layout.savedPanels");
}

/** Открывает ровно сохранённую раскладку — прячет всё остальное. */
function openSavedLayout() {
  const saved = getSavedLayout();
  if (!saved || !saved.length) return false;
  Object.values(panels).forEach((w) => {
    if (!w.isDestroyed()) w.hide();
  });
  saved.forEach((name) => showPanel(name));
  allVisible = true;
  return true;
}

/** Хоткей Ctrl+K — спрятать/показать разом. Если есть сохранённая личная
 * раскладка — "показать" означает именно её, а не вообще всё, что когда-
 * либо открывалось за сессию. */
function toggleAllVisibility() {
  allVisible = !allVisible;
  if (allVisible) {
    const saved = getSavedLayout();
    if (saved && saved.length) {
      Object.values(panels).forEach((w) => { if (!w.isDestroyed()) w.hide(); });
      saved.forEach((name) => showPanel(name));
      return;
    }
  }
  Object.values(panels).forEach((w) => {
    if (w.isDestroyed()) return;
    if (allVisible) w.show();
    else w.hide();
  });
}

function closeAllPanels() {
  Object.values(panels).forEach((w) => {
    if (!w.isDestroyed()) w.close();
  });
}

let captureWindow = null;

/** Открывает полноэкранный оверлей захвата — отдельное, одноразовое окно
 * (не входит в panels/раскладку/Ctrl+K). Всегда интерактивно (нужно
 * тащить мышью выделение), независимо от общего режима клика-сквозь. */
function openCaptureWindow() {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.focus();
    return;
  }
  const primary = screen.getPrimaryDisplay();
  captureWindow = new BrowserWindow({
    x: primary.bounds.x,
    y: primary.bounds.y,
    width: primary.bounds.width,
    height: primary.bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  captureWindow.setAlwaysOnTop(true, "screen-saver");
  captureWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const url = isDev ? `${DEV_URL}#capture` : `file://${path.join(__dirname, "..", "dist", "index.html")}#capture`;
  captureWindow.loadURL(url);

  captureWindow.on("closed", () => { captureWindow = null; });
}

function closeCaptureWindow() {
  if (captureWindow && !captureWindow.isDestroyed()) captureWindow.close();
}

module.exports = {
  createPanel,
  togglePanel,
  showPanel,
  hidePanel,
  toggleAllVisibility,
  closeAllPanels,
  resetLayout,
  refreshOpacitySettings,
  getInteractiveMode,
  toggleInteractiveMode,
  saveCurrentLayout,
  getSavedLayout,
  clearSavedLayout,
  openSavedLayout,
  openCaptureWindow,
  closeCaptureWindow,
  panels
};
