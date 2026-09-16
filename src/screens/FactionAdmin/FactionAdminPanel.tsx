import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { api } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";
import type { Faction } from "../../api/electronApi";
import MappingTable from "./MappingTable";

const PANEL_KEYS = [
  { value: "quickmenu", label: "Police Assistant" },
  { value: "mdt", label: "MDT" },
  { value: "codex", label: "Памятка" },
  { value: "binder", label: "Биндер" },
  { value: "radio", label: "Радио" },
  { value: "discordlog", label: "Discord" },
  { value: "dashboard", label: "Главная" }
];

function emptyFaction(): Partial<Faction> {
  return { name: "", guildId: "", themeColor: "navy", manageThreshold: 5, boloCreateThreshold: 0, casePrefix: "LS" };
}

function SecretGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [secret, setSecret] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError("");
    await api().saveAdminSecret(secret.trim());
    // Проверяем секрет реальным запросом — если неверный, backend вернёт ошибку
    const res = await api().listFactions();
    setChecking(false);
    if (res.ok) onUnlocked();
    else {
      await api().clearAdminSecret();
      setError("Секрет не принят backend'ом — проверьте SUPER_ADMIN_SECRET в .env на сервере.");
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "20px auto", textAlign: "center" }}>
      <h2 style={{ marginTop: 0 }}>Админский секрет backend'а</h2>
      <p className="sub">
        Это тот же <code>SUPER_ADMIN_SECRET</code>, что вы вписали в <code>.env</code>
        на сервере. Хранится только на этой машине, локально.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <input type="password" placeholder="SUPER_ADMIN_SECRET" value={secret} onChange={(e) => setSecret(e.target.value)} autoFocus />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" style={{ width: "100%" }} disabled={checking || !secret.trim()}>
          {checking ? "Проверяю…" : "Войти"}
        </button>
      </form>
    </div>
  );
}

export default function FactionAdminPanel() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [selected, setSelected] = useState<Faction | null>(null);
  const [form, setForm] = useState<Partial<Faction>>(emptyFaction());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"ranks" | "departments" | "positions" | "academy">("ranks");

  useEffect(() => {
    api().hasAdminSecret().then((has) => setUnlocked(has));
  }, []);

  async function loadFactions() {
    const res = await api().listFactions();
    if (res.ok) {
      setFactions(res.items);
      setError("");
    } else {
      setError(res.error || "Не удалось загрузить фракции");
    }
  }

  useEffect(() => {
    if (unlocked) loadFactions();
  }, [unlocked]);

  function selectFaction(f: Faction) {
    setSelected(f);
    setForm({
      ...f,
      allowedRoleIds: joinIds(f.allowedRoleIds),
      adminRoleIds: joinIds(f.adminRoleIds)
    } as any);
    setCreating(false);
    setSaved(false);
    setFormError("");
  }

  function joinIds(json: string): string {
    try {
      return (JSON.parse(json || "[]") as string[]).join(", ");
    } catch {
      return "";
    }
  }

  function splitIds(value: any): string[] {
    return String(value || "")
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function startCreate() {
    setSelected(null);
    setForm(emptyFaction());
    setCreating(true);
    setSaved(false);
    setFormError("");
  }

  async function saveFaction(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setSaved(false);
    // Явно перечисляем поля фракции — форма могла унаследовать из ответа
    // backend'а связи rankMappings/departmentMappings/... (они пришли
    // вместе со списком фракций), их отправлять обратно нельзя.
    const payload: any = {
      name: form.name,
      guildId: form.guildId,
      themeColor: form.themeColor,
      manageThreshold: Number(form.manageThreshold) || 0,
      boloCreateThreshold: Number((form as any).boloCreateThreshold) || 0,
      casePrefix: (form as any).casePrefix || "LS",
      casesChannelId: form.casesChannelId,
      citizensChannelId: form.citizensChannelId,
      boloChannelId: form.boloChannelId,
      vehiclesChannelId: form.vehiclesChannelId,
      warrantsChannelId: form.warrantsChannelId,
      evidenceChannelId: form.evidenceChannelId,
      accidentsChannelId: form.accidentsChannelId,
      codexChannelId: form.codexChannelId,
      logChannelId: form.logChannelId,
      statusChannelId: form.statusChannelId,
      allowedRoleIds: splitIds(form.allowedRoleIds),
      adminRoleIds: splitIds(form.adminRoleIds)
    };
    const res = creating ? await api().createFaction(payload) : await api().updateFaction(selected!.id, payload);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setCreating(false);
      await loadFactions();
      if (res.faction) selectFaction(res.faction);
    } else {
      setFormError(res.error || "Не удалось сохранить фракцию — backend не ответил или вернул ошибку");
    }
  }

  async function removeFaction() {
    if (!selected) return;
    if (!confirm(`Удалить фракцию «${selected.name}»? Это удалит и весь маппинг ролей внутри неё.`)) return;
    setFormError("");
    const res = await api().deleteFaction(selected.id);
    if (res.ok) {
      setSelected(null);
      setForm(emptyFaction());
      loadFactions();
    } else {
      setFormError(res.error || "Не удалось удалить");
    }
  }

  if (unlocked === null) return null;

  return (
    <FloatingPanel panelName="factionadmin" title="ФРАКЦИИ И РОЛИ" subtitle="Администрирование альянса" icon={<Shield size={16} />}>
      {!unlocked ? (
        <SecretGate onUnlocked={() => setUnlocked(true)} />
      ) : (
        <div className="two-col">
          <div className="card">
            <div className="panel-header"><h2>Фракции</h2></div>
            {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
            {factions.map((f) => (
              <div
                key={f.id}
                className={`mdt-case-item ${selected?.id === f.id ? "active" : ""}`}
                onClick={() => selectFaction(f)}
              >
                <Shield size={13} style={{ marginTop: 3, color: "var(--text-dim)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mdt-case-num">{f.name}</div>
                  <div className="mdt-case-type">Guild ID: {f.guildId}</div>
                </div>
              </div>
            ))}
            <button className="secondary" style={{ width: "100%", marginTop: 10 }} onClick={startCreate}>
              + Новая фракция
            </button>
          </div>

          <div className="card">
            {(selected || creating) ? (
              <>
                <form onSubmit={saveFaction}>
                  <div className="panel-header"><h2>{creating ? "Новая фракция" : selected!.name}</h2></div>
                  <div className="field"><label>Название</label><input required value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="LSPD" /></div>
                  <div className="field"><label>Guild ID</label><input required value={form.guildId || ""} onChange={(e) => setForm({ ...form, guildId: e.target.value })} /></div>
                  <div className="field">
                    <label>Цветовая тема</label>
                    <select value={form.themeColor || "navy"} onChange={(e) => setForm({ ...form, themeColor: e.target.value })}>
                      <option value="navy">Тёмно-синяя (navy)</option>
                      <option value="maroon">Бордовая (maroon)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Порог звания для прав редактирования (manageThreshold)</label>
                    <input type="number" value={form.manageThreshold ?? 5} onChange={(e) => setForm({ ...form, manageThreshold: Number(e.target.value) })} />
                    <div className="hint-text">Звания с rankLevel ≥ этого числа могут редактировать/закрывать/удалять записи.</div>
                  </div>
                  <div className="field">
                    <label>Порог звания для создания BOLO (boloCreateThreshold)</label>
                    <input type="number" value={(form as any).boloCreateThreshold ?? 0} onChange={(e) => setForm({ ...form, boloCreateThreshold: Number(e.target.value) } as any)} />
                    <div className="hint-text">0 — создавать BOLO может любое звание (как остальные модули).</div>
                  </div>
                  <div className="field">
                    <label>Префикс номеров дел (casePrefix)</label>
                    <input value={(form as any).casePrefix || "LS"} onChange={(e) => setForm({ ...form, casePrefix: e.target.value } as any)} placeholder="LS" />
                    <div className="hint-text">Просто подсказка в форме создания дела — например LS или SAHP.</div>
                  </div>
                  <div className="section-title">Каналы (форум-каналы Discord)</div>
                  {(["casesChannelId", "citizensChannelId", "boloChannelId", "vehiclesChannelId", "warrantsChannelId", "evidenceChannelId", "accidentsChannelId", "codexChannelId", "logChannelId", "statusChannelId"] as const).map((key) => (
                    <div className="field" key={key}>
                      <label>{key}</label>
                      <input value={(form as any)[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="section-title">Доступ</div>
                  <div className="field">
                    <label>ID ролей, кому разрешён вход (через запятую, пусто = всем)</label>
                    <input value={(form as any).allowedRoleIds || ""} onChange={(e) => setForm({ ...form, allowedRoleIds: e.target.value } as any)} />
                  </div>
                  <div className="field">
                    <label>ID ролей-админов приложения (видят «Настройки» без PIN)</label>
                    <input value={(form as any).adminRoleIds || ""} onChange={(e) => setForm({ ...form, adminRoleIds: e.target.value } as any)} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={saving}>{saving ? "Сохраняю…" : "Сохранить"}</button>
                    {!creating && <button type="button" className="danger" onClick={removeFaction}>Удалить фракцию</button>}
                  </div>
                  {saved && <div className="sub" style={{ marginTop: 8, color: "var(--green)" }}>Сохранено ✓</div>}
                  {formError && <div className="error-text" style={{ marginTop: 8 }}>{formError}</div>}
                </form>

                {!creating && selected && (
                  <div style={{ marginTop: 20 }}>
                    <div className="mdt-tabs">
                      {[
                        { key: "ranks", label: "ЗВАНИЯ" },
                        { key: "departments", label: "ОТДЕЛЫ" },
                        { key: "positions", label: "ДОЛЖНОСТИ" },
                        { key: "academy", label: "АКАДЕМИЯ" }
                      ].map((t) => (
                        <div key={t.key} className={`mdt-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key as any)}>
                          {t.label}
                        </div>
                      ))}
                    </div>
                    <MappingTable kind={tab} factionId={selected.id} panelOptions={PANEL_KEYS} />
                  </div>
                )}
              </>
            ) : (
              <div className="sub">Выберите фракцию слева или создайте новую.</div>
            )}
          </div>
        </div>
      )}
    </FloatingPanel>
  );
}
