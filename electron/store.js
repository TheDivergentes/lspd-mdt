const Store = require("electron-store");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// В прототипе шифруем ключом-заглушкой. Перед реальным использованием
// замените encryptionKey на свой длинный секрет (например, сгенерированный
// один раз и захардкоженный в приватной сборке — НЕ в публичном репозитории).
const store = new Store({
  name: "lspd-mdt-config",
  encryptionKey: "replace-me-with-your-own-32char-secret-key"
});

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin)).digest("hex");
}

// Дефолтный админский PIN при первом запуске. ОБЯЗАТЕЛЬНО смените
// его в приложении сразу после первого входа (Настройки → Сменить PIN).
const DEFAULT_ADMIN_PIN = "1234";

/**
 * Если рядом лежит electron/seed-config.json (вы заполняете его один раз
 * и он зашивается в сборку через `npm run dist`), а локального конфига
 * на этой машине ещё нет — подставляем его автоматически. Так тестировщик
 * при первом запуске сразу видит "Войти через Discord", без PIN и без
 * ручного ввода Client ID/Secret/Bot Token/каналов.
 *
 * Срабатывает только один раз: как только discord.config появился в
 * локальном хранилище (свой или из seed), повторные запуски seed не трогают.
 */
function applySeedConfigIfPresent() {
  if (store.has("backend.url")) return; // уже настроено — не перезаписываем

  const seedPath = path.join(__dirname, "seed-config.json");
  if (!fs.existsSync(seedPath)) return;

  try {
    const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    if (seed.backendUrl) store.set("backend.url", seed.backendUrl);
  } catch (e) {
    console.error("Не удалось прочитать electron/seed-config.json:", e.message);
  }
}

function ensureDefaults() {
  if (!store.has("admin.pinHash")) {
    store.set("admin.pinHash", hashPin(DEFAULT_ADMIN_PIN));
    store.set("admin.mustChangePin", true);
  }
}

ensureDefaults();
applySeedConfigIfPresent();

module.exports = {
  get: (key, fallback) => store.get(key, fallback),
  set: (key, value) => store.set(key, value),
  has: (key) => store.has(key),
  delete: (key) => store.delete(key),
  hashPin,
  DEFAULT_ADMIN_PIN
};
