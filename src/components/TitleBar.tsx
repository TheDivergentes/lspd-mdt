import React from "react";
import { api } from "../api/electronApi";
import LSPDBadge from "./LSPDBadge";
import USFlagIcon from "./USFlagIcon";

export default function TitleBar() {
  return (
    <div className="titlebar">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LSPDBadge size={22} />
        <span>LSPD MDT Assistant · Los Santos Police Department</span>
      </div>
      <div className="titlebar-controls">
        <USFlagIcon size={18} />
        <span className="titlebar-btn" onClick={() => api().toggleAlwaysOnTop()}>Поверх окон</span>
        <span className="titlebar-btn" onClick={() => api().minimize()}>—</span>
        <span className="titlebar-btn" onClick={() => api().close()}>✕</span>
      </div>
    </div>
  );
}
