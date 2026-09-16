import React, { useEffect, useState } from "react";
import { RefreshCw, Search, Users, FolderOpen, CheckCircle2 } from "lucide-react";
import { api } from "../../../api/electronApi";
import type { OfficerListEntry } from "../../../api/electronApi";

const STATUS_STYLE: Record<string, { color: string; cls: string }> = {
  "10-8": { color: "var(--green)", cls: "open" },
  "10-6": { color: "var(--orange)", cls: "priority-med" },
  "10-7": { color: "var(--text-dim)", cls: "closed" }
};

export default function OfficersTab() {
  const [items, setItems] = useState<OfficerListEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    // Backend уже сам считает статистику по делам и определяет звание/
    // отдел/должность — клиенту достаточно одного запроса.
    const res = await api().listOfficers();
    setLoading(false);
    if (res.ok) {
      setItems(res.items);
      setError("");
    } else {
      setError(res.error || "Не удалось загрузить состав");
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = items.filter((o) =>
    `${o.nickname} ${o.rank} ${o.department || ""} ${o.badge}`.toLowerCase().includes(query.toLowerCase())
  );

  // Группировка по званию — порядок уже приходит отсортированным с backend'а
  const groups: { rank: string; officers: OfficerListEntry[] }[] = [];
  for (const o of filtered) {
    const g = groups.find((x) => x.rank === o.rank);
    if (g) g.officers.push(o);
    else groups.push({ rank: o.rank, officers: [o] });
  }

  const onDuty = items.filter((o) => o.status?.code === "10-8").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
          <input
            style={{ paddingLeft: 33 }}
            placeholder="Поиск по имени, званию, значку…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="badge open" style={{ whiteSpace: "nowrap" }}>
          <Users size={11} style={{ marginRight: 5 }} /> {onDuty} / {items.length} на смене
        </span>
        <button className="secondary" onClick={load} title="Обновить">
          <RefreshCw size={13} />
        </button>
      </div>

      {loading && <div className="sub">Загружаю состав с backend'а…</div>}

      {error && (
        <div className="card" style={{ borderColor: "var(--orange)" }}>
          <div className="error-text" style={{ marginTop: 0 }}>{error}</div>
          <div className="hint-text">
            Список состава строится из участников сервера с ролями-званиями.
            Проверьте маппинг ролей на backend'е (/api/admin) и что у бота
            включён Server Members Intent в Discord Developer Portal.
          </div>
        </div>
      )}

      {!loading && !error && !items.length && (
        <div className="sub">Не найдено ни одного участника с ролями-званиями.</div>
      )}

      {groups.map((g) => (
        <div key={g.rank} style={{ marginBottom: 18 }}>
          <div className="section-title">{g.rank} ({g.officers.length})</div>
          {g.officers.map((o) => (
            <div key={o.id} className="mdt-case-item" style={{ alignItems: "center", cursor: "default" }}>
              <img src={o.avatarUrl} width={32} height={32} style={{ borderRadius: "50%", flexShrink: 0 }} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mdt-case-num">{o.nickname}</div>
                <div className="mdt-case-type">
                  {o.badge}
                  {o.department ? ` · ${o.department}` : ""}
                  {o.position ? ` · ${o.position}` : ""}
                </div>
                {(o.stats.created > 0 || o.stats.closed > 0) && (
                  <div className="sub" style={{ fontSize: 11, marginTop: 2, display: "flex", gap: 10 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <FolderOpen size={10} /> {o.stats.created} создано
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <CheckCircle2 size={10} /> {o.stats.closed} закрыто
                    </span>
                  </div>
                )}
              </div>
              {o.status ? (
                <span className={`badge ${STATUS_STYLE[o.status.code]?.cls || "closed"}`} style={{ whiteSpace: "nowrap" }}>
                  {o.status.code} · {o.status.label}
                </span>
              ) : (
                <span className="badge closed">Статус не отмечен</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
