import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { api } from "../api/electronApi";
import LSPDBadge from "./LSPDBadge";
import USFlagIcon from "./USFlagIcon";

interface Props {
  panelName: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  theme?: "navy" | "maroon";
  children: React.ReactNode;
}

export default function FloatingPanel({ panelName, title, subtitle, icon, headerRight, theme = "navy", children }: Props) {
  const [interactive, setInteractive] = useState(true);

  // Esc закрывает активную панель — привычный жест для оверлея.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") api().hidePanel(panelName);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelName]);

  useEffect(() => {
    api().getInteractiveMode().then(setInteractive);
    api().onInteractiveModeChanged(setInteractive);
  }, []);

  return (
    <div className={`floating-root ${theme === "maroon" ? "theme-maroon" : ""} ${!interactive ? "clickthrough" : ""}`}>
      <div className="floating-panel">
        <div className="floating-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LSPDBadge size={28} />
            {icon && <div className="floating-icon-sm">{icon}</div>}
            <div>
              <div className="floating-title">{title}</div>
              {subtitle && <div className="floating-subtitle">{subtitle}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {headerRight}
            {!interactive && (
              <span title="Клик сквозь панель включён — нажмите Insert, чтобы взаимодействовать" style={{ display: "flex" }}>
                <Lock size={13} style={{ opacity: 0.6 }} />
              </span>
            )}
            <USFlagIcon size={20} />
            <span className="panel-close" onClick={() => api().hidePanel(panelName)}>✕</span>
          </div>
        </div>
        <div className="floating-body">{children}</div>
      </div>
    </div>
  );
}
