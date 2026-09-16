import React, { useState } from "react";
import { api } from "../../api/electronApi";
import { useAppStore } from "../../state/appStore";
import SetupWizard from "../Setup/SetupWizard";
import AdminGate from "../../components/AdminGate";
import UpdateChecker from "../../components/UpdateChecker";
import LSPDBadge from "../../components/LSPDBadge";

export default function AccountScreen() {
  const { officer, setOfficer, setScreen } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  async function handleLogout() {
    await api().logout();
    setOfficer(null);
    const profiles = await api().listProfiles();
    setScreen(profiles.length > 0 ? "profiles" : "login");
  }

  if (showSettings) return <AdminGate><SetupWizard mustChangePin={false} /></AdminGate>;

  return (
    <div className="content" style={{ maxWidth: 480, margin: "40px auto" }}>
      <div className="card login-card" style={{ width: "100%", textAlign: "center" }}>
        <div className="login-badge-wrap"><LSPDBadge size={40} /></div>
        {officer?.avatarUrl && (
          <img src={officer.avatarUrl} width={64} height={64} style={{ borderRadius: "50%", marginBottom: 10 }} />
        )}
        <h2 style={{ margin: "6px 0" }}>{officer?.nickname}</h2>
        <div className="sub">{officer?.factionName} · {officer?.rank}{officer?.department ? ` · ${officer.department}` : ""} · {officer?.badge}</div>

        <p className="hint-text" style={{ marginTop: 16 }}>
          Вы вошли. Это окно можно свернуть/закрыть — рабочие панели
          (Police Assistant, MDT, Памятка, Биндер, Радио, Discord) открываются
          хоткеями F7–F11 прямо поверх игры.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button className="secondary" onClick={() => setShowSettings(true)}>⚙ Настройки</button>
          <button className="danger" onClick={handleLogout}>Выйти</button>
        </div>
        <button
          className="secondary"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => { if (confirm("Закрыть LSPD MDT Assistant полностью?")) api().quitApp(); }}
        >
          ⏻ Закрыть программу полностью
        </button>
      </div>
      <UpdateChecker />
    </div>
  );
}
