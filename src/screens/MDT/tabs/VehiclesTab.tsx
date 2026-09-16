import React, { useEffect, useState } from "react";
import { Car, Search, RefreshCw, Plus, Pencil, MessageSquare } from "lucide-react";
import { api } from "../../../api/electronApi";
import { usePanelSize } from "../../../state/usePanelSize";
import { useOfficer } from "../../../state/useOfficer";
import type { ForumEntry } from "../../../api/electronApi";

const WANTED = ["Не в розыске", "В розыске", "Служебный", "Изъят"];

const WANTED_BADGE: Record<string, string> = {
  "Не в розыске": "closed",
  "В розыске": "priority-high",
  "Служебный": "open",
  "Изъят": "priority-med"
};

export default function VehiclesTab() {
  const { isNarrow } = usePanelSize();
  const officer = useOfficer();
  const [items, setItems] = useState<ForumEntry[]>([]);
  const [selected, setSelected] = useState<ForumEntry | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ plate: "", model: "", color: "", owner: "", wantedStatus: "Не в розыске" });

  async function load(keepId?: string) {
    const res = await api().listVehicles();
    if (res.ok) {
      setItems(res.items);
      setError("");
      const target = keepId ? res.items.find((x) => x.threadId === keepId) : null;
      if (target) setSelected(target);
      else if (!selected && res.items.length) setSelected(res.items[0]);
    } else {
      setError(res.error || "Не удалось загрузить транспорт");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await api().createVehicle(form);
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ plate: "", model: "", color: "", owner: "", wantedStatus: "Не в розыске" });
      load();
    } else setError(res.error || "Не удалось сохранить");
  }

  function startEdit() {
    if (!selected) return;
    setEditFields({ ...selected.fields });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selected) return;
    const res = await api().updateVehicle(selected.threadId, editFields);
    setEditing(false);
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось сохранить");
  }

  const filtered = items.filter((v) =>
    `${v.title} ${v.fields["Модель"] || ""} ${v.fields["Владелец"] || ""}`
      .toLowerCase().includes(query.toLowerCase())
  );

  const f = selected?.fields || {};
  const wanted = f["Статус розыска"] || "—";

  return (
    <div className={`two-col ${isNarrow ? "narrow" : ""}`}>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
            <input style={{ paddingLeft: 33 }} placeholder="Номер, модель, владелец…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowForm((v) => !v)}><Plus size={14} /></button>
          <button className="secondary" onClick={() => load()}><RefreshCw size={13} /></button>
        </div>
        {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
        {filtered.map((v) => (
          <div
            key={v.threadId}
            className={`mdt-case-item ${selected?.threadId === v.threadId ? "active" : ""}`}
            onClick={() => { setSelected(v); setEditing(false); }}
          >
            <Car size={13} style={{ marginTop: 3, flexShrink: 0, color: "var(--text-dim)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mdt-case-num">{v.title}</div>
              <div className="mdt-case-type">{v.fields["Модель"] || "—"} · {v.fields["Цвет"] || "—"}</div>
              <div className="mdt-case-badge-row">
                <span className={`badge ${WANTED_BADGE[v.fields["Статус розыска"]] || "closed"}`}>
                  {v.fields["Статус розыска"] || "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && !error && <div className="sub">Записей нет.</div>}
      </div>

      <div className="card">
        {showForm ? (
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h2>Новое ТС</h2></div>
            <div className="field"><label>Гос.номер</label><input required value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="ABC123" /></div>
            <div className="field"><label>Модель</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Sultan" /></div>
            <div className="field"><label>Цвет</label><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            <div className="field"><label>Владелец</label><input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
            <div className="field">
              <label>Статус розыска</label>
              <select value={form.wantedStatus} onChange={(e) => setForm({ ...form, wantedStatus: e.target.value })}>
                {WANTED.map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
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
                <div className="mdt-detail-sub">{f["Модель"] || "—"}</div>
              </div>
              <span className={`badge ${WANTED_BADGE[wanted] || "closed"}`}>{wanted}</span>
            </div>

            {editing ? (
              <div style={{ marginTop: 16 }}>
                <div className="field"><label>Модель</label><input value={editFields["Модель"] || ""} onChange={(e) => setEditFields({ ...editFields, "Модель": e.target.value })} /></div>
                <div className="field"><label>Цвет</label><input value={editFields["Цвет"] || ""} onChange={(e) => setEditFields({ ...editFields, "Цвет": e.target.value })} /></div>
                <div className="field"><label>Владелец</label><input value={editFields["Владелец"] || ""} onChange={(e) => setEditFields({ ...editFields, "Владелец": e.target.value })} /></div>
                <div className="field">
                  <label>Статус розыска</label>
                  <select value={editFields["Статус розыска"] || "Не в розыске"} onChange={(e) => setEditFields({ ...editFields, "Статус розыска": e.target.value })}>
                    {WANTED.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveEdit}>Сохранить</button>
                  <button className="secondary" onClick={() => setEditing(false)}>Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mdt-fields">
                  <div className="mdt-field-row"><span className="mdt-field-label">Гос.номер</span><span>{f["Гос.номер"] || selected.title}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Модель</span><span>{f["Модель"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Цвет</span><span>{f["Цвет"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Владелец</span><span>{f["Владелец"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Статус розыска</span><span>{wanted}</span></div>
                </div>
                <div className="mdt-actions">
                  {officer?.canManage && <button className="secondary" onClick={startEdit}><Pencil size={13} /> Редактировать</button>}
                  <button onClick={() => api().openExternal(selected.url)}><MessageSquare size={13} /> Отправить в Discord</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="sub">Выберите ТС слева.</div>
        )}
      </div>
    </div>
  );
}
