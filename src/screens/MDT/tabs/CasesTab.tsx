import React, { useEffect, useState } from "react";
import { Clock, Pencil, RefreshCw, MessageSquare, Paperclip, Image as ImageIcon, Archive } from "lucide-react";
import { api } from "../../../api/electronApi";
import type { ForumEntry, Attachment } from "../../../api/electronApi";
import { useOfficer } from "../../../state/useOfficer";
import { usePanelSize } from "../../../state/usePanelSize";

const PRIORITY_COLOR: Record<string, string> = {
  "Низкий": "var(--green)",
  "Средний": "var(--orange)",
  "Высокий": "var(--red)"
};

const STATUSES = ["Открыто", "Задержан", "Передано", "Закрыто"];

export default function CasesTab() {
  const { isNarrow } = usePanelSize();
  const officer = useOfficer();
  const [items, setItems] = useState<ForumEntry[]>([]);
  const [selected, setSelected] = useState<ForumEntry | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "", priority: "Средний", location: "", statute: "", description: "", suspect: "" });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [statusMenu, setStatusMenu] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [evidence, setEvidence] = useState<ForumEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  async function load(keepId?: string) {
    const res = await api().listCases();
    if (res.ok) {
      setItems(res.items);
      setError("");
      const target = keepId ? res.items.find((x) => x.threadId === keepId) : null;
      if (target) setSelected(target);
      else if (!selected && res.items.length) setSelected(res.items[0]);
    } else {
      setError(res.error || "Не удалось загрузить дела");
    }
  }

  useEffect(() => {
    load();
    api().listEvidence().then((r) => r.ok && setEvidence(r.items));
  }, []);

  // Подгружаем вложения выбранного дела
  useEffect(() => {
    if (!selected) return setAttachments([]);
    api().listAttachments(selected.threadId).then((r) => setAttachments(r.attachments || []));
  }, [selected?.threadId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Backend сам подставит офицера из вашего токена — передавать его тут не нужно
    const res = await api().createCase(form);
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", type: "", priority: "Средний", location: "", statute: "", description: "", suspect: "" });
      load();
    } else {
      setError(res.error || "Не удалось создать дело");
    }
  }

  async function changeStatus(status: string) {
    if (!selected) return;
    setStatusMenu(false);
    setBusy("Обновляю статус…");
    const res = await api().updateCaseStatus(selected.threadId, status);
    setBusy("");
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось обновить статус");
  }

  async function addScreenshots() {
    if (!selected) return;
    setBusy("Загружаю скриншоты в Discord…");
    const res = await api().attachScreenshots(selected.threadId, `📎 Материалы по делу ${selected.title}`);
    setBusy("");
    if (res.ok) {
      const r = await api().listAttachments(selected.threadId);
      setAttachments(r.attachments || []);
    } else if (!res.canceled) {
      setError(res.error || "Не удалось загрузить файлы");
    }
  }

  function startEdit() {
    if (!selected) return;
    setEditFields({ ...selected.fields });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selected) return;
    setBusy("Сохраняю изменения…");
    const res = await api().updateCase(selected.threadId, editFields);
    setBusy("");
    setEditing(false);
    if (res.ok) load(selected.threadId);
    else setError(res.error || "Не удалось сохранить");
  }

  const f = selected?.fields || {};
  const priority = f["Приоритет"] || "—";

  return (
    <div className={`two-col ${isNarrow ? "narrow" : ""}`}>
      {/* ---------- Список дел ---------- */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 13 }}>Список дел</b>
          <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Отмена" : "+ Новое"}</button>
        </div>
        {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
        {items.map((it) => (
          <div
            key={it.threadId}
            className={`mdt-case-item ${selected?.threadId === it.threadId ? "active" : ""}`}
            onClick={() => setSelected(it)}
          >
            <Clock size={13} style={{ marginTop: 3, flexShrink: 0, color: "var(--text-dim)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mdt-case-num">{it.title}</div>
              <div className="mdt-case-type">{it.fields["Тип дела"] || "—"}</div>
              <div className="mdt-case-badge-row">
                <span className={`badge ${it.fields["Статус"] === "Открыто" ? "open" : "closed"}`}>
                  {it.fields["Статус"] || "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {!items.length && !error && <div className="sub">Дел пока нет.</div>}
      </div>

      {/* ---------- Карточка дела ---------- */}
      <div className="card">
        {showForm ? (
          <form onSubmit={handleCreate}>
            <div className="panel-header"><h2>Новое дело</h2></div>
            <div className="field"><label>Номер дела</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={`${officer?.casePrefix || "LS"}-${new Date().getFullYear()}-01428`} /></div>
            <div className="field"><label>Тип дела</label><input required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Robbery" /></div>
            <div className="field">
              <label>Приоритет</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Низкий</option><option>Средний</option><option>Высокий</option>
              </select>
            </div>
            <div className="field"><label>Локация</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="field">
              <label>Подозреваемый</label>
              <input value={form.suspect} onChange={(e) => setForm({ ...form, suspect: e.target.value })} placeholder="ФИО как в картотеке граждан" />
              <div className="hint-text">Совпадение по ФИО связывает дело с карточкой гражданина.</div>
            </div>
            <div className="field"><label>Статья</label><input value={form.statute} onChange={(e) => setForm({ ...form, statute: e.target.value })} placeholder="211 PC (Robbery)" /></div>
            <div className="field"><label>Описание</label><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <button type="submit" disabled={saving}>{saving ? "Отправка в Discord…" : "Создать дело"}</button>
          </form>
        ) : selected ? (
          <div>
            {/* Заголовок */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="mdt-detail-title">Дело #{selected.title}</div>
                <div className="mdt-detail-sub">{f["Тип дела"] || "—"}</div>
              </div>
              <span className={`badge ${f["Статус"] === "Открыто" ? "open" : "closed"}`}>
                {f["Статус"] || "—"}
              </span>
            </div>

            {/* Поля в две колонки */}
            <div className="mdt-fields">
              <div className="mdt-field-row"><span className="mdt-field-label">Тип дела</span><span>{f["Тип дела"] || "—"}</span></div>
              <div className="mdt-field-row">
                <span className="mdt-field-label">Дата открытия</span>
                <span>
                  {f["Дата открытия"] ||
                    (selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })
                      : "—")}
                </span>
              </div>
              <div className="mdt-field-row"><span className="mdt-field-label">Офицер</span><span>{f["Офицер"] || "—"}</span></div>
              <div className="mdt-field-row"><span className="mdt-field-label">Подозреваемый</span><span>{f["Подозреваемый"] || "—"}</span></div>
              <div className="mdt-field-row"><span className="mdt-field-label">Подразделение</span><span>LSPD</span></div>
              <div className="mdt-field-row">
                <span className="mdt-field-label">Приоритет</span>
                <span>
                  <span className="priority-dot" style={{ background: PRIORITY_COLOR[priority] || "var(--text-dim)" }} />
                  {priority}
                </span>
              </div>
              <div className="mdt-field-row">
                <span className="mdt-field-label">Статус</span>
                <span style={{ color: f["Статус"] === "Открыто" ? "var(--green)" : "var(--text-dim)" }}>
                  {f["Статус"] || "—"}
                </span>
              </div>
            </div>

            {/* Описание */}
            <div className="mdt-subcard">
              <div className="mdt-subcard-title">Описание</div>
              {editing ? (
                <textarea
                  rows={4}
                  value={editFields["Описание"] || ""}
                  onChange={(e) => setEditFields({ ...editFields, "Описание": e.target.value })}
                />
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{f["Описание"] || "—"}</div>
              )}
            </div>

            {/* Доп. информация */}
            <div className="mdt-subcard">
              <div className="mdt-subcard-title">Доп. информация</div>
              {!editing && officer?.canManage && <Pencil size={13} className="mdt-subcard-edit" onClick={startEdit} />}
              {editing ? (
                <>
                  <div className="field"><label>Статья</label><input value={editFields["Статья"] || ""} onChange={(e) => setEditFields({ ...editFields, "Статья": e.target.value })} /></div>
                  <div className="field"><label>Локация</label><input value={editFields["Локация"] || ""} onChange={(e) => setEditFields({ ...editFields, "Локация": e.target.value })} /></div>
                  <div className="field">
                    <label>Приоритет</label>
                    <select value={editFields["Приоритет"] || "Средний"} onChange={(e) => setEditFields({ ...editFields, "Приоритет": e.target.value })}>
                      <option>Низкий</option><option>Средний</option><option>Высокий</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveEdit}>Сохранить</button>
                    <button className="secondary" onClick={() => setEditing(false)}>Отмена</button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  <div>Номер дела: {selected.title}</div>
                  <div>Статья: {f["Статья"] || "—"}</div>
                  <div>Локация: {f["Локация"] || "—"}</div>
                  {f["Изменил статус"] && f["Изменил статус"] !== "—" && (
                    <div className="sub">Последнее изменение: {f["Изменил статус"]}{f["Дата изменения"] ? ` · ${f["Дата изменения"]}` : ""}</div>
                  )}
                </div>
              )}
            </div>

            {/* Связанные улики — по совпадению поля "Дело" с номером этого дела */}
            <div className="mdt-subcard">
              <div className="mdt-subcard-title">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Archive size={12} /> Улики по делу ({evidence.filter((ev) => (ev.fields["Дело"] || "").trim() === selected.title.trim()).length})
                </span>
              </div>
              {evidence.filter((ev) => (ev.fields["Дело"] || "").trim() === selected.title.trim()).length ? (
                evidence
                  .filter((ev) => (ev.fields["Дело"] || "").trim() === selected.title.trim())
                  .map((ev) => (
                    <div key={ev.threadId} className="codex-recent" onClick={() => api().openExternal(ev.url)}>
                      <Archive size={12} />
                      <span style={{ flex: 1 }}>{ev.title} — {ev.fields["Тип"] || "—"}</span>
                      <span className="badge closed">{ev.fields["Статус"] || "—"}</span>
                    </div>
                  ))
              ) : (
                <div className="sub" style={{ fontSize: 12 }}>
                  Улик не найдено. Связь строится по полю «Дело» на карточке улики — оно должно точно совпадать с номером этого дела.
                </div>
              )}
            </div>

            {/* Скриншоты / материалы */}
            <div className="mdt-subcard">
              <div className="mdt-subcard-title">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Paperclip size={12} /> Материалы ({attachments.length})
                </span>
              </div>
              {attachments.length ? (
                <div className="attach-grid">
                  {attachments.map((a, i) => (
                    <div key={i} className="attach-thumb" title={a.name} onClick={() => api().openExternal(a.url)}>
                      {a.contentType?.startsWith("image/") ? (
                        <img src={a.url} alt={a.name} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sub" style={{ fontSize: 12 }}>Скриншотов пока нет.</div>
              )}
              <button className="secondary" style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={addScreenshots}>
                <Paperclip size={13} /> Прикрепить скриншоты
              </button>
            </div>

            {busy && <div className="hint-text">{busy}</div>}

            {/* Кнопки действий */}
            <div className="mdt-actions">
              {officer?.canManage && (
                <>
                  <button className="secondary" onClick={startEdit}><Pencil size={13} /> Редактировать</button>
                  <div style={{ position: "relative" }}>
                    <button className="secondary" onClick={() => setStatusMenu((v) => !v)}>
                      <RefreshCw size={13} /> Обновить статус
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
                </>
              )}
              <button onClick={() => api().openExternal(selected.url)}>
                <MessageSquare size={13} /> Отправить в Discord
              </button>
            </div>
            {!officer?.canManage && (
              <div className="hint-text">У вашего звания нет прав редактировать или закрывать дела — только создавать новые.</div>
            )}
          </div>
        ) : (
          <div className="sub">Выберите дело слева.</div>
        )}
      </div>
    </div>
  );
}
