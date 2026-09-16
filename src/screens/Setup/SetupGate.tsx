import React, { useState } from "react";
import { api } from "../../api/electronApi";
import SetupWizard from "./SetupWizard";
import LSPDBadge from "../../components/LSPDBadge";

export default function SetupGate() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [mustChangePin, setMustChangePin] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await api().adminLogin(pin);
    if (res.ok) {
      setUnlocked(true);
      setMustChangePin(res.mustChangePin);
    } else {
      setError("Неверный PIN администратора");
    }
  }

  if (unlocked) return <SetupWizard mustChangePin={mustChangePin} />;

  return (
    <div className="center-screen">
      <form className="card login-card" onSubmit={handleUnlock}>
        <div className="login-badge-wrap"><LSPDBadge size={48} /></div>
        <h1>Первичная настройка</h1>
        <p>
          Приложение ещё не подключено к Discord-серверу. Введите PIN
          администратора, чтобы открыть мастер настройки.
        </p>
        <div className="field">
          <label>PIN администратора</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="По умолчанию: 1234"
            autoFocus
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" style={{ width: "100%" }}>Продолжить</button>
        <div className="hint-text">
          Дефолтный PIN указан в README проекта — обязательно смените его
          после первого входа в настройках.
        </div>
      </form>
    </div>
  );
}
