// Тонкий HTTP-клиент к вашему backend'у. Заменяет discordBot.js —
// приложение больше не говорит с Discord API напрямую, только с вашим
// сервером, который сам всё это делает и держит секреты у себя.

const http = require("http");
const https = require("https");
const { URL } = require("url");
const store = require("./store");

function getBackendUrl() {
  return store.get("backend.url", "");
}

/**
 * Универсальный запрос к backend'у. Никогда не бросает исключение —
 * при сетевой ошибке возвращает { ok: false, error }, как и все
 * остальные обработчики в приложении. extraHeaders позволяет отправить
 * X-Admin-Secret вместо (или вместе с) Bearer-токена сессии офицера.
 */
function request(token, method, path, body, extraHeaders) {
  return new Promise((resolve) => {
    const base = getBackendUrl();
    if (!base) return resolve({ ok: false, error: "Backend URL не настроен. Обратитесь к администратору." });

    let url;
    try {
      url = new URL(path, base);
    } catch (e) {
      return resolve({ ok: false, error: "Некорректный Backend URL: " + e.message });
    }

    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const payload = body !== undefined ? JSON.stringify(body) : null;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ""),
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(extraHeaders || {})
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve(raw ? JSON.parse(raw) : { ok: false, error: `Пустой ответ backend (код ${res.statusCode})` });
          } catch (e) {
            resolve({ ok: false, error: `Backend вернул нечитаемый ответ (код ${res.statusCode})` });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: `Не удалось связаться с backend: ${err.message}` }));
    if (payload) req.write(payload);
    req.end();
  });
}

/** То же самое, но авторизация через ваш личный SUPER_ADMIN_SECRET —
 * для управления фракциями/маппингом ролей (/api/admin/*), а не сессией
 * конкретного офицера. */
function adminRequest(secret, method, path, body) {
  if (!secret) return Promise.resolve({ ok: false, error: "Админский секрет не задан. Введите его в Настройках." });
  return request(null, method, path, body, { "X-Admin-Secret": secret });
}

module.exports = { request, adminRequest, getBackendUrl };
