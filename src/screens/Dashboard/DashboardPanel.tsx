import React, { useEffect, useState } from "react";
import {
  Home, KeyRound, BookOpen, FolderOpen, Users, Car, FileText, AlertTriangle,
  Settings, Settings2, Radio, MessageSquare, FolderKanban, Power, LayoutGrid, Shield, UserCircle
} from "lucide-react";
import { api } from "../../api/electronApi";
import { useOfficer } from "../../state/useOfficer";
import { usePanelSize } from "../../state/usePanelSize";
import FloatingPanel from "../../components/FloatingPanel";
import type { ForumEntry } from "../../api/electronApi";

const NAV = [
  { key: "dashboard", label: "Главная", icon: Home, current: true },
  { key: "binder", label: "Биндер", icon: KeyRound },
  { key: "codex", label: "Памятка", icon: BookOpen },
  { key: "mdt", label: "Дела / MDT", icon: FolderOpen },
  { key: "radio", label: "Радио", icon: Radio },
  { key: "discordlog", label: "Discord", icon: MessageSquare },
  { key: "playersettings", label: "Мои настройки", icon: Settings2 },
  { key: "settings", label: "Настройки (админ)", icon: Settings },
  { key: "factionadmin", label: "Фракции и роли", icon: Shield },
  { key: "account", label: "Аккаунт / Обновления", icon: UserCircle, special: true }
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return {
    date: now.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
    time: now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  };
}

export default function DashboardPanel() {
  const officer = useOfficer();
  const { isNarrow } = usePanelSize();
  const { date, time } = useClock();

  const [cases, setCases] = useState<ForumEntry[]>([]);
  const [bolo, setBolo] = useState<ForumEntry[]>([]);
  const [citizensCount, setCitizensCount] = useState<number | null>(null);
  const [vehiclesCount, setVehiclesCount] = useState<number | null>(null);
  const [warrantsCount, setWarrantsCount] = useState<number | null>(null);

  useEffect(() => {
    api().listCases().then((r) => r.ok && setCases(r.items));
    api().listBolo().then((r) => r.ok && setBolo(r.items));
    api().listCitizens().then((r) => setCitizensCount(r.ok ? r.items.length : null));
    api().listVehicles().then((r) => setVehiclesCount(r.ok ? r.items.length : null));
    api().listWarrants().then((r) => setWarrantsCount(r.ok ? r.items.length : null));
  }, []);

  const openCases = cases.filter((c) => c.fields["Статус"] === "Открыто");
  const activeCase = openCases[0] || cases[0] || null;
  const myStats = {
    created: officer ? cases.filter((c) => (c.fields["Офицер"] || "").trim() === officer.nickname.trim()).length : 0,
    closed: officer
      ? cases.filter((c) => c.fields["Статус"] === "Закрыто" && (c.fields["Изменил статус"] || "").trim() === officer.nickname.trim()).length
      : 0
  };
  const activeBolo = bolo.filter((b) => b.fields["Статус"] === "Активен").length;

  return (
    <FloatingPanel
      panelName="dashboard"
      title="LSPD ASSISTANT"
      subtitle="Los Santos Police Department"
      theme="maroon"
      icon={<Home size={16} />}
      headerRight={
        officer ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, whiteSpace: "nowrap" }}>
            <span className="sub">{date} · {time}</span>
            <span>{officer.nickname}</span>
            <span className="badge open">{officer.badge}</span>
            <span className="panel-close" title="Настройки" onClick={() => api().openPanel("settings")}>
              <Settings size={14} />
            </span>
            <span
              className="panel-close"
              title="Закрыть программу полностью"
              onClick={() => { if (confirm("Закрыть LSPD MDT Assistant полностью?")) api().quitApp(); }}
            >
              <Power size={14} />
            </span>
          </div>
        ) : null
      }
    >
      <div className={`dashboard-layout ${isNarrow ? "narrow" : ""}`}>
        {/* ---------- Левая навигация ---------- */}
        <div className="codex-col">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.key}
                className={`codex-nav-item ${n.current ? "active" : ""}`}
                onClick={() => {
                  if (n.current) return;
                  if ((n as any).special) api().showAuthWindow();
                  else api().openPanel(n.key);
                }}
              >
                <Icon size={14} />
                <span style={{ flex: 1 }}>{n.label}</span>
              </div>
            );
          })}
        </div>

        {/* ---------- Центр ---------- */}
        <div style={{ overflow: "auto" }}>
          <div className="grid-quick" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="value">{openCases.length}</div>
              <div className="label">Активные дела</div>
            </div>
            <div className="stat-card">
              <div className="value">{activeBolo}</div>
              <div className="label">Активных BOLO</div>
            </div>
            <div className="stat-card">
              <div className="value">{citizensCount ?? "—"}</div>
              <div className="label">Граждан в базе</div>
            </div>
            <div className="stat-card">
              <div className="value">{vehiclesCount ?? "—"}</div>
              <div className="label">Транспорта в базе</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="panel-header"><h2>Моя статистика</h2></div>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <div className="mdt-detail-title" style={{ fontSize: 20 }}>{myStats.created}</div>
                <div className="sub">Дел создано</div>
              </div>
              <div>
                <div className="mdt-detail-title" style={{ fontSize: 20 }}>{myStats.closed}</div>
                <div className="sub">Дел закрыто</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="panel-header"><h2>Активное дело</h2></div>
            {activeCase ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="mdt-detail-title" style={{ fontSize: 15 }}>Дело #{activeCase.title}</div>
                    <div className="sub">{activeCase.fields["Тип дела"] || "—"}</div>
                  </div>
                  <span className={`badge ${activeCase.fields["Статус"] === "Открыто" ? "open" : "closed"}`}>
                    {activeCase.fields["Статус"] || "—"}
                  </span>
                </div>
                <div className="mdt-fields" style={{ marginTop: 12, marginBottom: 4 }}>
                  <div className="mdt-field-row"><span className="mdt-field-label">Офицер</span><span>{activeCase.fields["Офицер"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Локация</span><span>{activeCase.fields["Локация"] || "—"}</span></div>
                </div>
                <button className="secondary" onClick={() => api().openPanel("mdt")}>Открыть в MDT →</button>
              </div>
            ) : (
              <div className="sub">Открытых дел нет.</div>
            )}
          </div>
        </div>

        {/* ---------- Правая колонка ---------- */}
        <div style={{ overflow: "auto" }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="panel-header"><h2>Discord</h2></div>
            <button style={{ width: "100%" }} onClick={() => api().openPanel("discordlog")}>Открыть панель Discord</button>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="panel-header"><h2>Быстрые действия</h2></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="secondary" onClick={() => api().openPanel("mdt")}><FolderKanban size={13} style={{ marginRight: 6 }} />Открыть MDT</button>
              <button className="secondary" onClick={() => api().openPanel("codex")}><BookOpen size={13} style={{ marginRight: 6 }} />Памятка</button>
              <button className="secondary" onClick={() => api().openPanel("radio")}><Radio size={13} style={{ marginRight: 6 }} />Радио</button>
              <button className="secondary" onClick={() => api().applyRoleDefaults()}>
                <LayoutGrid size={13} style={{ marginRight: 6 }} />Раскладка по роли
              </button>
            </div>
          </div>

          <div className="card">
            <div className="panel-header"><h2>Сводка по базе</h2></div>
            {[
              { icon: Users, label: "Граждане", value: citizensCount },
              { icon: Car, label: "Транспорт", value: vehiclesCount },
              { icon: FolderOpen, label: "Дела", value: cases.length },
              { icon: FileText, label: "Ордера", value: warrantsCount },
              { icon: AlertTriangle, label: "BOLO", value: bolo.length }
            ].map((row) => (
              <div className="meta-row" key={row.label}>
                <span className="meta-label" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <row.icon size={13} /> {row.label}
                </span>
                <span>{row.value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}
