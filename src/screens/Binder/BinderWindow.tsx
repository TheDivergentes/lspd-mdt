import React, { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { api } from "../../api/electronApi";
import type { BinderItem } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";

export default function BinderWindow() {
  const [items, setItems] = useState<BinderItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [editKey, setEditKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastError, setBroadcastError] = useState("");

  async function sendBroadcast() {
    setBroadcasting(true);
    setBroadcastError("");
    const res = await api().broadcastMessage(broadcastText.trim());
    setBroadcasting(false);
    if (res.ok) {
      setBroadcastSent(true);
      setBroadcastText("");
      setTimeout(() => setBroadcastSent(false), 2000);
    } else {
      setBroadcastError(res.error || "Не удалось отправить");
    }
  }

  useEffect(() => {
    api().getBinder().then((data) => {
      setItems(data);
      if (data.length) setSelected(0);
    });
  }, []);

  useEffect(() => {
    if (selected !== null && items[selected]) setEditKey(items[selected].key);
  }, [selected, items]);

  function addRow() {
    setItems((arr) => {
      const next = [...arr, { action: "Новое действие", key: "—" }];
      setSelected(next.length - 1);
      return next;
    });
  }

  async function persist(next: BinderItem[]) {
    setItems(next);
    await api().saveBinder(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function applyKeyChange() {
    if (selected === null) return;
    const next = items.map((it, i) => (i === selected ? { ...it, key: editKey } : it));
    persist(next);
  }

  function resetKey() {
    if (selected === null) return;
    setEditKey(items[selected].key);
  }

  const filtered = items
    .map((it, i) => ({ ...it, i }))
    .filter((it) => it.action.toLowerCase().includes(query.toLowerCase()));

  const current = selected !== null ? items[selected] : null;

  return (
    <FloatingPanel panelName="binder" title="БИНДЕР СОТРУДНИКА" subtitle="Настройки и горячие клавиши" icon={<Link2 size={16} />}>
      <div className="two-col">
        <div className="card">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input placeholder="Поиск по биндам…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button onClick={addRow}>+</button>
          </div>
          {filtered.map((it) => (
            <div
              key={it.i}
              className={`case-list-item ${selected === it.i ? "active" : ""}`}
              onClick={() => setSelected(it.i)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>{it.action}</span>
              <span className="badge closed">{it.key}</span>
            </div>
          ))}
          {!filtered.length && <div className="sub">Ничего не найдено.</div>}
        </div>

        <div className="card">
          {current ? (
            <div>
              <div className="case-detail-header">
                <div>
                  <div className="case-detail-title">{current.action}</div>
                  <div className="sub">Справочный бинд — не отправляется в игру</div>
                </div>
              </div>

              <div className="case-detail-section">
                <div className="section-title">Название действия</div>
                <input
                  value={current.action}
                  onChange={(e) => {
                    if (selected === null) return;
                    const next = items.map((it, i) => (i === selected ? { ...it, action: e.target.value } : it));
                    setItems(next);
                  }}
                  onBlur={() => persist(items)}
                />
              </div>

              <div className="case-detail-section">
                <div className="section-title">Текущая клавиша</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={editKey} onChange={(e) => setEditKey(e.target.value)} />
                  <button onClick={applyKeyChange}>Изменить</button>
                  <button className="secondary" onClick={resetKey}>Сбросить</button>
                </div>
              </div>

              <div className="hint-text">
                Это личный справочник ваших игровых бинд-команд для памяти —
                приложение не умеет отправлять нажатия клавиш в игру.
              </div>
              {saved && <div className="sub" style={{ marginTop: 8, color: "var(--green)" }}>Сохранено ✓</div>}
            </div>
          ) : (
            <div className="sub">Выберите бинд слева или добавьте новый.</div>
          )}
        </div>
      </div>

      {/* Трансляция в Discord — оформленный embed в канал логов */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="panel-header"><h2>Трансляция в Discord</h2></div>
        <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
          Уйдёт оформленным сообщением от имени бота в канал логов —
          например, срочное сообщение по рации всему отделу.
        </div>
        <textarea rows={3} value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} placeholder="10-20. ДПС, веду преследование чёрного SUV, гос. номер 7FZ392. Район: Интегрити-вэй." />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <button onClick={sendBroadcast} disabled={broadcasting || !broadcastText.trim()}>
            {broadcasting ? "Отправка…" : "Транслировать в Discord"}
          </button>
          {broadcastError && <span className="error-text">{broadcastError}</span>}
          {broadcastSent && <span className="sub" style={{ color: "var(--green)" }}>Отправлено ✓</span>}
        </div>
      </div>
    </FloatingPanel>
  );
}
