import React from "react";
import { Settings2 } from "lucide-react";
import { api } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";
import HotkeysEditor from "../Setup/HotkeysEditor";
import OpacitySettings from "../Setup/OpacitySettings";

// Личные настройки офицера — доступны любому вошедшему, без PIN и без
// роли-админа. Токены/каналы/права ролей сюда не входят — это в
// «Настройки» (панель settings), там уже стоит гейт по роли/PIN.
export default function PlayerSettingsPanel() {
  return (
    <FloatingPanel panelName="playersettings" title="МОИ НАСТРОЙКИ" subtitle="Личные — хоткеи, прозрачность, раскладка" icon={<Settings2 size={16} />}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h2>Окна панелей</h2>
        </div>
        <div className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
          Панели можно растягивать за края и перетаскивать — размер и позиция
          запоминаются. Кнопка ниже вернёт всё к исходной раскладке.
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
