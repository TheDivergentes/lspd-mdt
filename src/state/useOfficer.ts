import { useEffect, useState } from "react";
import { api } from "../api/electronApi";
import type { Officer } from "../api/electronApi";

// Каждая плавающая панель — отдельный процесс рендерера (отдельное окно
// Electron), поэтому zustand-стор одного окна не виден другому. Сессию
// офицера каждая панель запрашивает у main-процесса самостоятельно.
export function useOfficer() {
  const [officer, setOfficer] = useState<Officer | null>(null);

  useEffect(() => {
    api()
      .getSession()
      .then((s) => setOfficer(s?.officer || null));
  }, []);

  return officer;
}
