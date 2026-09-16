import React, { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { api } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";
import HotkeysEditor from "../Setup/HotkeysEditor";
import OpacitySettings from "../Setup/OpacitySettings";

const PANEL_LABELS: Record<string, string> = {
  quickmenu: "Police Assistant",
  mdt: "MDT",
  codex: "Памятка",
  binder: "Биндер",
  radio: "Радио",
  discordlog: "Discord",
  dashboard: "Главная",
  playersettings: "Мои настройки",
  settings: "Настройки (админ)",
  factionadmin: "Фракции и роли"
};

function SavedLayoutBlock() {
  const [saved, setSaved] = useState<string[] | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setSaved(await api().getSavedLayout());
  }

  useEffect(() => { load(); }, []);

  async function saveNow() {
    const res = await api().saveCurrentLayout();
    setSaved(res.panels);
    setMsg(res.panels.length ? "Сохранено ✓" : "Сейчас не открыто ни одной панели — нечего сохранять.");
    setTimeout(() => setMsg(""), 2500);
  }

  async function openIt() {
    await api().openSavedLayout();
  }

  async function clearIt() {
    await api().clearSavedLayout();
    setSaved(null);
  }

  return (
    <div>
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
        Откройте только те окна, что нужны для работы (например Police Assistant
        + MDT), и нажмите «Сохранить текущий набор» — дальше Ctrl+K и вход в
        приложение будут показывать именно этот набор, а не всё, что вы
        когда-либо открывали за сессию.
      </div>

      {saved && saved.length ? (
        <div className="sub" style={{ marginBottom: 10 }}>
          Сохранён набор: {saved.map((k) => PANEL_LABELS[k] || k).join(", ")}
        </div>
      ) : (
        <div className="sub" style={{ marginBottom: 10 }}>Набор пока не сохранён — Ctrl+K показывает всё открытое.</div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={saveNow}>Сохранить текущий набор</button>
        {saved && saved.length > 0 && (
          <>
            <button className="secondary" onClick={openIt}>Открыть мой набор</button>
            <button className="secondary" onClick={clearIt}>Забыть набор</button>
          </>
        )}
      </div>
      {msg && <div className="sub" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

// Личные настройки офицера — доступны любому вошедшему, без PIN и без
// роли-админа. Токены/каналы/права ролей сюда не входят — это в
// «Настройки» (панель settings), там уже стоит гейт по роли/PIN.
export default function PlayerSettingsPanel() {
  return (
    <FloatingPanel panelName="playersettings" title="МОИ НАСТРОЙКИ" subtitle="Личные — хоткеи, прозрачность, раскладка" icon={<Settings2 size={16} />}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h2>Мой набор окон</h2>
        </div>
        <SavedLayoutBlock />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h2>Окна панелей</h2>
        </div>
        <div className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
          Панели можно растягивать за края и перетаскивать — размер и позиция
          запоминаются. Кнопка ниже вернёт всё к исходной раскладке (позиции
          и размеры, не связано с набором окон выше).
        </div>
        <button className="secondary" onClick={() => api().resetLayout()}>
          Сбросить раскладку окон
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <HotkeysEditor />
      </div>

      <div className="card">
        <OpacitySettings />
      </div>
    </FloatingPanel>
  );
}
