import React, { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { api } from "../../api/electronApi";
import { useAppStore } from "../../state/appStore";
import LSPDBadge from "../../components/LSPDBadge";
import type { Officer } from "../../api/electronApi";

export default function ProfilePicker() {
  const { setOfficer, setScreen } = useAppStore();
  const [profiles, setProfiles] = useState<Officer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const list = await api().listProfiles();
    setProfiles(list);
    if (!list.length) setScreen("login");
  }

  useEffect(() => {
    load();
  }, []);

  async function continueAs(officer: Officer) {
    setBusyId(officer.id);
    setError("");
    const res = await api().continueWithProfile(officer.id);
    setBusyId(null);
    if (res.ok && res.officer) {
      setOfficer(res.officer);
      setScreen("app");
    } else {
      setError(res.error || "Не удалось войти этим профилем");
      load(); // профиль с истёкшей сессией уже удалён на стороне main-процесса
    }
  }

  async function forget(e: React.MouseEvent, officerId: string) {
    e.stopPropagation();
    await api().forgetProfile(officerId);
    load();
  }

  return (
    <div className="center-screen">
      <div className="card login-card" style={{ width: 420 }}>
        <div className="login-badge-wrap"><LSPDBadge size={52} /></div>
        <h1>Выберите профиль</h1>
        <p>Или войдите другим аккаунтом Discord — например, для другой фракции.</p>

        {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              className="profile-row"
              onClick={() => (busyId ? null : continueAs(p))}
            >
              <img src={p.avatarUrl} width={40} height={40} style={{ borderRadius: "50%" }} alt="" />
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nickname}</div>
                <div className="sub" style={{ fontSize: 12 }}>
                  {p.factionName} · {p.rank}{p.department ? ` · ${p.department}` : ""} · {p.badge}
                </div>
              </div>
              {busyId === p.id ? (
                <span className="sub" style={{ fontSize: 11 }}>Вхожу…</span>
              ) : (
                <span className="profile-forget" onClick={(e) => forget(e, p.id)} title="Забыть профиль">✕</span>
              )}
            </div>
          ))}
        </div>

        <button className="secondary" style={{ width: "100%" }} onClick={() => setScreen("login")}>
          <UserPlus size={14} style={{ marginRight: 6 }} />
          Войти другим аккаунтом
        </button>
      </div>
    </div>
  );
}
