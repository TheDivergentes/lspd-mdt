import React, { useEffect, useRef, useState } from "react";
import { Pencil, ArrowUpRight, Square, Type, Undo2, Save, X, FolderOpen } from "lucide-react";
import { api } from "../../api/electronApi";

type Phase = "loading" | "select" | "annotate" | "error";
type Tool = "pen" | "arrow" | "rect" | "text";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#ffffff", "#000000"];

interface Shot {
  dataUrl: string;
  width: number;
  height: number;
  scaleFactor: number;
}

export default function CaptureOverlay() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [shot, setShot] = useState<Shot | null>(null);

  // ---------- фаза выделения области ----------
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragging = useRef(false);

  // ---------- фаза разметки ----------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const undoStack = useRef<string[]>([]);
  const drawing = useRef(false);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  useEffect(() => {
    api().captureStart().then((res) => {
      if (res.ok && res.dataUrl) {
        setShot({ dataUrl: res.dataUrl, width: res.width!, height: res.height!, scaleFactor: res.scaleFactor || 1 });
        setPhase("select");
      } else {
        setError(res.error || "Не удалось сделать снимок экрана");
        setPhase("error");
      }
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") api().captureCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- выделение области ----------
  function onMouseDown(e: React.MouseEvent) {
    if (phase !== "select") return;
    dragging.current = true;
    setDrag({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !drag) return;
    setDrag({ ...drag, x1: e.clientX, y1: e.clientY });
  }
  function onMouseUp() {
    if (!dragging.current || !drag) return;
    dragging.current = false;
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    if (w < 15 || h < 15) { setDrag(null); return; } // слишком маленькая область — игнорируем
    cropAndAnnotate(drag);
  }

  function cropAndAnnotate(rect: { x0: number; y0: number; x1: number; y1: number }) {
    if (!shot) return;
    const left = Math.min(rect.x0, rect.x1);
    const top = Math.min(rect.y0, rect.y1);
    const w = Math.abs(rect.x1 - rect.x0);
    const h = Math.abs(rect.y1 - rect.y0);

    const img = new Image();
    img.onload = () => {
      const sf = shot.scaleFactor;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * sf);
      canvas.height = Math.round(h * sf);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, left * sf, top * sf, w * sf, h * sf, 0, 0, canvas.width, canvas.height);
      const cropped = canvas.toDataURL();
      undoStack.current = [];
      setPhase("annotate");
      // рисуем кроп на реальный canvas разметки после смены фазы
      requestAnimationFrame(() => {
        const target = canvasRef.current;
        if (!target) return;
        target.width = canvas.width;
        target.height = canvas.height;
        const tctx = target.getContext("2d")!;
        const croppedImg = new Image();
        croppedImg.onload = () => tctx.drawImage(croppedImg, 0, 0);
        croppedImg.src = cropped;
      });
    };
    img.src = shot.dataUrl;
  }

  // ---------- разметка ----------
  function pushUndo() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
  }

  function undo() {
    const canvas = canvasRef.current;
    if (!canvas || !undoStack.current.length) return;
    const last = undoStack.current.pop()!;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = last;
  }

  function canvasPos(e: React.MouseEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function drawArrowHead(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 18;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = canvasPos(e);

    if (tool === "text") {
      const text = prompt("Текст пометки:");
      if (text) {
        pushUndo();
        const ctx = canvas.getContext("2d")!;
        ctx.font = "28px sans-serif";
        ctx.fillStyle = color;
        ctx.fillText(text, pos.x, pos.y);
      }
      return;
    }

    pushUndo();
    drawing.current = true;
    shapeStart.current = pos;

    if (tool === "pen") {
      const ctx = canvas.getContext("2d")!;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!drawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const pos = canvasPos(e);

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }

    // rect/arrow — на каждом движении восстанавливаем состояние "до
    // фигуры" и рисуем предпросмотр поверх, иначе фигуры будут "тащиться"
    const before = undoStack.current[undoStack.current.length - 1];
    if (!before || !shapeStart.current) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      if (tool === "rect") {
        ctx.strokeRect(
          shapeStart.current!.x, shapeStart.current!.y,
          pos.x - shapeStart.current!.x, pos.y - shapeStart.current!.y
        );
      } else if (tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(shapeStart.current!.x, shapeStart.current!.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        drawArrowHead(ctx, shapeStart.current!, pos);
      }
    };
    img.src = before;
  }

  function onCanvasMouseUp() {
    drawing.current = false;
    shapeStart.current = null;
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const res = await api().captureSave(dataUrl);
    if (res.ok && res.filePath) setSavedPath(res.filePath);
  }

  const boxStyle = drag
    ? {
        position: "fixed" as const,
        left: Math.min(drag.x0, drag.x1),
        top: Math.min(drag.y0, drag.y1),
        width: Math.abs(drag.x1 - drag.x0),
        height: Math.abs(drag.y1 - drag.y0),
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        border: "1px dashed #fff",
        pointerEvents: "none" as const
      }
    : undefined;

  if (phase === "loading") return <div className="capture-loading">Делаю снимок экрана…</div>;
  if (phase === "error") return <div className="capture-loading error-text">{error}</div>;

  if (phase === "select") {
    return (
      <div
        className="capture-select-root"
        style={{ backgroundImage: shot ? `url(${shot.dataUrl})` : undefined }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {!drag && <div className="capture-hint">Выделите область мышью · Esc — отмена</div>}
        {drag && <div style={boxStyle} />}
      </div>
    );
  }

  // phase === "annotate"
  return (
    <div className="capture-annotate-root">
      <div className="capture-toolbar">
        <button className={`capture-tool ${tool === "pen" ? "active" : ""}`} onClick={() => setTool("pen")} title="Карандаш"><Pencil size={16} /></button>
        <button className={`capture-tool ${tool === "arrow" ? "active" : ""}`} onClick={() => setTool("arrow")} title="Стрелка"><ArrowUpRight size={16} /></button>
        <button className={`capture-tool ${tool === "rect" ? "active" : ""}`} onClick={() => setTool("rect")} title="Прямоугольник"><Square size={16} /></button>
        <button className={`capture-tool ${tool === "text" ? "active" : ""}`} onClick={() => setTool("text")} title="Текст"><Type size={16} /></button>
        <div className="capture-colors">
          {COLORS.map((c) => (
            <span key={c} className={`capture-color-dot ${color === c ? "active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <button className="capture-tool" onClick={undo} title="Отменить"><Undo2 size={16} /></button>
        <div style={{ flex: 1 }} />
        <button onClick={save}><Save size={14} style={{ marginRight: 6 }} />Сохранить</button>
        <button className="secondary" onClick={() => api().captureCancel()}><X size={14} style={{ marginRight: 6 }} />Закрыть</button>
      </div>

      <div className="capture-canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
        />
      </div>

      {savedPath && (
        <div className="capture-saved-toast">
          Сохранено: {savedPath}
          <button className="secondary" style={{ marginLeft: 10 }} onClick={() => api().captureOpenFolder(savedPath)}>
            <FolderOpen size={13} style={{ marginRight: 6 }} />Открыть папку
          </button>
          <button className="secondary" style={{ marginLeft: 10 }} onClick={() => api().captureCancel()}>Закрыть</button>
        </div>
      )}
    </div>
  );
}
