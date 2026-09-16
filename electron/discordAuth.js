// Вход через Discord теперь целиком на стороне backend'а — клиент только
// открывает браузер на нужный URL backend'а и ловит готовый JWT-токен на
// своём локальном порту (тот же приём, что был для прямого Discord OAuth,
// просто теперь backend в середине цепочки, а не Discord напрямую).

const { shell } = require("electron");
const http = require("http");
const crypto = require("crypto");
const store = require("./store");
const backendClient = require("./backendClient");

const CALLBACK_PORT = 51823;

let currentSession = null; // { officer, token } — в памяти процесса

function waitForLocalCallback(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${CALLBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const token = url.searchParams.get("token");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      // Старые вкладки с прошлых попыток входа — игнорируем, ждём дальше.
      if (state !== expectedState) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<html><body style="background:#0b1220;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:8px;text-align:center;">
            <h2>Устаревшая вкладка авторизации</h2>
            <p style="color:#93a1bd">Эту вкладку можно закрыть.</p>
          </body></html>`
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<html><body style="background:#0b1220;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:8px;text-align:center;">
          <h2>${error ? "Ошибка авторизации" : "Готово, можно закрыть вкладку"}</h2>
          <p style="color:#93a1bd">${error ? "Попробуйте войти ещё раз из приложения." : "Возвращайтесь в LSPD MDT Assistant."}</p>
        </body></html>`
      );
      server.close();
      if (error || !token) reject(new Error(error || "Backend не вернул токен"));
      else resolve(token);
    });
    server.on("error", (err) => {
      reject(new Error(
        err.code === "EADDRINUSE"
          ? `Порт ${CALLBACK_PORT} занят — возможно, запущена вторая копия приложения.`
          : err.message
      ));
    });
    server.listen(CALLBACK_PORT, "127.0.0.1");
    setTimeout(() => {
      server.close();
      reject(new Error("Таймаут авторизации"));
    }, 3 * 60 * 1000);
  });
}

async function loginWithDiscord() {
  const backendUrl = store.get("backend.url", "");
  if (!backendUrl) throw new Error("Backend URL не настроен. Обратитесь к администратору приложения.");

  const clientState = crypto.randomBytes(16).toString("hex");
  const authUrl = `${backendUrl.replace(/\/$/, "")}/api/auth/discord?clientState=${clientState}`;

  // Открываем в системном браузере, не во встроенном окне — так же, как
  // раньше при прямом входе в Discord: встроенный webview с полем пароля
  // неотличим от фишинга.
  const callbackPromise = waitForLocalCallback(clientState);
  await shell.openExternal(authUrl);
  const token = await callbackPromise;

  const meRes = await backendClient.request(token, "GET", "/api/auth/me");
  if (!meRes.ok) throw new Error(meRes.error || "Не удалось получить профиль офицера от backend");

  currentSession = { officer: meRes.officer, token };
  saveProfile(meRes.officer, token);

  return currentSession;
}

function getSession() {
  return currentSession;
}

function getToken() {
  return currentSession?.token || null;
}

/** Выход из активной сессии — сохранённый профиль в списке остаётся,
 * при следующем запуске его можно будет выбрать снова одним кликом. */
function logout() {
  currentSession = null;
}

/** Список сохранённых профилей (без токенов — токены наружу не отдаём) —
 * для экрана выбора профиля при запуске. */
function listSavedProfiles() {
  const profiles = store.get("session.profiles", []);
  return profiles.map((p) => p.officer);
}

function saveProfile(officer, token) {
  const profiles = store.get("session.profiles", []);
  const next = profiles.filter((p) => p.officer.id !== officer.id);
  next.unshift({ officer, token });
  store.set("session.profiles", next.slice(0, 6)); // не бесконечно копим — 6 последних достаточно
}

/** Продолжить с уже сохранённым профилем — проверяем токен живым
 * запросом к backend'у (мог истечь/быть отозван), а не просто веря кэшу. */
async function continueWithProfile(officerId) {
  const profiles = store.get("session.profiles", []);
  const entry = profiles.find((p) => p.officer.id === officerId);
  if (!entry) throw new Error("Профиль не найден");

  const meRes = await backendClient.request(entry.token, "GET", "/api/auth/me");
  if (!meRes.ok) {
    forgetProfile(officerId);
    throw new Error("Сессия этого профиля истекла — войдите через Discord ещё раз.");
  }

  currentSession = { officer: meRes.officer, token: entry.token };
  saveProfile(meRes.officer, entry.token); // обновляем кэш профиля (звание/значок могли поменяться)
  return currentSession;
}

function forgetProfile(officerId) {
  const profiles = store.get("session.profiles", []);
  store.set("session.profiles", profiles.filter((p) => p.officer.id !== officerId));
}

module.exports = {
  loginWithDiscord,
  getSession,
  getToken,
  logout,
  listSavedProfiles,
  continueWithProfile,
  forgetProfile
};
