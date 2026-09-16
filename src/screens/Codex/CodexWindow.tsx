import React, { useEffect, useState } from "react";
import {
  Search, BookOpen, Shield, Radio, Wrench, Info, Zap, Car,
  Clock, ChevronRight, Star, Plus, X, Lightbulb, Gavel, DollarSign, ListChecks, Link2, Pencil, Trash2
} from "lucide-react";
import { api } from "../../api/electronApi";
import type { CodexArticle, ForumEntry } from "../../api/electronApi";
import FloatingPanel from "../../components/FloatingPanel";
import { useOfficer } from "../../state/useOfficer";

interface UnifiedArticle {
  section: string;
  threadId?: string;
  id: string;
  title: string;
  category: string;
  description: string;
  penalty?: string;
  fine?: string;
  confiscation?: string;
  keySigns: string[];
  related: string;
  url?: string;
}

function fromForumEntry(e: ForumEntry): UnifiedArticle {
  const m = e.title.match(/^§\s*([^\s—]+)\s*—\s*(.*)$/);
  return {
    section: e.fields["Раздел"] || "Кодекс",
    threadId: e.threadId,
    id: m ? m[1] : e.title,
    title: m ? m[2] : e.title,
    category: e.fields["Категория"] || "—",
    description: e.fields["Описание"] || "—",
    penalty: e.fields["Наказание (мес.)"],
    fine: e.fields["Штраф"],
    confiscation: e.fields["Конфискация"],
    keySigns: (e.fields["Ключевые признаки"] || "").split(/\n|;/).map((s) => s.trim()).filter(Boolean),
    related: e.fields["Смежные статьи"] || "—",
    url: e.url
  };
}

function fromLocal(a: CodexArticle): UnifiedArticle {
  return {
    section: "Кодекс",
    id: a.id,
    title: a.title,
    category: a.category,
    description: a.description,
    penalty: `${a.penaltyMonths} месяцев`,
    fine: `$${a.penaltyFine.toLocaleString()}`,
    confiscation: a.confiscation ? "Да" : "Нет",
    keySigns: a.keySigns,
    related: a.related.length ? a.related.map((r) => `§ ${r}`).join(", ") : "—"
  };
}

const POPULAR = ["драка", "оружие", "наркотики", "украл машину", "ехал без прав", "стрельба", "побег", "неповиновение"];

// Разделы памятки. Значение key пишется в поле "Раздел" у записи,
// поэтому в любой раздел можно добавлять свои заметки — не только в Кодекс.
const NAV = [
  { key: "Кодекс", label: "Кодекс", icon: BookOpen },
  { key: "Процедуры", label: "Процедуры", icon: Shield },
  { key: "Радио и команды", label: "Радио / Команды", icon: Radio },
  { key: "Инструменты", label: "Инструменты", icon: Wrench },
  { key: "Полезная информация", label: "Полезная информация", icon: Info }
];

// Совпадение по названию/описанию — грубая оценка релевантности для UI.
function matchScore(a: UnifiedArticle, q: string): number {
  if (!q) return 0;
  const query = q.toLowerCase();
  const title = a.title.toLowerCase();
  if (title.includes(query)) return 96;
  const words = query.split(/\s+/).filter(Boolean);
  const hits = words.filter((w) => `${title} ${a.description.toLowerCase()}`.includes(w)).length;
  return words.length ? Math.round((hits / words.length) * 80) : 0;
}

export default function CodexWindow() {
  const officer = useOfficer();
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<UnifiedArticle[]>([]);
  const [demoNotice, setDemoNotice] = useState(false);
  const [demoResults, setDemoResults] = useState<UnifiedArticle[]>([]);
  const [selected, setSelected] = useState<UnifiedArticle | null>(null);
  const [recent, setRecent] = useState<UnifiedArticle[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [nav, setNav] = useState("Кодекс");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [catNewName, setCatNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    section: "Кодекс", articleId: "", title: "", category: "", penaltyMonths: "", penaltyFine: "",
    confiscation: false, description: "", keySigns: "", related: ""
  });

  async function loadRemote() {
    const res = await api().listCodex();
    if (res.ok) {
      setRemote(res.items.map(fromForumEntry));
      setDemoNotice(false);
    } else {
      setDemoNotice(true);
    }
  }

  useEffect(() => { loadRemote(); }, []);

  useEffect(() => {
    if (demoNotice) api().searchCodex("").then((r) => setDemoResults(r.map(fromLocal)));
  }, [demoNotice]);

  const all = demoNotice ? demoResults : remote;
  // Сначала раздел, затем категория внутри него
  const source = all.filter((a) => a.section === nav);
  const visible = activeCategory ? source.filter((a) => a.category === activeCategory) : source;

  // Категории собираются из самих записей раздела — отдельного справочника не нужно
  const categories: string[] = Array.from(new Set(source.map((a) => a.category).filter((c) => c && c !== "—")));
  const allCategories: string[] = Array.from(new Set(all.map((a) => a.category).filter((c) => c && c !== "—")));

  const results = query
    ? visible
        .map((a) => ({ a, score: matchScore(a, query) }))
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score)
    : visible.map((a) => ({ a, score: 0 }));

  function openArticle(a: UnifiedArticle) {
    setSelected(a);
    setRecent((prev) => [a, ...prev.filter((p) => p.id !== a.id)].slice(0, 3));
  }

  // Автовыбор первой статьи, чтобы правая колонка не пустовала при открытии
  useEffect(() => {
    if (!selected && results.length) setSelected(results[0].a);
  }, [results, selected]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      penaltyMonths: form.penaltyMonths ? Number(form.penaltyMonths) : undefined,
      penaltyFine: form.penaltyFine ? Number(form.penaltyFine) : undefined
    };
    const res = editingThreadId
      ? await api().updateCodexArticle(editingThreadId, payload)
      : await api().createCodexArticle(payload);
    setSaving(false);
    if (res.ok) {
      closeForm();
      loadRemote();
    } else {
      setFormError(res.error || "Не удалось сохранить статью");
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingThreadId(null);
    setForm({ section: nav, articleId: "", title: "", category: "", penaltyMonths: "", penaltyFine: "", confiscation: false, description: "", keySigns: "", related: "" });
  }

  // Открыть форму в режиме редактирования выбранной статьи
  function startEdit(a: UnifiedArticle) {
    if (!a.threadId) {
      setFormError("Редактирование доступно только для записей из Discord-канала");
      return;
    }
    setEditingThreadId(a.threadId);
    setForm({
      section: a.section,
      articleId: a.id,
      title: a.title,
      category: a.category === "—" ? "" : a.category,
      penaltyMonths: (a.penalty || "").replace(/\D/g, ""),
      penaltyFine: (a.fine || "").replace(/\D/g, ""),
      confiscation: a.confiscation === "Да",
      description: a.description === "—" ? "" : a.description,
      keySigns: a.keySigns.join("\n"),
      related: a.related === "—" ? "" : a.related
    });
    setShowForm(true);
  }

  async function removeArticle(a: UnifiedArticle) {
    if (!a.threadId) return;
    if (!confirm(`Удалить запись «${a.title}» из Discord? Действие необратимо.`)) return;
    const res = await api().deleteCodexArticle(a.threadId);
    if (res.ok) {
      setSelected(null);
      loadRemote();
    } else {
      setFormError(res.error || "Не удалось удалить");
    }
  }

  async function renameCategory(oldName: string) {
    if (!catNewName.trim() || catNewName === oldName) {
      setRenamingCat(null);
      return;
    }
    const res = await api().renameCodexCategory(oldName, catNewName.trim());
    setRenamingCat(null);
    setCatNewName("");
    if (res.ok) {
      if (activeCategory === oldName) setActiveCategory(catNewName.trim());
      loadRemote();
    }
  }

  return (
    <FloatingPanel
      panelName="codex"
      title="ПАМЯТКА СОТРУДНИКА"
      subtitle="LSPD · Правила • Кодекс • Процедуры"
      theme="maroon"
      icon={<BookOpen size={16} />}
      headerRight={<span className="sub" style={{ fontSize: 11 }}>Служить и защищать</span>}
    >
      {demoNotice && (
        <div className="hint-text" style={{ marginBottom: 10 }}>
          Форум-канал «Памятка» не настроен — показаны демо-статьи. Укажите ID
          канала в Настройках, чтобы добавлять статьи прямо отсюда.
        </div>
      )}

      <div className="codex-layout">
        {/* ---------- Левая колонка: навигация ---------- */}
        <div className="codex-col">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.key}>
                <div className={`codex-nav-item ${nav === n.key ? "active" : ""}`} onClick={() => setNav(n.key)}>
                  <Icon size={14} />
                  <span style={{ flex: 1 }}>{n.label}</span>
                  <ChevronRight size={13} />
                </div>
                {nav === n.key && (
                  <div style={{ marginBottom: 6 }}>
                    <div
                      className={`codex-nav-sub ${!activeCategory ? "active" : ""}`}
                      onClick={() => { setActiveCategory(null); setQuery(""); }}
                    >
                      Все записи ({source.length})
                    </div>
                    <div className="codex-nav-sub" style={{ opacity: 0.7 }}>Категории</div>
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        className={`codex-cat-row ${activeCategory === cat ? "active" : ""}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {renamingCat === cat ? (
                          <input
                            autoFocus
                            value={catNewName}
                            onChange={(e) => setCatNewName(e.target.value)}
                            onBlur={() => renameCategory(cat)}
                            onKeyDown={(e) => e.key === "Enter" && renameCategory(cat)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: 11, padding: "3px 6px" }}
                          />
                        ) : (
                          <>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{cat}</span>
                            <span className="codex-cat-count">
                              {source.filter((a) => a.category === cat).length}
                            </span>
                            {!demoNotice && officer?.canManage && (
                              <Pencil
                                size={11}
                                className="codex-cat-edit"
                                onClick={(e) => { e.stopPropagation(); setRenamingCat(cat); setCatNewName(cat); }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    <div className="codex-nav-sub">Избранное ({favorites.length})</div>
                    <div className="codex-nav-sub">Последние ({recent.length})</div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="codex-quickaccess">
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--orange)", marginBottom: 5 }}>
              <Lightbulb size={13} /> <b style={{ fontSize: 11 }}>Быстрый доступ</b>
            </div>
            Используй поиск, чтобы быстро найти нужную статью по ключевым словам.
          </div>
        </div>

        {/* ---------- Центральная колонка: поиск и результаты ---------- */}
        <div className="codex-col">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--text-dim)" }} />
              <input
                style={{ paddingLeft: 33, paddingRight: 30 }}
                placeholder="Поиск по статьям…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <X size={14} onClick={() => setQuery("")}
                  style={{ position: "absolute", right: 10, top: 11, cursor: "pointer", color: "var(--text-dim)" }} />
              )}
            </div>
            {!demoNotice ? (
              <button onClick={() => (showForm ? closeForm() : setShowForm(true))} title="Добавить статью">
                {showForm ? <X size={14} /> : <Plus size={14} />}
              </button>
            ) : (
              <button
                className="secondary"
                title="Доступно после указания ID форум-канала «Памятка» в Настройках"
                onClick={() => setFormError("Укажите ID форум-канала «Памятка» в Настройках, чтобы добавлять статьи.")}
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {formError && !showForm && <div className="error-text">{formError}</div>}

          {showForm ? (
            <form onSubmit={handleCreate} style={{ marginTop: 14 }}>
              <div className="codex-section-label">
                {editingThreadId ? <><Pencil size={13} /> Редактирование статьи</> : <><Plus size={13} /> Новая статья</>}
              </div>
              <div className="field">
                <label>Раздел</label>
                <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                  {NAV.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Номер (необязательно для заметок)</label>
                <input value={form.articleId} onChange={(e) => setForm({ ...form, articleId: e.target.value })} placeholder="4.15" />
              </div>
              <div className="field"><label>Название</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="field">
                <label>Категория</label>
                <input
                  list="codex-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Выберите существующую или впишите новую"
                />
                <datalist id="codex-categories">
                  {allCategories.map((c) => <option key={c} value={c} />)}
                </datalist>
                <div className="hint-text">Новая категория создаётся простым вводом названия.</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="field" style={{ flex: 1 }}><label>Наказание, мес.</label><input type="number" value={form.penaltyMonths} onChange={(e) => setForm({ ...form, penaltyMonths: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}><label>Штраф, $</label><input type="number" value={form.penaltyFine} onChange={(e) => setForm({ ...form, penaltyFine: e.target.value })} /></div>
              </div>
              <div className="field">
                <label><input type="checkbox" style={{ width: "auto", marginRight: 7 }} checked={form.confiscation} onChange={(e) => setForm({ ...form, confiscation: e.target.checked })} />Конфискация ТС</label>
              </div>
              <div className="field"><label>Описание</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="field"><label>Ключевые признаки (по одному на строку)</label><textarea rows={3} value={form.keySigns} onChange={(e) => setForm({ ...form, keySigns: e.target.value })} /></div>
              <div className="field"><label>Смежные статьи</label><input value={form.related} onChange={(e) => setForm({ ...form, related: e.target.value })} placeholder="§ 4.11, § 4.13" /></div>
              {formError && <div className="error-text">{formError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={saving}>
                  {saving ? "Отправка в Discord…" : editingThreadId ? "Сохранить изменения" : "Сохранить статью"}
                </button>
                <button type="button" className="secondary" onClick={closeForm}>Отмена</button>
              </div>
            </form>
          ) : (
            <>
              <div className="codex-section-label">
                <Zap size={13} style={{ color: "var(--orange)" }} />
                {query ? `Результаты поиска (${results.length})` : `${activeCategory || nav} (${results.length})`}
              </div>
              {results.map(({ a, score }) => (
                <div key={a.id} className={`codex-result ${selected?.id === a.id ? "active" : ""}`} onClick={() => openArticle(a)}>
                  <span className="codex-result-icon"><Car size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="codex-result-title"><b>§ {a.id}</b> — {a.title}</div>
                    <div className="codex-result-cat">{a.category}</div>
                  </div>
                  {score > 0 && <span className="codex-match">Совпадение: {score}%</span>}
                  <ChevronRight size={14} style={{ color: "var(--text-dim)" }} />
                </div>
              ))}
              {!results.length && <div className="sub">Ничего не найдено.</div>}

              <div className="codex-section-label"><Star size={13} style={{ color: "var(--orange)" }} /> Популярные запросы</div>
              <div className="codex-chips">
                {POPULAR.map((p) => (
                  <span key={p} className="codex-chip" onClick={() => setQuery(p)}>{p}</span>
                ))}
              </div>

              {!!recent.length && (
                <>
                  <div className="codex-section-label"><Clock size={13} /> Последние просмотренные</div>
                  {recent.map((r) => (
                    <div key={r.id} className="codex-recent" onClick={() => openArticle(r)}>
                      <BookOpen size={13} />
                      <span style={{ flex: 1 }}>§ {r.id} — {r.title}</span>
                      <ChevronRight size={13} />
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* ---------- Правая колонка: статья ---------- */}
        <div className="codex-col">
          {selected ? (
            <div>
              <div className="codex-breadcrumb">Кодекс › {selected.category}</div>
              <div className="codex-article-num">§ {selected.id}</div>
              <div className="codex-article-title">{selected.title}</div>
              <div className="codex-tag"><Car size={12} /> {selected.category}</div>

              <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 0 }}>{selected.description}</p>

              <div className="codex-block">
                <div className="codex-block-title"><Gavel size={13} /> Наказание (основное)</div>
                <div className="codex-penalty-row">
                  <span className="codex-penalty-value">{selected.penalty || "—"}</span>
                  <span className="codex-penalty-value" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <DollarSign size={14} style={{ color: "var(--text-dim)" }} />{selected.fine || "—"}
                  </span>
                </div>
                <div className="codex-block-title" style={{ marginTop: 11, marginBottom: 4 }}>Дополнительно</div>
                <div style={{ fontSize: 13 }}>Конфискация ТС: {selected.confiscation || "—"}</div>
              </div>

              {!!selected.keySigns.length && (
                <div className="codex-block">
                  <div className="codex-block-title"><ListChecks size={13} /> Ключевые признаки</div>
                  <ul style={{ margin: 0, paddingLeft: 17, fontSize: 13, lineHeight: 1.7 }}>
                    {selected.keySigns.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <div className="codex-block">
                <div className="codex-block-title"><Link2 size={13} /> Ссылки на смежные статьи</div>
                <div style={{ fontSize: 13 }}>{selected.related}</div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Plus size={13} /> В протокол
                </button>
                {!demoNotice && officer?.canManage && (
                  <>
                    <button
                      className="secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      onClick={() => startEdit(selected)}
                      title="Редактировать запись"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      onClick={() => removeArticle(selected)}
                      title="Удалить запись"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
                <button
                  className="secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={() => toggleFavorite(selected.id)}
                >
                  <Star size={13} fill={favorites.includes(selected.id) ? "currentColor" : "none"} />
                </button>
              </div>

              {selected.url && (
                <div className="codex-link" style={{ marginTop: 10 }} onClick={() => api().openExternal(selected.url!)}>
                  Открыть тред в Discord ↗
                </div>
              )}
            </div>
          ) : (
            <div className="sub">Выберите статью в списке.</div>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
}
