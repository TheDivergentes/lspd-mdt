import React, { useEffect, useState } from "react";
import { RefreshCw, Search, Users, FolderOpen, CheckCircle2, Award, AlertOctagon, ChevronUp } from "lucide-react";
import { api } from "../../../api/electronApi";
import { useOfficer } from "../../../state/useOfficer";
import type { OfficerListEntry, ForumEntry, RankMappingRow } from "../../../api/electronApi";

const STATUS_STYLE: Record<string, { cls: string }> = {
  "10-8": { cls: "open" },
  "10-6": { cls: "priority-med" },
  "10-7": { cls: "closed" }
};

const RECORD_TYPE_BADGE: Record<string, string> = {
  "Награда": "open",
  "Выговор": "priority-high"
};

export default function OfficersTab() {
  const me = useOfficer();
  const [items, setItems] = useState<OfficerListEntry[]>([]);
  const [selected, setSelected] = useState<OfficerListEntry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [personnel, setPersonnel] = useState<ForumEntry[]>([]);
  const [ranks, setRanks] = useState<RankMappingRow[]>([]);

  const [recordType, setRecordType] = useState("Награда");
  const [reason, setReason] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordMsg, setRecordMsg] = useState("");

  const [newRankId, setNewRankId] = useState("");
  const [changingRank, setChangingRank] = useState(false);
  const [rankMsg, setRankMsg] = useState("");

  async function load() {
    setLoading(true);
    const res = await api().listOfficers();
    setLoading(false);
    if (res.ok) {
      setItems(res.items);
      setError("");
      if (!selected && res.items.length) setSelected(res.items[0]);
    } else {
      setError(res.error || "Не удалось загрузить состав");
    }
  }

  async function loadPersonnel() {
    const res = await api().listPersonnel();
    if (res.ok) setPersonnel(res.items);
  }

  async function loadRanks() {
    const res = await api().listFactionRankLadder();
    if (res.ok) setRanks(res.items);
  }

  useEffect(() => { load(); loadPersonnel(); loadRanks(); }, []);

  function selectOfficer(o: OfficerListEntry) {
    setSelected(o);
    setRecordMsg("");
    setRankMsg("");
    setReason("");
    setNewRankId("");
  }

  async function addRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingRecord(true);
    const res = await api().createPersonnelRecord({ targetNickname: selected.nickname, type: recordType, reason });
    setSavingRecord(false);
    if (res.ok) {
      setReason("");
      setRecordMsg("Записано ✓");
      loadPersonnel();
    } else {
      setRecordMsg(res.error || "Не удалось сохранить — проверьте, настроен ли канал личных дел на backend'е");
    }
  }

  async function changeRank() {
    if (!selected || !newRankId) return;
    const rank = ranks.find((r) => r.id === newRankId);
    if (!rank) return;
    if (!confirm(`Изменить звание «${selected.nickname}» на «${rank.rankName}»? Это реально поменяет Discord-роль.`)) return;
    setChangingRank(true);
    setRankMsg("");
    const res = await api().changeOfficerRank(selected.id, newRankId);
    setChangingRank(false);
    if (res.ok) {
      setRankMsg(`Звание изменено на «${rank.rankName}» ✓`);
      load();
    } else {
      setRankMsg(res.error || "Не удалось изменить звание — проверьте права бота (Manage Roles) и его позицию в иерархии ролей сервера.");
    }
  }

  const filtered = items.filter((o) =>
    `${o.nickname} ${o.rank} ${o.department || ""} ${o.badge}`.toLowerCase().includes(query.toLowerCase())
  );

  const groups: { rank: string; officers: OfficerListEntry[] }[] = [];
  for (const o of filtered) {
    const g = groups.find((x) => x.rank === o.rank);
    if (g) g.officers.push(o);
    else groups.push({ rank: o.rank, officers: [o] });
  }

  const onDuty = items.filter((o) => o.status?.code === "10-8").length;
  const selectedRecords = selected ? personnel.filter((p) => (p.fields["Офицер"] || "").trim() === selected.nickname.trim()) : [];

  return (
    <div className="two-col">
      <div className="card">
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
            <input style={{ paddingLeft: 33 }} placeholder="Поиск…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="badge open" style={{ whiteSpace: "nowrap" }}>
            <Users size={11} style={{ marginRight: 5 }} /> {onDuty}/{items.length}
          </span>
          <button className="secondary" onClick={load} title="Обновить"><RefreshCw size={13} /></button>
        </div>

        {loading && <div className="sub">Загружаю состав…</div>}
        {error && <div className="error-text">{error}</div>}
        {!loading && !error && !items.length && <div className="sub">Состав пуст.</div>}

        {groups.map((g) => (
          <div key={g.rank} style={{ marginBottom: 14 }}>
            <div className="section-title">{g.rank} ({g.officers.length})</div>
            {g.officers.map((o) => (
              <div
                key={o.id}
                className={`mdt-case-item ${selected?.id === o.id ? "active" : ""}`}
                style={{ alignItems: "center" }}
                onClick={() => selectOfficer(o)}
              >
                <img src={o.avatarUrl} width={30} height={30} style={{ borderRadius: "50%", flexShrink: 0 }} alt="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mdt-case-num">{o.nickname}</div>
                  <div className="mdt-case-type">{o.badge}{o.department ? ` · ${o.department}` : ""}</div>
                </div>
                {o.status ? (
                  <span className={`badge ${STATUS_STYLE[o.status.code]?.cls || "closed"}`} style={{ whiteSpace: "nowrap" }}>{o.status.code}</span>
                ) : (
                  <span className="badge closed">—</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="card">
        {!selected ? (
          <div className="sub">Выберите сотрудника слева.</div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <img src={selected.avatarUrl} width={48} height={48} style={{ borderRadius: "50%" }} alt="" />
              <div>
                <div className="mdt-detail-title">{selected.nickname}</div>
                <div className="mdt-detail-sub">
                  {selected.rank} · {selected.badge}{selected.department ? ` · ${selected.department}` : ""}{selected.position ? ` · ${selected.position}` : ""}
                </div>
              </div>
            </div>

            <div className="mdt-fields" style={{ marginTop: 14 }}>
              <div className="mdt-field-row"><span className="mdt-field-label">Статус</span><span>{selected.status ? `${selected.status.code} · ${selected.status.label}` : "не отмечен"}</span></div>
              <div className="mdt-field-row"><span className="mdt-field-label">Дел создано</span><span><FolderOpen size={11} style={{ marginRight: 4 }} />{selected.stats.created}</span></div>
              <div className="mdt-field-row"><span className="mdt-field-label">Дел закрыто</span><span><CheckCircle2 size={11} style={{ marginRight: 4 }} />{selected.stats.closed}</span></div>
            </div>

            <div className="mdt-subcard">
              <div className="mdt-subcard-title">Личное дело ({selectedRecords.length})</div>
              {selectedRecords.length ? selectedRecords.map((r) => (
                <div key={r.threadId} className="codex-recent" style={{ cursor: "default" }}>
                  <span className={`badge ${RECORD_TYPE_BADGE[r.fields["Тип"]] || "closed"}`}>{r.fields["Тип"]}</span>
                  <span style={{ flex: 1 }}>{r.fields["Причина"] || "—"}</span>
                  <span className="sub" style={{ fontSize: 11 }}>{r.fields["Кто выдал"]} · {r.fields["Дата"]}</span>
                </div>
              )) : <div className="sub" style={{ fontSize: 12 }}>Записей пока нет.</div>}
            </div>

            {me?.canManage ? (
              <>
                <div className="mdt-subcard">
                  <div className="mdt-subcard-title">Добавить запись</div>
                  <form onSubmit={addRecord}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <select value={recordType} onChange={(e) => setRecordType(e.target.value)} style={{ flex: 1 }}>
                        <option value="Награда">Награда</option>
                        <option value="Выговор">Выговор</option>
                      </select>
                    </div>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина" required style={{ marginBottom: 8 }} />
                    <button type="submit" disabled={savingRecord}>
                      {recordType === "Награда" ? <Award size={13} style={{ marginRight: 6 }} /> : <AlertOctagon size={13} style={{ marginRight: 6 }} />}
                      {savingRecord ? "Сохраняю…" : "Добавить"}
                    </button>
                    {recordMsg && <div className="sub" style={{ marginTop: 6 }}>{recordMsg}</div>}
                  </form>
                </div>

                <div className="mdt-subcard">
                  <div className="mdt-subcard-title">Изменить звание</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={newRankId} onChange={(e) => setNewRankId(e.target.value)} style={{ flex: 1 }}>
                      <option value="">— выберите звание —</option>
                      {ranks.map((r) => <option key={r.id} value={r.id}>{r.rankName}</option>)}
                    </select>
                    <button className="secondary" onClick={changeRank} disabled={!newRankId || changingRank}>
                      <ChevronUp size={13} style={{ marginRight: 6 }} />
                      {changingRank ? "Меняю…" : "Изменить"}
                    </button>
                  </div>
                  {rankMsg && <div className="sub" style={{ marginTop: 6 }}>{rankMsg}</div>}
                  <div className="hint-text">Меняет реальную Discord-роль звания у офицера.</div>
                </div>
              </>
            ) : (
              <div className="hint-text">Награды, выговоры и изменение звания доступны только руководству.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
