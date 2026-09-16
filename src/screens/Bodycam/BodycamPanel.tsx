import React, { useEffect, useRef, useState } from "react";
import { Play, Square, MapPin } from "lucide-react";
import { api } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";
import { useOfficer } from "../../state/useOfficer";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

// Чисто визуальный оверлей "как будто бодикамера" для записи в OBS —
// ничего не пишет и не управляет самой записью, только показывает REC +
// таймер + данные офицера сверху игры, пока вы сами жмёте запись в OBS.
export default function BodycamPanel() {
  const officer = useOfficer();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [location, setLocation] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [recording]);

  function toggle() {
    if (recording) {
      setRecording(false);
    } else {
      setSeconds(0);
      setRecording(true);
    }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <FloatingPanel panelName="bodycam" title="BODYCAM" subtitle={officer?.badge || "—"} theme="maroon">
      <div className="bodycam-body">
        <div className="bodycam-top-row">
          {recording && <span className="bodycam-rec-dot" />}
          <span className="bodycam-rec-label">{recording ? "REC" : "STANDBY"}</span>
          <span className="bodycam-timer">{formatTime(seconds)}</span>
          <span className="bodycam-datetime">{dateStr} {timeStr}</span>
        </div>

        <div className="bodycam-officer-row">
          <span>{officer?.nickname || "—"}</span>
          <span className="sub">{officer?.rank} · {officer?.badge}</span>
        </div>

        <div className="bodycam-location-row">
          <MapPin size={12} />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Район / локация (для оверлея)"
          />
        </div>

        <button className={recording ? "danger" : ""} style={{ width: "100%", marginTop: 8 }} onClick={toggle}>
          {recording ? <Square size={13} style={{ marginRight: 6 }} /> : <Play size={13} style={{ marginRight: 6 }} />}
          {recording ? "Остановить" : "Начать запись"}
        </button>
        <div className="hint-text" style={{ marginTop: 6 }}>
          Не управляет самой записью в OBS — включайте запись там как обычно,
          это только визуальный таймер и подпись поверх кадра.
        </div>
      </div>
    </FloatingPanel>
  );
}
