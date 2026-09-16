import React, { useEffect, useState } from "react";
import { api } from "../../api/electronApi";
import { useAppStore } from "../../state/appStore";
import LSPDBadge from "../../components/LSPDBadge";

export default function LoginScreen() {
  const { setOfficer, setScreen } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasProfiles, setHasProfiles] = useState(false);

  useEffect(() => {
    api().listProfiles().then((p) => setHasProfiles(p.length > 0));
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError("");
    const res = await api().loginWithDiscord();
    setLoading(false);
    if (res.ok && res.officer) {
      setOfficer(res.officer);
      setScreen("app");
    } else {
      setError(res.error || "Не удалось войти через Discord");
    }
  }

  return (
    <div className="center-screen">
      <div className="card login-card">
        <div className="login-badge-wrap"><LSPDBadge size={52} /></div>
        <h1>LSPD MDT Assistant</h1>
        <p>Войдите через Discord-аккаунт вашего департамента, чтобы получить доступ к MDT.</p>
        <button onClick={handleLogin} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Жду подтверждения в браузере…" : "Войти через Discord"}
        </button>
        {error && <div className="error-text">{error}</div>}
        <div className="hint-text" style={{ marginTop: 16 }}>
          Откроется ваш обычный браузер (или приложение Discord) — авторизация
          проходит на официальной странице discord.com, не в этом окне.
        </div>
        <div className="hint-text">
          Доступ есть только у участников сервера с назначенной ролью.
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 16 }}>
          {hasProfiles && <span className="titlebar-btn" onClick={() => setScreen("profiles")}>← К профилям</span>}
          <span className="titlebar-btn" onClick={() => setScreen("setup")}>⚙ Настройки (админ)</span>
        </div>
      </div>
    </div>
  );
}
