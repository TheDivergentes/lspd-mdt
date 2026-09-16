import React, { useEffect, useState } from "react";
import { CarFront, Search, RefreshCw, Plus, Pencil, MessageSquare } from "lucide-react";
import { api } from "../../../api/electronApi";
import type { ForumEntry } from "../../../api/electronApi";
import { useOfficer } from "../../../state/useOfficer";
import { usePanelSize } from "../../../state/usePanelSize";

const STATUSES = ["Открыто", "На рассмотрении", "Закрыто"];
const STATUS_BADGE: Record<string, string> = {
  "Открыто": "priority-med",
  "На рассмотрении": "priority-med",
  "Закрыто": "closed"
};

export default function AccidentsTab() {
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
  const [form, setForm] = useState({
    title: "", participants: "", vehicles: "", damage: "", injuries: "Нет", atFault: "", insurance: "", description: ""
  });

  async function load(keepId?: string) {
    const res = await api().listAccidents();
    if (res.ok) {
      setItems(res.items);
      setError("");
      const target = keepId ? res.items.find((x) => x.threadId === keepId) : null;
      if (target) setSelected(target);
      else if (!selected && res.items.length) setSelected(res.items[0]);
    } else {
      setError(res.error || "Не удалось загрузить отчёты о ДТП");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await api().createAccident(form);
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", participants: "", vehicles: "", damage: "", injuries: "Нет", atFault: "", insurance: "", description: "" });
      load();
    } else setError(res.error || "Не удалось сохранить отчёт");
  }

  function startEdit() {
    if (!selected) return;
    setEditFields({ ...selected.fields });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selected) return;
    const res = await api().updateAccident(selected.threadId, editFields);
    setEditing(false);
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось сохранить");
  }

  async function changeStatus(status: string) {
    if (!selected) return;
    const res = await api().updateAccidentStatus(selected.threadId, status);
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось обновить статус");
  }

  const filtered = items.filter((a) =>
    `${a.title} ${a.fields["Участники"] || ""} ${a.fields["Виновник"] || ""}`.toLowerCase().includes(query.toLowerCase())
  );
  const f = selected?.fields || {};
  const status = f["Статус"] || "Открыто";

  return (
    <div className={`two-col ${isNarrow ? "narrow" : ""}`}>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
            <input style={{ paddingLeft: 33 }} placeholder="Название, участники, виновник…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowForm((v) => !v)}><Plus size={14} /></button>
          <button className="secondary" onClick={() => load()}><RefreshCw size={13} /></button>
        </div>
        {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
        {filtered.map((a) => (
          <div key={a.threadId} className={`mdt-case-item ${selected?.threadId === a.threadId ? "active" : ""}`} onClick={() => { setSelected(a); setEditing(false); }}>
            <CarFront size={13} style={{ marginTop: 3, flexShrink: 0, color: "var(--text-dim)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mdt-case-num">{a.title}</div>
              <div className="mdt-case-type">{a.fields["Виновник"] || "Виновник не указан"}</div>
              <div className="mdt-case-badge-row">
                <span className={`badge ${STATUS_BADGE[a.fields["Статус"]] || "closed"}`}>{a.fields["Статус"] || "—"}</span>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && !error && <div className="sub">Отчётов о ДТП нет.</div>}
      </div>

      <div className="card">
        {showForm ? (
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h2>Новый отчёт о ДТП</h2></div>
            <div className="field"><label>Название/номер</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Столкновение на шоссе 1" /></div>
            <div className="field"><label>Участники</label><input value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} /></div>
            <div className="field"><label>Транспортные средства</label><input value={form.vehicles} onChange={(e) => setForm({ ...form, vehicles: e.target.value })} /></div>
            <div className="field"><label>Повреждения</label><input value={form.damage} onChange={(e) => setForm({ ...form, damage: e.target.value })} /></div>
            <div className="field"><label>Пострадавшие</label><input value={form.injuries} onChange={(e) => setForm({ ...form, injuries: e.target.value })} /></div>
            <div className="field"><label>Виновник</label><input value={form.atFault} onChange={(e) => setForm({ ...form, atFault: e.target.value })} /></div>
            <div className="field"><label>Страховка</label><input value={form.insurance} onChange={(e) => setForm({ ...form, insurance: e.target.value })} /></div>
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
                <div className="mdt-detail-sub">{f["Дата"] || "—"}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[status] || "closed"}`}>{status}</span>
            </div>

            {editing ? (
              <div style={{ marginTop: 16 }}>
                <div className="field"><label>Повреждения</label><input value={editFields["Повреждения"] || ""} onChange={(e) => setEditFields({ ...editFields, "Повреждения": e.target.value })} /></div>
                <div className="field"><label>Пострадавшие</label><input value={editFields["Пострадавшие"] || ""} onChange={(e) => setEditFields({ ...editFields, "Пострадавшие": e.target.value })} /></div>
                <div className="field"><label>Виновник</label><input value={editFields["Виновник"] || ""} onChange={(e) => setEditFields({ ...editFields, "Виновник": e.target.value })} /></div>
                <div className="field"><label>Страховка</label><input value={editFields["Страховка"] || ""} onChange={(e) => setEditFields({ ...editFields, "Страховка": e.target.value })} /></div>
                <div className="field"><label>Описание</label><textarea rows={3} value={editFields["Описание"] || ""} onChange={(e) => setEditFields({ ...editFields, "Описание": e.target.value })} /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveEdit}>Сохранить</button>
                  <button className="secondary" onClick={() => setEditing(false)}>Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mdt-fields">
                  <div className="mdt-field-row"><span className="mdt-field-label">Участники</span><span>{f["Участники"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Транспорт</span><span>{f["Транспортные средства"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Пострадавшие</span><span>{f["Пострадавшие"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Виновник</span><span>{f["Виновник"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Страховка</span><span>{f["Страховка"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Оформил</span><span>{f["Офицер"] || "—"}</span></div>
                </div>
                <div className="mdt-subcard">
                  <div className="mdt-subcard-title">Описание / повреждения</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{f["Повреждения"] || "—"}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{f["Описание"] || "—"}</div>
                </div>
                <div className="mdt-actions">
                  {officer?.canManage && (
                    <>
                      <button className="secondary" onClick={startEdit}><Pencil size={13} /> Редактировать</button>
                      <div style={{ position: "relative" }}>
                        <select value={status} onChange={(e) => changeStatus(e.target.value)} className="secondary" style={{ padding: "9px 12px" }}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  <button onClick={() => api().openExternal(selected.url)}><MessageSquare size={13} /> Отправить в Discord</button>
                </div>
                {!officer?.canManage && <div className="hint-text">Изменение статуса и редактирование доступны только руководству.</div>}
              </>
            )}
          </div>
        ) : (
          <div className="sub">Выберите отчёт слева.</div>
        )}
      </div>
    </div>
  );
}
