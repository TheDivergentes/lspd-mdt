import React, { useEffect, useState } from "react";
import { Users, Car, FileText, FolderOpen, AlertTriangle, Shield, Laptop2, Archive, Circle, CarFront } from "lucide-react";
import FloatingPanel from "../../components/FloatingPanel";
import { useOfficer } from "../../state/useOfficer";
import { usePanelSize } from "../../state/usePanelSize";
import { api } from "../../api/electronApi";
import CasesTab from "./tabs/CasesTab";
import CitizensTab from "./tabs/CitizensTab";
import VehiclesTab from "./tabs/VehiclesTab";
import WarrantsTab from "./tabs/WarrantsTab";
import BoloTab from "./tabs/BoloTab";
import OfficersTab from "./tabs/OfficersTab";
import EvidenceTab from "./tabs/EvidenceTab";
import AccidentsTab from "./tabs/AccidentsTab";

const TABS = [
  { key: "citizens", label: "ПЕРСОНЫ", icon: Users },
  { key: "vehicles", label: "ТРАНСПОРТ", icon: Car },
  { key: "warrants", label: "ОРДЕРА", icon: FileText },
  { key: "cases", label: "ДЕЛА", icon: FolderOpen },
  { key: "evidence", label: "УЛИКИ", icon: Archive },
  { key: "accidents", label: "ДТП", icon: CarFront },
  { key: "bolo", label: "BOLO", icon: AlertTriangle },
  { key: "officers", label: "СОТРУДНИКИ", icon: Shield }
] as const;

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000 * 20);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function MDTWindow() {
  const [tab, setTab] = useState("cases");
  const officer = useOfficer();
  const clock = useClock();
  const { isCompact } = usePanelSize();
  const [status, setStatus] = useState<{ code: string; label: string } | null>(null);

  useEffect(() => {
    api().getOfficerStatus().then((s) => s && setStatus({ code: s.code, label: s.label }));
  }, []);

  return (
    <FloatingPanel
      panelName="mdt"
      title="LSPD MDT"
      subtitle="Los Santos Police Department"
      theme="maroon"
      icon={<Laptop2 size={16} />}
      headerRight={
        officer ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, whiteSpace: "nowrap", color: "var(--text-dim)" }}>
            <span style={{ color: "var(--text)" }}>{officer.badge}</span>
            {!isCompact && (
              <>
                <span className="header-sep">|</span>
                <span style={{ color: "var(--text)" }}>{officer.nickname}</span>
              </>
            )}
            <span className="header-sep">|</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text)" }}>
              <Circle size={7} fill={status ? "var(--green)" : "var(--text-dim)"} stroke="none" />
              {status?.code || "—"}
            </span>
            {!isCompact && (
              <>
                <span className="header-sep">|</span>
                <span style={{ color: "var(--text)" }}>{clock}</span>
              </>
            )}
          </div>
        ) : null
      }
    >
      <div className="mdt-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className={`mdt-tab ${tab === t.key ? "active" : ""} ${isCompact ? "compact" : ""}`}
              onClick={() => setTab(t.key)}
              title={t.label}
            >
              <Icon size={14} />
              {!isCompact && t.label}
            </div>
          );
        })}
      </div>
      {tab === "cases" && <CasesTab />}
      {tab === "citizens" && <CitizensTab />}
      {tab === "vehicles" && <VehiclesTab />}
      {tab === "warrants" && <WarrantsTab />}
      {tab === "evidence" && <EvidenceTab />}
      {tab === "accidents" && <AccidentsTab />}
      {tab === "bolo" && <BoloTab />}
      {tab === "officers" && <OfficersTab />}
    </FloatingPanel>
  );
}
