import React, { useEffect, useState } from "react";
import { Radio as RadioIcon, RefreshCw, MicOff, VolumeX, ArrowRightLeft, Users } from "lucide-react";
import { api } from "../../api/electronApi";
import type { VoiceChannel } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";
import { usePanelSize } from "../../state/usePanelSize";

export default function RadioPanel() {
  const { isCompact } = usePanelSize();
  const [channels, setChannels] = useState<VoiceChannel[]>([]);
  const [canMove, setCanMove] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  async function load() {
    const res = await api().listVoiceChannels();
    setLoading(false);
    if (res.ok) {
      setChannels(res.channels);
      setCanMove(res.canMove);
      setSelfId(res.selfId);
      setError("");
    } else {
      setError(res.error || "Не удалось получить голосовые каналы");
    }
  }

  useEffect(() => {
    load();
    // Состав каналов меняется часто — обновляем автоматически
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  async function move(memberId: string, channelId: string) {
    setMoveTarget(null);
    const res = await api().moveMember(memberId, channelId);
    if (res.ok) load();
    else setError(res.error || "Не удалось переместить");
  }

  const totalInVoice = channels.reduce((sum, c) => sum + c.members.length, 0);

  return (
    <FloatingPanel
      panelName="radio"
      title="РАДИО"
      subtitle="Голосовые каналы сервера"
      icon={<RadioIcon size={16} />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, whiteSpace: "nowrap" }}>
          <span className="badge open"><Users size={11} style={{ marginRight: 4 }} />{totalInVoice}</span>
          <span className="panel-close" onClick={load} title="Обновить"><RefreshCw size={13} /></span>
        </div>
      }
    >
      {loading && <div className="sub">Загружаю каналы…</div>}
      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}

      {!canMove && !loading && !error && (
        <div className="hint-text" style={{ marginBottom: 10 }}>
          У вас нет права «Move Members» — перемещать людей между каналами нельзя,
          состав показывается только для просмотра.
        </div>
      )}

      {channels.map((ch) => (
        <div key={ch.id} className="mdt-subcard">
          <div className="mdt-subcard-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RadioIcon size={12} /> {ch.name}
            </span>
            <span>{ch.members.length}{ch.userLimit ? ` / ${ch.userLimit}` : ""}</span>
          </div>

          {ch.members.length ? (
            ch.members.map((m) => (
              <div
                key={m.id}
                className="mdt-case-item"
                style={{ alignItems: "center", cursor: "default", marginBottom: 5, padding: "7px 9px" }}
              >
                <img src={m.avatarUrl} width={24} height={24} style={{ borderRadius: "50%", flexShrink: 0 }} alt="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12 }}>
                    {m.nickname}
                    {m.id === selfId && <span className="sub"> (вы)</span>}
                  </div>
                </div>
                {m.muted && <MicOff size={12} style={{ color: "var(--text-dim)" }} />}
                {m.deafened && <VolumeX size={12} style={{ color: "var(--text-dim)" }} />}
                {canMove && (
                  <div style={{ position: "relative" }}>
                    <span
                      className="panel-close"
                      title="Переместить в другой канал"
                      onClick={() => setMoveTarget(moveTarget === m.id ? null : m.id)}
                    >
                      <ArrowRightLeft size={12} />
                    </span>
                    {moveTarget === m.id && (
                      <div style={{
                        position: "absolute", right: 0, top: "100%", marginTop: 5, zIndex: 20,
                        background: "var(--panel)", border: "1px solid var(--border)",
                        borderRadius: 9, padding: 5, minWidth: 170, maxHeight: 220, overflow: "auto"
                      }}>
                        {channels.filter((c) => c.id !== ch.id).map((c) => (
                          <div key={c.id} className="codex-recent" onClick={() => move(m.id, c.id)}>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="sub" style={{ fontSize: 12 }}>Пусто</div>
          )}
        </div>
      ))}

      {!loading && !error && !channels.length && (
        <div className="sub">Голосовых каналов не найдено.</div>
      )}
    </FloatingPanel>
  );
}
