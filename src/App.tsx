import React from "react";
import AuthShell from "./AuthShell";
import PanelRouter from "./PanelRouter";
import CaptureOverlay from "./screens/Capture/CaptureOverlay";

// Каждое окно (authWindow или любая плавающая панель) загружает один и тот
// же index.html, но с разным hash — так main-процесс говорит рендереру,
// что именно рисовать в этом конкретном окне.
export default function App() {
  const panel = window.location.hash.replace(/^#\/?/, "");
  if (!panel || panel === "auth") return <AuthShell />;
  if (panel === "capture") return <CaptureOverlay />;
  return <PanelRouter panel={panel} />;
}
