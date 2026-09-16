import React, { useEffect, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { api } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";
import type { LogMessage } from "../../api/electronApi";

function timeAgo(ts: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 60) return "только что";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} ч назад`;
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function DiscordLogPanel() {
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  async function load() {
    const res = await api().listRecentLogs();
    setLoading(false);
    if (res.ok) {
      setMessages(res.messages);
      setError("");
      setConfigured(true);
      if (res.guildId && res.logChannelId) {
        setLink(`https://discord.com/channels/${res.guildId}/${res.logChannelId}`);
      }
    } else {
      setError(res.error || "Не удалось загрузить лог");
      setConfigured(false);
    }
  }

  useEffect(() => {
    load();
    // Живая лента — обновляем каждые 15 секунд, не нужно вручную обновлять.
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <FloatingPanel
      panelName="discordlog"
      title="DISCORD"
      subtitle="Лог патруля"
      icon={<MessageSquare size={16} />}
      headerRight={
        <span className="panel-close" title="Обновить" onClick={load}>
          <RefreshCw size={13} />
        </span>
      }
    >
      {!configured && (
        <div className="hint-text" style={{ marginBottom: 10 }}>
          ID канала для логов не задан у вашей фракции на backend'е — живая
          лента и уведомления о новых делах недоступны.
        </div>
      )}
      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      {loading && <div className="sub">Загружаю ленту…</div>}

      {!loading && messages.map((m) => (
        <div key={m.id} className="mdt-subcard" style={{ padding: "9px 12px" }}>
          <div style={{ fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content || "—"}</div>
          <div className="sub" style={{ marginTop: 5, fontSize: 11 }}>{m.author} · {timeAgo(m.createdAt)}</div>
        </div>
      ))}
      {!loading && !error && !messages.length && (
        <div className="sub">В канале логов пока пусто.</div>
      )}

      {link && (
        <button style={{ width: "100%", marginTop: 6 }} onClick={() => api().openExternal(link)}>
          Открыть канал в Discord
        </button>
      )}
    </FloatingPanel>
  );
}
