import React, { useEffect, useState } from "react";
import { api } from "../../../api/electronApi";
import type { ForumEntry } from "../../../api/electronApi";
import { useOfficer } from "../../../state/useOfficer";

export default function BoloTab() {
  const officer = useOfficer();
  const [items, setItems] = useState<ForumEntry[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", appearance: "", vehicle: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api().listBolo();
    if (res.ok) { setItems(res.items); setError(""); } else setError(res.error || "Ошибка загрузки");
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Backend сам подставит "Издал" из вашего токена
    const res = await api().createBolo(form);
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", description: "", appearance: "", vehicle: "" });
      load();
    } else setError(res.error || "Не удалось создать BOLO");
  }

  async function closeBolo(threadId: string) {
    const res = await api().updateBoloStatus(threadId, "Закрыт");
    if (res.ok) load();
    else setError(res.error || "Не удалось закрыть BOLO");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Отмена" : "+ Новый BOLO"}</button>
      </div>
      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}

      {showForm && (
        <form className="card" onSubmit={handleCreate} style={{ marginBottom: 14 }}>
          <div className="field"><label>Заголовок</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Описание</label><textarea rows={3} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>Приметы</label><input value={form.appearance} onChange={(e) => setForm({ ...form, appearance: e.target.value })} /></div>
          <div className="field"><label>Транспорт</label><input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
          <button type="submit" disabled={saving}>{saving ? "Публикация…" : "Опубликовать BOLO"}</button>
        </form>
      )}

      {items.map((b) => {
        const closed = (b.fields["Статус"] || "Активен") !== "Активен";
        return (
          <div key={b.threadId} className="card" style={{ marginBottom: 10, borderColor: closed ? "var(--border)" : "var(--orange)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <b>{b.title}</b>
              <span className={`badge ${closed ? "closed" : "priority-high"}`}>{b.fields["Статус"] || "Активен"}</span>
            </div>
            <div style={{ marginTop: 6 }}>{b.fields["Описание"]}</div>
            <div className="sub" style={{ marginTop: 4 }}>
              Приметы: {b.fields["Приметы"] || "—"} · Транспорт: {b.fields["Транспорт"] || "—"} · Издал: {b.fields["Издал"] || "—"}
            </div>
            {officer?.canManage && !closed && (
              <button className="secondary" style={{ marginTop: 9 }} onClick={() => closeBolo(b.threadId)}>Закрыть BOLO</button>
            )}
          </div>
        );
      })}
      {!items.length && !error && <div className="sub">Активных BOLO нет.</div>}
    </div>
  );
}
