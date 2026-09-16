import React, { useEffect, useState } from "react";
import { Radio, BookOpen, Link2, Laptop2, Shield, ChevronRight, CheckCircle2, Coffee, Ban, Home, Settings2 } from "lucide-react";
import { api } from "../../api/electronApi";
import { useOfficer } from "../../state/useOfficer";
import FloatingPanel from "../../components/FloatingPanel";
import type { ForumEntry } from "../../api/electronApi";

const ACTIONS = [
  { key: "dashboard", label: "ГЛАВНАЯ", sub: "Обзор • Статистика", icon: Home, color: "gold" },
  { key: "radio", label: "РАДИО", sub: "Каналы • Сообщения", icon: Radio, color: "red" },
  { key: "codex", label: "ПАМЯТКИ", sub: "SOP • Статьи • Процедуры", icon: BookOpen, color: "blue" },
  { key: "binder", label: "БИНДЕР", sub: "Быстрые действия", icon: Link2, color: "purple" },
  { key: "mdt", label: "MDT", sub: "База • Поиск • Дела", icon: Laptop2, color: "green" },
  { key: "playersettings", label: "МОИ НАСТРОЙКИ", sub: "Хоткеи • Прозрачность", icon: Settings2, color: "gray" }
] as const;

// 10-коды LSPD для статуса офицера в Discord
const STATUSES = [
  { code: "10-8", label: "На смене", icon: CheckCircle2, color: "var(--green)" },
  { code: "10-6", label: "Занят", icon: Coffee, color: "var(--orange)" },
  { code: "10-7", label: "Не на смене", icon: Ban, color: "var(--red)" }
] as const;

export default function QuickMenuPanel() {
  const officer = useOfficer();
  const [currentCase, setCurrentCase] = useState<ForumEntry | null>(null);
  const [boloCount, setBoloCount] = useState<number | null>(null);
  const [status, setStatus] = useState<{ code: string; label: string } | null>(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    api()
      .listCases()
      .then((res) => {
        if (res.ok && res.items.length) {
          const open = res.items.find((c) => c.fields["Статус"] === "Открыто");
          setCurrentCase(open || res.items[0]);
        }
      });
    api()
      .listBolo()
      .then((res) => {
        if (res.ok) setBoloCount(res.items.filter((b) => b.fields["Статус"] === "Активен").length);
      });
    api().getOfficerStatus().then((s) => s && setStatus({ code: s.code, label: s.label }));
  }, []);

  async function pickStatus(code: string, label: string) {
    setStatusError("");
    const res = await api().setOfficerStatus(code, label);
    if (res.ok) setStatus({ code, label });
    else setStatusError(res.error || "Не удалось отправить статус");
  }

  return (
    <FloatingPanel
      panelName="quickmenu"
      title="POLICE ASSISTANT"
      subtitle="LSPD"
      theme="maroon"
      icon={<Shield size={16} />}
      headerRight={
        officer ? (
          <div style={{ textAlign: "right", fontSize: 11, whiteSpace: "nowrap" }}>
            <div>{officer.badge}</div>
            <div>{officer.nickname}</div>
            <div className="sub">⏱ {status?.code || "—"}</div>
          </div>
        ) : null
      }
    >
      {/* Статусы 10-кодов — транслируются в Discord */}
      <div className="status-grid">
        {STATUSES.map((s) => {
          const Icon = s.icon;
          const active = status?.code === s.code;
          return (
            <div
              key={s.code}
              className={`status-btn ${active ? "active" : ""}`}
              style={active ? { color: s.color } : undefined}
              onClick={() => pickStatus(s.code, s.label)}
            >
              <Icon size={14} />
              <span className="status-btn-code">{s.code}</span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
      {statusError && <div className="error-text" style={{ marginTop: -6, marginBottom: 10 }}>{statusError}</div>}

      <div className="quick-grid">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.key} className="quick-btn" onClick={() => api().openPanel(a.key)}>
              <div className="quick-btn-top">
                <span className={`quick-icon quick-icon-${a.color}`}><Icon size={15} /></span>
                <ChevronRight size={15} className="quick-chevron" />
              </div>
              <div className="quick-btn-label">{a.label}</div>
              <div className="quick-btn-sub">{a.sub}</div>
            </div>
          );
        })}
      </div>

      {currentCase && (
        <div className="quick-row" onClick={() => api().openPanel("mdt")}>
          <div>
            <div className="sub">ТЕКУЩЕЕ ДЕЛО: {currentCase.title}</div>
            <div>{currentCase.fields["Тип дела"] || "—"}</div>
          </div>
          <span className={`badge ${currentCase.fields["Статус"] === "Открыто" ? "open" : "closed"}`}>
            {currentCase.fields["Статус"] || "—"}
          </span>
        </div>
      )}

      {boloCount !== null && (
        <div className="quick-row" onClick={() => api().openPanel("mdt")}>
          <div>
            <div className="sub">BOLO</div>
            <div>Активных ориентировок</div>
          </div>
          <span className={`badge ${boloCount > 0 ? "priority-high" : "closed"}`}>{boloCount}</span>
        </div>
      )}

      <div className="quick-row" onClick={() => api().openPanel("discordlog")}>
        <div>
          <div className="sub">DISCORD</div>
          <div>
            Трансляция: <span style={{ color: "var(--green)" }}>ВКЛ</span>
          </div>
        </div>
        <button className="secondary" onClick={(e) => { e.stopPropagation(); api().openPanel("discordlog"); }}>
          Открыть
        </button>
      </div>

      <div className="hint-text" style={{ textAlign: "center", marginTop: 4 }}>
        F8 Радио · F9 MDT · F10 Памятки · F11 Discord · Ctrl+K — спрятать всё · Insert — режим взаимодействия · Ctrl+Alt+Q — закрыть программу
      </div>
    </FloatingPanel>
  );
}
