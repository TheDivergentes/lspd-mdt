import React, { useEffect, useState } from "react";
import { api } from "../../api/electronApi";

type Kind = "ranks" | "departments" | "positions" | "academy";

interface Props {
  kind: Kind;
  factionId: string;
  panelOptions: { value: string; label: string }[];
}

// Поля отличаются по типу маппинга — звание богаче (уровень, значок,
// панели по умолчанию), остальные три — просто "роль → название".
const FIELD_CONFIG: Record<Kind, { nameField: string; nameLabel: string; hasLevel: boolean; hasBadge: boolean; hasPanels: boolean }> = {
  ranks: { nameField: "rankName", nameLabel: "Звание", hasLevel: true, hasBadge: true, hasPanels: true },
  departments: { nameField: "departmentName", nameLabel: "Отдел", hasLevel: false, hasBadge: false, hasPanels: false },
  positions: { nameField: "positionName", nameLabel: "Должность", hasLevel: false, hasBadge: false, hasPanels: false },
  academy: { nameField: "stageName", nameLabel: "Стадия академии", hasLevel: false, hasBadge: false, hasPanels: false }
};

function apiFor(kind: Kind) {
  const map = {
    ranks: { list: api().listRanks, create: api().createRank, update: api().updateRank, del: api().deleteRank },
    departments: { list: api().listDepartments, create: api().createDepartment, update: api().updateDepartment, del: api().deleteDepartment },
    positions: { list: api().listPositions, create: api().createPosition, update: api().updatePosition, del: api().deletePosition },
    academy: { list: api().listAcademy, create: api().createAcademy, update: api().updateAcademy, del: api().deleteAcademy }
  };
  return map[kind];
}

export default function MappingTable({ kind, factionId, panelOptions }: Props) {
  const cfg = FIELD_CONFIG[kind];
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState<any>({ discordRoleId: "", [cfg.nameField]: "", rankLevel: 0, badgePrefix: "", defaultPanels: [] });

  async function load() {
    const res = await apiFor(kind).list(factionId);
    if (res.ok) { setRows(res.items); setError(""); }
    else setError(res.error || "Не удалось загрузить");
  }

  useEffect(() => {
    load();
    setNewRow({ discordRoleId: "", [cfg.nameField]: "", rankLevel: 0, badgePrefix: "", defaultPanels: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, factionId]);

  async function addRow() {
    if (!newRow.discordRoleId || !newRow[cfg.nameField]) return;
    const payload = { ...newRow };
    const res = await apiFor(kind).create(factionId, payload);
    if (res.ok) {
      setNewRow({ discordRoleId: "", [cfg.nameField]: "", rankLevel: 0, badgePrefix: "", defaultPanels: [] });
      load();
    } else setError(res.error || "Не удалось добавить строку");
  }

  async function updateField(row: any, field: string, value: any) {
    const res = await apiFor(kind).update(row.id, { [field]: value });
    if (res.ok) load();
  }

  async function removeRow(id: string) {
    const res = await apiFor(kind).del(id);
    if (res.ok) load();
  }

  function togglePanel(row: any, panelKey: string) {
    let current: string[] = [];
    try { current = JSON.parse(row.defaultPanels || "[]"); } catch {}
    const next = current.includes(panelKey) ? current.filter((p) => p !== panelKey) : [...current, panelKey];
    updateField(row, "defaultPanels", next);
  }

  return (
    <div style={{ marginTop: 12 }}>
      {error && <div className="error-text" style={{ marginBottom: 8 }}>{error}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-dim)", fontSize: 12 }}>
            <th style={{ padding: 6 }}>Discord Role ID</th>
            <th style={{ padding: 6 }}>{cfg.nameLabel}</th>
            {cfg.hasLevel && <th style={{ padding: 6 }}>Уровень</th>}
            {cfg.hasBadge && <th style={{ padding: 6 }}>Значок</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr>
                <td style={{ padding: 4 }}><input defaultValue={row.discordRoleId} onBlur={(e) => updateField(row, "discordRoleId", e.target.value)} /></td>
                <td style={{ padding: 4 }}><input defaultValue={row[cfg.nameField]} onBlur={(e) => updateField(row, cfg.nameField, e.target.value)} /></td>
                {cfg.hasLevel && <td style={{ padding: 4 }}><input type="number" defaultValue={row.rankLevel} onBlur={(e) => updateField(row, "rankLevel", Number(e.target.value))} style={{ width: 70 }} /></td>}
                {cfg.hasBadge && <td style={{ padding: 4 }}><input defaultValue={row.badgePrefix} onBlur={(e) => updateField(row, "badgePrefix", e.target.value)} style={{ width: 70 }} placeholder="1-A-" /></td>}
                <td style={{ padding: 4 }}><button className="secondary" onClick={() => removeRow(row.id)}>✕</button></td>
              </tr>
              {cfg.hasPanels && (
                <tr>
                  <td colSpan={5} style={{ padding: "0 4px 10px" }}>
                    <div className="sub" style={{ marginBottom: 4, fontSize: 11 }}>Панели по умолчанию для «{row[cfg.nameField]}»:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {panelOptions.map((p) => {
                        let current: string[] = [];
                        try { current = JSON.parse(row.defaultPanels || "[]"); } catch {}
                        return (
                          <label key={p.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                            <input type="checkbox" checked={current.includes(p.value)} onChange={() => togglePanel(row, p.value)} />
                            {p.label}
                          </label>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          <tr>
            <td style={{ padding: 4 }}><input value={newRow.discordRoleId} onChange={(e) => setNewRow({ ...newRow, discordRoleId: e.target.value })} placeholder="Role ID" /></td>
            <td style={{ padding: 4 }}><input value={newRow[cfg.nameField]} onChange={(e) => setNewRow({ ...newRow, [cfg.nameField]: e.target.value })} placeholder={cfg.nameLabel} /></td>
            {cfg.hasLevel && <td style={{ padding: 4 }}><input type="number" value={newRow.rankLevel} onChange={(e) => setNewRow({ ...newRow, rankLevel: Number(e.target.value) })} style={{ width: 70 }} /></td>}
            {cfg.hasBadge && <td style={{ padding: 4 }}><input value={newRow.badgePrefix} onChange={(e) => setNewRow({ ...newRow, badgePrefix: e.target.value })} style={{ width: 70 }} placeholder="1-A-" /></td>}
            <td style={{ padding: 4 }}><button onClick={addRow}>+</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
