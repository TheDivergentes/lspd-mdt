import React, { useEffect, useState } from "react";
import { User, Search, RefreshCw, Plus, Pencil, MessageSquare, Paperclip, FolderOpen, Image as ImageIcon } from "lucide-react";
import { api } from "../../../api/electronApi";
import { usePanelSize } from "../../../state/usePanelSize";
import { useOfficer } from "../../../state/useOfficer";
import type { ForumEntry, Attachment } from "../../../api/electronApi";

export default function CitizensTab() {
  const { isNarrow } = usePanelSize();
  const officer = useOfficer();
  const [items, setItems] = useState<ForumEntry[]>([]);
  const [cases, setCases] = useState<ForumEntry[]>([]);
  const [selected, setSelected] = useState<ForumEntry | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [form, setForm] = useState({
    fullName: "", dob: "", phone: "", address: "", licenses: "", priorOffenses: "", notes: ""
  });

  async function load(keepId?: string) {
    const res = await api().listCitizens();
    if (res.ok) {
      setItems(res.items);
      setError("");
      const target = keepId ? res.items.find((x) => x.threadId === keepId) : null;
      if (target) setSelected(target);
      else if (!selected && res.items.length) setSelected(res.items[0]);
    } else {
      setError(res.error || "Не удалось загрузить картотеку");
    }
  }

  useEffect(() => {
    load();
    // Дела нужны, чтобы показать связанные с гражданином записи
    api().listCases().then((r) => r.ok && setCases(r.items));
  }, []);

  useEffect(() => {
    if (!selected) return setPhotos([]);
    api().listAttachments(selected.threadId).then((r) => setPhotos(r.attachments || []));
  }, [selected?.threadId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await api().createCitizen(form);
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ fullName: "", dob: "", phone: "", address: "", licenses: "", priorOffenses: "", notes: "" });
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
    setBusy("Сохраняю…");
    const res = await api().updateCitizen(selected.threadId, editFields);
    setBusy("");
    setEditing(false);
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось сохранить");
  }

  async function addPhotos() {
    if (!selected) return;
    setBusy("Загружаю фото в Discord…");
    const res = await api().attachScreenshots(selected.threadId, `📎 Фото: ${selected.title}`);
    setBusy("");
    if (res.ok) {
      const r = await api().listAttachments(selected.threadId);
      setPhotos(r.attachments || []);
    } else if (!res.canceled) setError(res.error || "Не удалось загрузить фото");
  }

  const filtered = items.filter((c) =>
    `${c.title} ${c.fields["Телефон"] || ""} ${c.fields["Адрес"] || ""}`
      .toLowerCase().includes(query.toLowerCase())
  );

  const f = selected?.fields || {};
  // Связь по ФИО: дела, где этот гражданин указан подозреваемым
  const linkedCases = selected
    ? cases.filter((c) => (c.fields["Подозреваемый"] || "").trim().toLowerCase() === selected.title.trim().toLowerCase())
    : [];
  const hasRecord = (f["Судимости"] || "Нет").trim().toLowerCase() !== "нет";

  return (
    <div className={`two-col ${isNarrow ? "narrow" : ""}`}>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
            <input style={{ paddingLeft: 33 }} placeholder="ФИО, телефон, адрес…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowForm((v) => !v)}><Plus size={14} /></button>
          <button className="secondary" onClick={() => load()}><RefreshCw size={13} /></button>
        </div>
        {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
        {filtered.map((c) => {
          const rec = (c.fields["Судимости"] || "Нет").trim().toLowerCase() !== "нет";
          return (
            <div
              key={c.threadId}
              className={`mdt-case-item ${selected?.threadId === c.threadId ? "active" : ""}`}
              onClick={() => { setSelected(c); setEditing(false); }}
            >
              <User size={13} style={{ marginTop: 3, flexShrink: 0, color: "var(--text-dim)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mdt-case-num">{c.title}</div>
                <div className="mdt-case-type">{c.fields["Дата рождения"] || "—"} · {c.fields["Телефон"] || "—"}</div>
                <div className="mdt-case-badge-row">
                  <span className={`badge ${rec ? "priority-high" : "open"}`}>
                    {rec ? "Есть судимости" : "Не судим"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && !error && <div className="sub">Записей нет.</div>}
      </div>

      <div className="card">
        {showForm ? (
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h2>Новая персона</h2></div>
            <div className="field"><label>ФИО</label><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="field"><label>Дата рождения</label><input value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} placeholder="01.01.1990" /></div>
            <div className="field"><label>Телефон</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="field"><label>Адрес</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="field"><label>Лицензии</label><input value={form.licenses} onChange={(e) => setForm({ ...form, licenses: e.target.value })} placeholder="ВУ, оружие" /></div>
            <div className="field"><label>Судимости</label><input value={form.priorOffenses} onChange={(e) => setForm({ ...form, priorOffenses: e.target.value })} placeholder="Нет" /></div>
            <div className="field"><label>Заметки</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
                <div className="mdt-detail-sub">{f["Дата рождения"] || "—"}</div>
              </div>
              <span className={`badge ${hasRecord ? "priority-high" : "open"}`}>
                {hasRecord ? "Есть судимости" : "Не судим"}
              </span>
            </div>

            {editing ? (
              <div style={{ marginTop: 16 }}>
                {["Дата рождения", "Телефон", "Адрес", "Лицензии", "Судимости"].map((k) => (
                  <div className="field" key={k}>
                    <label>{k}</label>
                    <input value={editFields[k] || ""} onChange={(e) => setEditFields({ ...editFields, [k]: e.target.value })} />
                  </div>
                ))}
                <div className="field">
                  <label>Заметки</label>
                  <textarea rows={3} value={editFields["Заметки"] || ""} onChange={(e) => setEditFields({ ...editFields, "Заметки": e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveEdit}>Сохранить</button>
                  <button className="secondary" onClick={() => setEditing(false)}>Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mdt-fields">
                  <div className="mdt-field-row"><span className="mdt-field-label">Телефон</span><span>{f["Телефон"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Адрес</span><span>{f["Адрес"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Лицензии</span><span>{f["Лицензии"] || "—"}</span></div>
                  <div className="mdt-field-row"><span className="mdt-field-label">Судимости</span><span>{f["Судимости"] || "Нет"}</span></div>
                </div>

                <div className="mdt-subcard">
                  <div className="mdt-subcard-title">Заметки</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{f["Заметки"] || "—"}</div>
                </div>

                {/* Связанные дела */}
                <div className="mdt-subcard">
                  <div className="mdt-subcard-title">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <FolderOpen size={12} /> Связанные дела ({linkedCases.length})
                    </span>
                  </div>
                  {linkedCases.length ? (
                    linkedCases.map((c) => (
                      <div key={c.threadId} className="codex-recent" onClick={() => api().openExternal(c.url)}>
                        <FolderOpen size={12} />
                        <span style={{ flex: 1 }}>{c.title} — {c.fields["Тип дела"] || "—"}</span>
                        <span className={`badge ${c.fields["Статус"] === "Открыто" ? "open" : "closed"}`}>
                          {c.fields["Статус"] || "—"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="sub" style={{ fontSize: 12 }}>
                      Дел не найдено. Связь строится по полю «Подозреваемый» в деле — оно должно точно совпадать с ФИО.
                    </div>
                  )}
                </div>

                {/* Фото */}
                <div className="mdt-subcard">
                  <div className="mdt-subcard-title">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Paperclip size={12} /> Фото ({photos.length})
                    </span>
                  </div>
                  {photos.length ? (
                    <div className="attach-grid">
                      {photos.map((a, i) => (
                        <div key={i} className="attach-thumb" title={a.name} onClick={() => api().openExternal(a.url)}>
                          {a.contentType?.startsWith("image/") ? <img src={a.url} alt={a.name} /> : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="sub" style={{ fontSize: 12 }}>Фото пока нет.</div>
                  )}
                  <button className="secondary" style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={addPhotos}>
                    <Paperclip size={13} /> Добавить фото
                  </button>
                </div>

                {busy && <div className="hint-text">{busy}</div>}

                <div className="mdt-actions">
                  {officer?.canManage && <button className="secondary" onClick={startEdit}><Pencil size={13} /> Редактировать</button>}
                  <button onClick={() => api().openExternal(selected.url)}><MessageSquare size={13} /> Отправить в Discord</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="sub">Выберите персону слева.</div>
        )}
      </div>
    </div>
  );
}
