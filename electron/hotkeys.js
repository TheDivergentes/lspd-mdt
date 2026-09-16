// Глобальные системные хоткеи (globalShortcut Electron).
// Работают поверх любого активного окна, включая игру, но НЕ читают
// и не изменяют память процесса игры — просто ловят нажатие клавиши в ОС
// и открывают/закрывают/показывают плавающие окна-панели нашего приложения.
//
// Привязки хранятся в electron-store и могут быть изменены из Настроек
// без перезапуска приложения — см. reloadHotkeys().

const store = require("./store");

const DEFAULT_BINDINGS = {
  F7: "quickmenu",       // Police Assistant
  F8: "radio",           // Радио
  F9: "mdt",              // MDT
  F10: "codex",           // Памятки
  F11: "discordlog",      // Discord
  F6: "bodycam",           // оверлей "бодикамера" для записи в OBS
  "Control+Shift+S": "__captureRegion__", // захват области экрана с разметкой
  "Control+K": "__toggleAll__", // показать/скрыть все открытые панели разом
  Insert: "__toggleInteractive__", // переключить режим "клик сквозь панели" / "можно нажимать кнопки"
  "Control+Alt+Q": "__quit__" // полностью закрыть приложение — работает всегда, даже если не видно трея
};

const PANEL_LABELS = {
  quickmenu: "Police Assistant",
  radio: "Радио",
  mdt: "MDT",
  codex: "Памятка",
  binder: "Биндер",
  discordlog: "Discord",
  dashboard: "Главная (LSPD Assistant)",
  settings: "Настройки",
  bodycam: "Bodycam-оверлей",
  __toggleAll__: "Показать/скрыть все панели",
  __toggleInteractive__: "Переключить режим взаимодействия (клик сквозь панели)",
  __captureRegion__: "Захват области экрана с разметкой",
  __quit__: "Закрыть программу полностью"
};

let _globalShortcut = null;
let _windows = null;
let _quit = null;

function getBindings() {
  const saved = store.get("hotkeys.bindings", null);
  // Важно: НЕ домешиваем дефолты к уже сохранённому набору — иначе
  // переименованная или удалённая клавиша (например, K → "-") продолжит
  // работать по старому значению из DEFAULT_BINDINGS. Если сохранение
  // было — оно и есть полный список хоткеев; дефолты берём только когда
  // сохранений ещё не было вообще.
  if (saved && Object.keys(saved).length) return saved;
  return { ...DEFAULT_BINDINGS };
}

function applyBindings() {
  if (!_globalShortcut || !_windows) return [];
  _globalShortcut.unregisterAll();
  const bindings = getBindings();
  const results = [];
  Object.entries(bindings).forEach(([key, target]) => {
    if (!key || !target) return;
    try {
      _globalShortcut.register(key, () => {
        if (target === "__toggleAll__") _windows.toggleAllVisibility();
        else if (target === "__toggleInteractive__") _windows.toggleInteractiveMode();
        else if (target === "__captureRegion__") _windows.openCaptureWindow();
        else if (target === "__quit__") _quit && _quit();
        else _windows.togglePanel(target);
      });
      // register() Electron'а не бросает исключение на некорректное имя
      // клавиши — просто ничего не регистрирует. Проверяем явно, иначе
      // пользователь молча остаётся с нерабочим хоткеем без объяснений.
      const ok = _globalShortcut.isRegistered(key);
      results.push({ key, target, ok });
      if (!ok) console.error(`Хоткей "${key}" не зарегистрировался — Electron не распознал имя клавиши.`);
    } catch (e) {
      results.push({ key, target, ok: false, error: e.message });
      console.error(`Не удалось зарегистрировать хоткей ${key}:`, e);
    }
  });
  return results;
}

function registerHotkeys({ globalShortcut, windows, quit }) {
  _globalShortcut = globalShortcut;
  _windows = windows;
  _quit = quit;
  return applyBindings();
}

/** Перечитывает привязки из store и перерегистрирует — вызывается после сохранения в Настройках.
 * Возвращает список { key, target, ok } — какие клавиши реально зарегистрировались. */
function reloadHotkeys() {
  return applyBindings();
}

function unregisterHotkeys({ globalShortcut }) {
  globalShortcut.unregisterAll();
}

module.exports = { registerHotkeys, unregisterHotkeys, reloadHotkeys, getBindings, DEFAULT_BINDINGS, PANEL_LABELS };
