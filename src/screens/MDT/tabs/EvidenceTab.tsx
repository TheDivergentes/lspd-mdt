import React, { useEffect, useState } from "react";
import { Archive, Search, RefreshCw, Plus, Pencil, MessageSquare } from "lucide-react";
import { api } from "../../../api/electronApi";
import type { ForumEntry } from "../../../api/electronApi";
import { useOfficer } from "../../../state/useOfficer";
import { usePanelSize } from "../../../state/usePanelSize";

const TYPES = ["Физическая", "Цифровая", "Документ", "Оружие", "Наркотики"];
const STATUSES = ["На хранении", "Передано в суд", "Возвращено владельцу", "Уничтожено"];

const STATUS_BADGE: Record<string, string> = {
  "На хранении": "open",
  "Передано в суд": "priority-med",
  "Возвращено владельцу": "closed",
  "Уничтожено": "closed"
};

export default function EvidenceTab() {
  const officer = useOfficer();
  const { isNarrow } = usePanelSize();
  const [items, setItems] = useState<ForumEntry[]>([]);
  const [selected, setSelected] = useState<ForumEntry | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: "", type: TYPES[0], caseNumber: "", location: "На хранении", description: "" });

  async function load(keepId?: string) {
    const res = await api().listEvidence();
    if (res.ok) {
      setItems(res.items);
      setError("");
      const target = keepId ? res.items.find((x) => x.threadId === keepId) : null;
      if (target) setSelected(target);
      else if (!selected && res.items.length) setSelected(res.items[0]);
    } else {
      setError(res.error || "Не удалось загрузить улики");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Backend сам подставит "Кто изъял" из вашего токена
    const res = await api().createEvidence(form);
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", type: TYPES[0], caseNumber: "", location: "На хранении", description: "" });
      load();
    } else setError(res.error || "Не удалось сохранить улику");
  }

  function startEdit() {
    if (!selected) return;
    setEditFields({ ...selected.fields });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selected) return;
    const res = await api().updateEvidence(selected.threadId, editFields);
    setEditing(false);
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось сохранить");
  }

  const filtered = items.filter((ev) =>
    `${ev.title} ${ev.fields["Дело"] || ""} ${ev.fields["Тип"] || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  const f = selected?.fields || {};
  const status = f["Статус"] || "На хранении";

  return (
    <div className={`two-col ${isNarrow ? "narrow" : ""}`}>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
            <input style={{ paddingLeft: 33 }} placeholder="Название, дело, тип…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowForm((v) => !v)}><Plus size={14} /></button>
          <button className="secondary" onClick={() => load()}><RefreshCw size={13} /></button>
        </div>
        {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
        {filtered.map((ev) => (
          <div
            key={ev.threadId}
            className={`mdt-case-item ${selected?.threadId === ev.threadId ? "active" : ""}`}
            onClick={() => { setSelected(ev); setEditing(false); }}
          >
            <Archive size={13} style={{ marginTop: 3, flexShrink: 0, color: "var(--text-dim)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mdt-case-num">{ev.title}</div>
              <div className="mdt-case-type">{ev.fields["Тип"] || "—"} · Дело {ev.fields["Дело"] || "—"}</div>
              <div className="mdt-case-badge-row">
                <span className={`badge ${STATUS_BADGE[ev.fields["Статус"]] || "closed"}`}>{ev.fields["Статус"] || "—"}</span>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && !error && <div className="sub">Улик нет.</div>}
      </div>

      <div className="card">
        {showForm ? (
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h2>Новая улика</h2></div>
            <div className="field"><label>Название</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Пистолет, найденный на месте" /></div>
            <div className="field">
              <label>Тип</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Номер дела</label>
              <input required value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} placeholder="Точно как в номере дела" />
              <div className="hint-text">Должно точно совпадать с номером дела, чтобы связь отобразилась в карточке дела.</div>
            </div>
            <div className="field"><label>Местонахождение</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="field"><label>Описание</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? "Отправка в Discord…" : "Сохранить"}</button>
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        ) : selected ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="mdt-detail-title">{selected.title}</div>
                <div className="mdt-detail-sub">{f["Тип"] || "—"} · Дело {f["Дело"] || "—"}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[status] || "closed"}`}>{status}</span>
            </div>

            {editing ? (
              <div style={{ marginTop: 16 }}>
                <div className="field"><label>Местонахождение</label><input value={editFields["Местонахождение"] || ""} onChange={(e) => setEditFields({ ...editFields, "Местонахождение": e.target.value })} /></div>
                <div className="field">
                  <label>Статус</label>
                  <select value={editFields["Статус"] || "На хранении"} onChange={(e) => setEditFields({ ...editFields, "Статус": e.target.value })}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field"><label>Описание</label><textarea rows={3} value={editFields["Описание"] || ""} onChange={(e) => setEditFields({ ...editFields, "Описание": e.target.value })} /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveEdit}>Сохранить</button>
                  <button className="secondary" onClick={() => setEditing(false)}>Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mdt-fields">
                  <div className="mdt-field-row"><span className="mdt-field-label">Кто изъял</span><span>{f["Кто изъял"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Дата изъятия</span><span>{f["Дата изъятия"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Местонахождение</span><span>{f["Местонахождение"] || "—"}</span></div>
                </div>
                <div className="mdt-subcard">
                  <div className="mdt-subcard-title">Описание</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{f["Описание"] || "—"}</div>
                </div>
                <div className="mdt-actions">
                  {officer?.canManage && <button className="secondary" onClick={startEdit}><Pencil size={13} /> Редактировать</button>}
                  <button onClick={() => api().openExternal(selected.url)}><MessageSquare size={13} /> Отправить в Discord</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="sub">Выберите улику слева.</div>
        )}
      </div>
    </div>
  );
}
