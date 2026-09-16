import React, { useEffect, useState } from "react";
import { api } from "../../api/electronApi";
import type { HotkeyRegisterResult } from "../../api/electronApi";

const PANEL_OPTIONS = [
  { value: "quickmenu", label: "Police Assistant" },
  { value: "radio", label: "Радио" },
  { value: "mdt", label: "MDT" },
  { value: "codex", label: "Памятка" },
  { value: "binder", label: "Биндер" },
  { value: "discordlog", label: "Discord" },
  { value: "dashboard", label: "Главная (LSPD Assistant)" },
  { value: "settings", label: "Настройки" },
  { value: "__toggleAll__", label: "Показать/скрыть все панели" },
  { value: "__toggleInteractive__", label: "Режим взаимодействия (клик сквозь панели)" },
  { value: "__quit__", label: "Закрыть программу полностью" }
];

export default function HotkeysEditor() {
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState<HotkeyRegisterResult[]>([]);

  useEffect(() => {
    api().getHotkeys().then(setBindings);
  }, []);

  function renameKey(oldKey: string, newKeyRaw: string) {
    const newKey = newKeyRaw.toUpperCase().trim();
    setBindings((b) => {
      if (!newKey || newKey === oldKey) return { ...b, [oldKey]: b[oldKey] };
      const next: Record<string, string> = {};
      Object.entries(b).forEach(([k, v]) => {
        next[k === oldKey ? newKey : k] = String(v);
      });
      return next;
    });
    setSaved(false);
  }

  function updateTarget(key: string, target: string) {
    setBindings((b) => ({ ...b, [key]: target }));
    setSaved(false);
  }

  function removeKey(key: string) {
    setBindings((b) => {
      const next = { ...b };
      delete next[key];
      return next;
    });
    setSaved(false);
  }

  function addRow() {
    setBindings((b) => ({ ...b, "": "quickmenu" }));
  }

  async function save() {
    const cleaned: Record<string, string> = {};
    Object.entries(bindings).forEach(([k, v]) => {
      if (k) cleaned[k] = String(v);
    });
    const res = await api().saveHotkeys(cleaned);
    setBindings(cleaned);
    setSaved(true);
    setFailed(res.results.filter((r) => !r.ok));
  }

  async function reset() {
    const res = await api().resetHotkeys();
    setBindings(res.bindings);
    setSaved(true);
    setFailed(res.results.filter((r) => !r.ok));
  }

  return (
    <div>
      <div className="panel-header">
        <h2>Хоткеи</h2>
        <span className="sub">Применяются сразу после сохранения, без перезапуска</span>
      </div>
      <div className="hint-text" style={{ marginBottom: 10 }}>
        ⚠️ Избегайте одиночных букв без модификатора (просто "K", просто
        "G") — такая клавиша перехватывается системно и не дойдёт до чата
        игры, вы не сможете её напечатать. Используйте сочетания вроде
        <code> Control+K</code>, <code>Alt+G</code>, либо F-клавиши.
      </div>
      {Object.entries(bindings).map(([key, target], i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            style={{ width: 80 }}
            value={key}
            onChange={(e) => renameKey(key, e.target.value)}
            placeholder="F7"
          />
          <select style={{ flex: 1 }} value={target} onChange={(e) => updateTarget(key, e.target.value)}>
            {PANEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="secondary" onClick={() => removeKey(key)}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="secondary" onClick={addRow}>+ Добавить хоткей</button>
        <button onClick={save}>Сохранить</button>
        <button className="secondary" onClick={reset}>Сбросить к стандартным</button>
        {saved && !failed.length && <span className="sub" style={{ alignSelf: "center" }}>Сохранено ✓</span>}
      </div>
      {!!failed.length && (
        <div className="error-text" style={{ marginTop: 10 }}>
          Не зарегистрировались (Windows/Electron не распознал имя клавиши):{" "}
          {failed.map((f) => f.key || "(пусто)").join(", ")}.{" "}
          Для нумпада используйте формат <code>num0</code>–<code>num9</code>,
          <code> numdec</code>, <code>numadd</code> и т.п. — не «0 на нумпаде».
        </div>
      )}
    </div>
  );
}
