import React, { useEffect, useState } from "react";
import { api } from "../api/electronApi";
import type { UpdateStatus } from "../api/electronApi";

export default function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api().getUpdateStatus().then((s) => { if (s) setStatus(s); });
    api().onUpdateStatus(setStatus);
  }, []);

  async function check() {
    setChecking(true);
    const res = await api().checkForUpdate();
    setChecking(false);
    if (!res.ok) setStatus({ state: "error", message: res.error });
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="panel-header">
        <h2>Обновления</h2>
      </div>
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
        Проверяется автоматически при запуске и каждые 2 часа — кнопка ниже
        для внеочередной проверки прямо сейчас. Работает, если настроена
        публикация релизов (см. BUILD.md); установщик Windows и так обновляет
        поверх старой версии без удаления (запустите новый Setup.exe вручную,
        если он у вас есть).
      </div>

      {status?.state === "latest" && <div className="sub">У вас последняя версия.</div>}
      {status?.state === "available" && (
        <div>
          <div className="sub" style={{ marginBottom: 8 }}>Доступна версия {status.version}.</div>
          <button onClick={() => api().downloadUpdate()}>Скачать обновление</button>
        </div>
      )}
      {status?.state === "downloading" && <div className="sub">Загрузка… {status.percent ?? 0}%</div>}
      {status?.state === "ready" && (
        <div>
          <div className="sub" style={{ marginBottom: 8 }}>Обновление загружено.</div>
          <button onClick={() => api().installUpdate()}>Перезапустить и установить</button>
        </div>
      )}
      {status?.state === "error" && <div className="error-text">{status.message}</div>}

      <button className="secondary" style={{ marginTop: 10 }} onClick={check} disabled={checking}>
        {checking ? "Проверяю…" : "Проверить обновления"}
      </button>
    </div>
  );
}
