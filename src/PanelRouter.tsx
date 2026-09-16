import React from "react";
import QuickMenuPanel from "./screens/QuickMenu/QuickMenuPanel";
import MDTWindow from "./screens/MDT/MDTWindow";
import CodexWindow from "./screens/Codex/CodexWindow";
import BinderWindow from "./screens/Binder/BinderWindow";
import RadioPanel from "./screens/Radio/RadioPanel";
import DiscordLogPanel from "./screens/DiscordLog/DiscordLogPanel";
import DashboardPanel from "./screens/Dashboard/DashboardPanel";
import SettingsPanel from "./screens/Settings/SettingsPanel";
import PlayerSettingsPanel from "./screens/PlayerSettings/PlayerSettingsPanel";
import FactionAdminPanel from "./screens/FactionAdmin/FactionAdminPanel";
import BodycamPanel from "./screens/Bodycam/BodycamPanel";

export default function PanelRouter({ panel }: { panel: string }) {
  switch (panel) {
    case "quickmenu":
      return <QuickMenuPanel />;
    case "mdt":
      return <MDTWindow />;
    case "codex":
      return <CodexWindow />;
    case "binder":
      return <BinderWindow />;
    case "radio":
      return <RadioPanel />;
    case "discordlog":
      return <DiscordLogPanel />;
    case "dashboard":
      return <DashboardPanel />;
    case "settings":
      return <SettingsPanel />;
    case "playersettings":
      return <PlayerSettingsPanel />;
    case "factionadmin":
      return <FactionAdminPanel />;
    case "bodycam":
      return <BodycamPanel />;
    default:
      return <div style={{ padding: 20, color: "#fff" }}>Неизвестная панель: {panel}</div>;
  }
}
