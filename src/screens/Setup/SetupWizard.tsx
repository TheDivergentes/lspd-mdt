import React, { useEffect, useState } from "react";
import { api } from "../../api/electronApi";
import { useAppStore } from "../../state/appStore";
import LSPDBadge from "../../components/LSPDBadge";

interface Props {
  mustChangePin: boolean;
  embedded?: boolean; // true — открыт как отдельная панель, без перехода на экран логина
}

// Раньше здесь была огромная форма с Discord Client ID/Secret/Bot Token,
// ID всех каналов и редактором маппинга ролей — всё это переехало на
// backend (см. lspd-backend, управляется через /api/admin). Клиенту
// теперь нужен только адрес самого backend'а.
export default function SetupWizard({ mustChangePin, embedded }: Props) {
  const setScreen = useAppStore((s) => s.setScreen);

  const [backendUrl, setBackendUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  useEffect(() => {
    api().getBackendUrl().then((url) => {
      setBackendUrl(url || "");
      setLoaded(true);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!backendUrl.trim()) {
      setError("Укажите адрес backend'а — без него вход не заработает.");
      return;
    }
    await api().saveBackendUrl(backendUrl.trim());
    setSaved(true);
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    setPinMsg("");
    const res = await api().changeAdminPin(oldPin, newPin);
    setPinMsg(res.ok ? "PIN обновлён." : res.error || "Ошибка");
    if (res.ok) { setOldPin(""); setNewPin(""); }
  }

  if (!loaded) return <div className="sub">Загружаю текущие настройки…</div>;

  return (
    <div style={embedded ? {} : { maxWidth: 480, margin: "0 auto" }} className={embedded ? "" : "content"}>
      {!embedded && (
        <div className="panel-header" style={{ flexDirection: "column", textAlign: "center" }}>
          <LSPDBadge size={40} />
          <h2 style={{ marginTop: 10 }}>Настройка подключения к backend</h2>
        </div>
      )}

      {mustChangePin && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--orange)" }}>
          <b>Рекомендация:</b> используется PIN по умолчанию. Смените его сейчас.
          <form onSubmit={handleChangePin} style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input placeholder="Текущий PIN" type="password" value={oldPin} onChange={(e) => setOldPin(e.target.value)} />
            <input placeholder="Новый PIN" type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
            <button type="submit" className="secondary">Сменить</button>
          </form>
          {pinMsg && <div className="hint-text">{pinMsg}</div>}
        </div>
      )}

      <form className="card" onSubmit={handleSave}>
        <div className="field">
          <label>Адрес backend'а</label>
          <input
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="http://72.56.70.40"
          />
          <div className="hint-text">
            Это единственное, что нужно клиенту — все Discord-токены, каналы
            и маппинг ролей настраиваются на самом backend'е администратором
            фракции, не здесь.
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}
        <button type="submit" style={{ width: "100%" }}>Сохранить</button>
      </form>

      {saved && (
        <div className="card" style={{ marginTop: 16, borderColor: "var(--green)" }}>
          Настройки сохранены.
          {!embedded && (
            <button className="secondary" style={{ marginLeft: 10 }} onClick={() => setScreen("login")}>
              Перейти к экрану входа →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
