import React, { useState } from "react";
import { api } from "../api/electronApi";
import { useOfficer } from "../state/useOfficer";

interface Props {
  children: React.ReactNode;
}

/**
 * Доступ к Настройкам внутри работающего приложения: либо у вошедшего
 * офицера есть роль-админ (adminRoleIds в конфиге), либо он вводит
 * локальный PIN администратора (тот же, что на первом запуске).
 */
export default function AdminGate({ children }: Props) {
  const officer = useOfficer();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (officer?.isAppAdmin || unlocked) {
    return <>{children}</>;
  }

  async function tryPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await api().adminLogin(pin);
    if (res.ok) setUnlocked(true);
    else setError("Неверный PIN администратора");
  }

  return (
    <div className="card" style={{ maxWidth: 360, margin: "20px auto", textAlign: "center" }}>
      <h2 style={{ marginTop: 0 }}>Нужны права администратора</h2>
      <p className="sub">
        Настройки видят участники с ролью-админом приложения (задаётся на
        backend'е администратором фракции) — либо войдите по PIN.
      </p>
      <form onSubmit={tryPin}>
        <div className="field">
          <input type="password" placeholder="PIN администратора" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" style={{ width: "100%" }}>Войти</button>
      </form>
    </div>
  );
}
