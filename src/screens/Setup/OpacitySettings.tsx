import React, { useEffect, useState } from "react";
import { api } from "../../api/electronApi";

export default function OpacitySettings() {
  const [opacity, setOpacity] = useState(1);
  const [autoFade, setAutoFade] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0.35);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api().getOpacitySettings().then((s) => {
      setOpacity(s.opacity);
      setAutoFade(s.autoFade);
      setFadeOpacity(s.fadeOpacity);
    });
  }, []);

  async function save() {
    await api().saveOpacitySettings({ opacity, autoFade, fadeOpacity });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <div className="panel-header">
        <h2>Прозрачность окон</h2>
      </div>
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 12 }}>
        Автозатухание делает панели прозрачнее, когда вы кликаете обратно в
        игру (окно теряет фокус) — чтобы не бросались в глаза. При наведении
        и клике на саму панель она возвращается к обычной непрозрачности.
      </div>

      <div className="field">
        <label>
          <input
            type="checkbox"
            style={{ width: "auto", marginRight: 7 }}
            checked={autoFade}
            onChange={(e) => setAutoFade(e.target.checked)}
          />
          Автоматически делать панели прозрачнее вне фокуса
        </label>
      </div>

      <div className="field">
        <label>Прозрачность в фокусе: {Math.round(opacity * 100)}%</label>
        <input
          type="range"
          min={0.4}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>Прозрачность вне фокуса (если включено выше): {Math.round(fadeOpacity * 100)}%</label>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={fadeOpacity}
          onChange={(e) => setFadeOpacity(Number(e.target.value))}
          disabled={!autoFade}
        />
      </div>

      <button onClick={save}>Сохранить</button>
      {saved && <span className="sub" style={{ marginLeft: 10 }}>Применено ✓</span>}
    </div>
  );
}
