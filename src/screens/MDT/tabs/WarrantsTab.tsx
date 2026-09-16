import React, { useEffect, useState } from "react";
import { FileText, Search, RefreshCw, Plus, MessageSquare, CheckCircle2 } from "lucide-react";
import { api } from "../../../api/electronApi";
import type { ForumEntry } from "../../../api/electronApi";
import { useOfficer } from "../../../state/useOfficer";
import { usePanelSize } from "../../../state/usePanelSize";

const TYPES = ["Ордер на арест", "Ордер на обыск", "Ордер на изъятие"];
const STATUSES = ["Активен", "Исполнен", "Отозван", "Истёк"];

const STATUS_BADGE: Record<string, string> = {
  "Активен": "priority-high",
  "Исполнен": "open",
  "Отозван": "closed",
  "Истёк": "closed"
};

export default function WarrantsTab() {
  const { isNarrow } = usePanelSize();
  const officer = useOfficer();
  const [items, setItems] = useState<ForumEntry[]>([]);
  const [selected, setSelected] = useState<ForumEntry | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [form, setForm] = useState({ number: "", type: TYPES[0], suspect: "", reason: "" });

  async function load(keepId?: string) {
    const res = await api().listWarrants();
    if (res.ok) {
      setItems(res.items);
      setError("");
      const target = keepId ? res.items.find((x) => x.threadId === keepId) : null;
      if (target) setSelected(target);
      else if (!selected && res.items.length) setSelected(res.items[0]);
    } else {
      setError(res.error || "Не удалось загрузить ордера");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Backend сам подставит "Выдал" из вашего токена
    const res = await api().createWarrant(form);
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ number: "", type: TYPES[0], suspect: "", reason: "" });
      load();
    } else setError(res.error || "Не удалось создать ордер");
  }

  async function changeStatus(status: string) {
    if (!selected) return;
    setStatusMenu(false);
    const res = await api().updateWarrantStatus(selected.threadId, status);
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось обновить статус");
  }

  const filtered = items.filter((w) =>
    `${w.title} ${w.fields["Подозреваемый"] || ""} ${w.fields["Основание"] || ""}`
      .toLowerCase().includes(query.toLowerCase())
  );

  const f = selected?.fields || {};
  const status = f["Статус"] || "—";
  const activeCount = items.filter((w) => w.fields["Статус"] === "Активен").length;

  return (
    <div className={`two-col ${isNarrow ? "narrow" : ""}`}>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
            <input style={{ paddingLeft: 33 }} placeholder="Номер, подозреваемый…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowForm((v) => !v)}><Plus size={14} /></button>
          <button className="secondary" onClick={() => load()}><RefreshCw size={13} /></button>
        </div>
        {!!items.length && (
          <div className="sub" style={{ marginBottom: 8 }}>Активных ордеров: {activeCount} из {items.length}</div>
        )}
        {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
        {filtered.map((w) => (
          <div
            key={w.threadId}
            className={`mdt-case-item ${selected?.threadId === w.threadId ? "active" : ""}`}
            onClick={() => setSelected(w)}
          >
            <FileText size={13} style={{ marginTop: 3, flexShrink: 0, color: "var(--text-dim)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mdt-case-num">{w.title}</div>
              <div className="mdt-case-type">{w.fields["Подозреваемый"] || "—"}</div>
              <div className="mdt-case-badge-row">
                <span className={`badge ${STATUS_BADGE[w.fields["Статус"]] || "closed"}`}>
                  {w.fields["Статус"] || "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && !error && <div className="sub">Ордеров нет.</div>}
      </div>

      <div className="card">
        {showForm ? (
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h2>Новый ордер</h2></div>
            <div className="field"><label>Номер ордера</label><input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="W-2026-014" /></div>
            <div className="field">
              <label>Тип</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Подозреваемый</label><input required value={form.suspect} onChange={(e) => setForm({ ...form, suspect: e.target.value })} /></div>
            <div className="field"><label>Основание</label><textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="211 PC — вооружённое ограбление" /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? "Отправка в Discord…" : "Выдать ордер"}</button>
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        ) : selected ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="mdt-detail-title">Ордер {selected.title}</div>
                <div className="mdt-detail-sub">{f["Тип"] || "—"}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[status] || "closed"}`}>{status}</span>
            </div>

            <div className="mdt-fields">
              <div className="mdt-field-row"><span className="mdt-field-label">Подозреваемый</span><span>{f["Подозреваемый"] || "—"}</span></div>
              <div className="mdt-field-row"><span className="mdt-field-label">Тип</span><span>{f["Тип"] || "—"}</span></div>
              <div className="mdt-field-row"><span className="mdt-field-label">Выдал</span><span>{f["Выдал"] || "—"}</span></div>
              <div className="mdt-field-row"><span className="mdt-field-label">Дата выдачи</span><span>{f["Дата выдачи"] || "—"}</span></div>
            </div>

            <div className="mdt-subcard">
              <div className="mdt-subcard-title">Основание</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{f["Основание"] || "—"}</div>
            </div>

            <div className="mdt-actions">
              {officer?.canManage && (
                <div style={{ position: "relative" }}>
                  <button className="secondary" onClick={() => setStatusMenu((v) => !v)}>
                    <CheckCircle2 size={13} /> Изменить статус
                  </button>
                  {statusMenu && (
                    <div style={{
                      position: "absolute", bottom: "100%", left: 0, marginBottom: 6, zIndex: 10,
                      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, padding: 5, minWidth: 150
                    }}>
                      {STATUSES.map((s) => (
                        <div key={s} className="codex-recent" onClick={() => changeStatus(s)}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => api().openExternal(selected.url)}><MessageSquare size={13} /> Отправить в Discord</button>
            </div>
            {!officer?.canManage && <div className="hint-text">Изменение статуса ордера доступно только вашему руководству.</div>}
          </div>
        ) : (
          <div className="sub">Выберите ордер слева.</div>
        )}
      </div>
    </div>
  );
}
