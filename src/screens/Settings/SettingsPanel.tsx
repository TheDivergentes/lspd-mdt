import React from "react";
import { Settings } from "lucide-react";
import FloatingPanel from "../../components/FloatingPanel";
import AdminGate from "../../components/AdminGate";
import SetupWizard from "../Setup/SetupWizard";

export default function SettingsPanel() {
  return (
    <FloatingPanel panelName="settings" title="НАСТРОЙКИ" subtitle="Подключение к backend" icon={<Settings size={16} />}>
      <AdminGate>
        <SetupWizard mustChangePin={false} embedded />
      </AdminGate>
    </FloatingPanel>
  );
}
