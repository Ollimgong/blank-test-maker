import { useState, useEffect, useRef } from "react";

/* ═══════ helpers ═══════ */
const uid = () => Math.random().toString(36).slice(2, 10);
const TAG_LIST = [
  { v: "", label: "태그 없음", c: "#d1d5db", tx: "#6b7280" },
  { v: "개념", label: "개념", c: "#3B82F6", tx: "#fff" },
  { v: "형태", label: "형태", c: "#F59E0B", tx: "#fff" },
  { v: "예문", label: "예문", c: "#22C55E", tx: "#fff" },
  { v: "종류", label: "종류", c: "#EF4444", tx: "#fff" },
  { v: "주의", label: "주의", c: "#E11D48", tx: "#fff" },
  { v: "예시", label: "예시", c: "#14B8A6", tx: "#fff" },
  { v: "형태1", label: "형태1", c: "#F97316", tx: "#fff" },
  { v: "형태2", label: "형태2", c: "#F97316", tx: "#fff" },
  { v: "형태3", label: "형태3", c: "#F97316", tx: "#fff" },
];
const PTAG_LIST = [
  { v: "", label: "—" },
  { v: "영작", label: "[영작]" },
  { v: "수동태", label: "[수동태]" },
  { v: "(1)", label: "(1)" },
  { v: "(2)", label: "(2)" },
];
const tagColor = (v) => TAG_LIST.find((t) => t.v === v) || TAG_LIST[0];
const emptyRow = () => ({
  id: uid(),
  l: { tag: "", text: "", ans: false, bold: false, hdr: false },
  r: { num: "", ptag: "", text: "", ans: false, bold: false, hdr: false },
});

/* ═══════ row helpers ═══════ */
const TOTAL_ROWS = 30; // A4 fixed row count
const padRows = (rows) => {
  if (rows.length >= TOTAL_ROWS) return rows.slice(0, TOTAL_ROWS);
  return [...rows, ...Array.from({ length: TOTAL_ROWS - rows.length }, emptyRow)];
};

/* ═══════ default data ═══════ */
const mk = (ld, rd) => ({
  id: uid(),
  l: { tag: ld.t || "", text: ld.x || "", ans: !!ld.a, bold: !!ld.b },
  r: { num: rd.n || "", ptag: rd.p || "", text: rd.x || "", ans: !!rd.a, bold: !!rd.b },
});

const hdrRow = (lText, rText) => ({
  id: uid(),
  l: { tag: "", text: lText, ans: false, bold: false, hdr: true },
  r: { num: "", ptag: "", text: rText, ans: false, bold: false, hdr: true },
});

const PASSIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "능동: 주어가 동사를 직접 함", a: 1 }, { x: "영작 & 수동태 전환 연습", b: 1 }),
  mk({ x: "수동: 주어가 동사를 다른 행위자에 의해 당함", a: 1 }, { n: "1", x: "나의 친구들은 나를 사랑한다." }),
  mk({}, { p: "영작", x: "My friends love me.", a: 1 }),
  mk({ x: "능동태 -> 수동태 전환방법", b: 1 }, { p: "수동태", x: "I am loved by my friends.", a: 1 }),
  mk({ t: "예문", x: "She wrote a letter.", a: 1 }, { n: "2", x: "나는 접시들을 씻는다." }),
  mk({ x: "1) 능동태의 주어, 동사, 목적어를 찾는다.", a: 1 }, { p: "영작", x: "I wash the dishes.", a: 1 }),
  mk({ x: "=> 주어: She / 동사: wrote / 목적어: a letter", a: 1 }, { p: "수동태", x: "The dishes are washed by me.", a: 1 }),
  mk({ x: "2) 능동태의 시제를 파악한다.", a: 1 }, { n: "3", x: "그는 창문을 닫았다." }),
  mk({ x: "=> 과거", a: 1 }, { p: "영작", x: "He closed the window.", a: 1 }),
  mk({ x: "3) 능동태의 목적어를 수동태의 주어 자리에 쓴다.", a: 1 }, { p: "수동태", x: "The window was closed by him.", a: 1 }),
  mk({ x: "=> A letter", a: 1 }, { n: "4", x: "Joy는 컵들을 깼다." }),
  mk({ x: "4) be동사를 수/시제에 맞게 쓴다.", a: 1 }, { p: "영작", x: "Joy broke the cups.", a: 1 }),
  mk({ x: "=> A letter was", a: 1 }, { p: "수동태", x: "The cups were broken by Joy.", a: 1 }),
  mk({ x: "5) 동사를 p.p형태로 바꾼다.", a: 1 }, { n: "5", x: "그녀는 파티를 개최할 것이다." }),
  mk({ x: "=> A letter was written", a: 1 }, { p: "영작", x: "She will hold a party.", a: 1 }),
  mk({ x: "6) by + 원래 주어를 목적격으로 쓴다.", a: 1 }, { p: "수동태", x: "A party will be held by her.", a: 1 }),
  mk({ x: "=> A letter was written by her.", a: 1 }, { n: "6", x: "할머니는 케이크를 구울 것이다." }),
  mk({ t: "주의", x: "A letter was written by she. (X)", a: 1 }, { p: "영작", x: "Grandma will bake the cake.", a: 1 }),
  mk({}, { p: "수동태", x: "The cake will be baked by Grandma.", a: 1 }),
  mk({ x: "by + 목적격의 생략", b: 1 }, { n: "7", x: "사람들은 미국에서 영어를 말한다." }),
  mk({ t: "개념", x: "행위자가 분명하지 않거나 중요하지 않을 때", a: 1 }, { p: "영작", x: "People speak English in America.", a: 1 }),
  mk({ x: "by + 목적격은 생략할 수 있다", a: 1 }, { p: "수동태", x: "English is spoken in America.", a: 1 }),
  mk({ t: "예문", x: "Someone planted the tree in 1995.", a: 1 }, {}),
  mk({ x: "=> The tree was planted in 1995.", a: 1 }, {}),
];

const RELATIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "관계대명사는 [접속사 + 대명사] 의 역할을 하며", a: 1 }, { x: "영작연습", b: 1 }),
  mk({ x: "관계대명사가 이끄는 절은 앞의 명사(선행사)를 수식한다", a: 1 }, { n: "1", x: "나는 착한 소년을 안다." }),
  mk({ x: "주격관계대명사", b: 1 }, { p: "(1)", x: "I know a boy.", a: 1 }),
  mk({ t: "개념", x: "주격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { p: "(2)", x: "The boy is kind.", a: 1 }),
  mk({ x: "주어의 역할을 한다", a: 1 }, { x: "=> I know a boy ( who is kind ).", a: 1 }),
  mk({ t: "형태", x: "- 선행사가 사람일 때 : who", a: 1 }, { n: "2", x: "그는 내가 믿는 친구를 가지고 있다." }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { p: "(1)", x: "He has a friend.", a: 1 }),
  mk({ t: "예문", x: "She is a girl ( who likes pasta ).", a: 1 }, { p: "(2)", x: "I trust the friend.", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "=> He has a friend ( who(m) I trust ).", a: 1 }),
  mk({ t: "예문", x: "This is a house ( which is expensive ).", a: 1 }, { n: "3", x: "우리는 빠른 차를 봤다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { p: "(1)", x: "We saw a car.", a: 1 }),
  mk({ x: "목적격관계대명사", b: 1 }, { p: "(2)", x: "The car was fast.", a: 1 }),
  mk({ t: "개념", x: "목적격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> We saw a car ( which was fast ).", a: 1 }),
  mk({ x: "목적어의 역할을 한다", a: 1 }, { n: "4", x: "우리가 어제 만난 그 선생님은 착하다." }),
  mk({ t: "형태", x: "- 선행사가 사람일 때 : who / whom", a: 1 }, { p: "(1)", x: "The teacher is kind.", a: 1 }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { p: "(2)", x: "We met the teacher yesterday.", a: 1 }),
  mk({ t: "예문", x: "She is a girl ( who(m) I like ).", a: 1 }, { x: "=> The teacher ( who(m) we met yesterday )", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "is kind.", a: 1 }),
  mk({ t: "예문", x: "This is a house ( which Joy bought ).", a: 1 }, { n: "5", x: "그는 머리가 긴 소녀를 만났다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { p: "(1)", x: "He met a girl.", a: 1 }),
  mk({ x: "소유격관계대명사", b: 1 }, { p: "(2)", x: "Her hair is long.", a: 1 }),
  mk({ t: "개념", x: "소유격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> He met a girl ( whose hair is long ).", a: 1 }),
  mk({ x: "소유격 역할을 한다", a: 1 }, { n: "6", x: "그는 부산에서 일하는 의사를 안다." }),
  mk({ t: "형태", x: "선행사와 상관없이 whose", a: 1 }, { p: "(1)", x: "He knows a doctor.", a: 1 }),
  mk({ t: "예문", x: "She is a girl ( whose hair is long ).", a: 1 }, { p: "(2)", x: "The doctor works in Busan.", a: 1 }),
  mk({ t: "예문", x: "This is a house ( whose roof is red ).", a: 1 }, { x: "=> He knows a doctor ( who works in Busan ).", a: 1 }),
];

const DEFAULT_STATE = {
  groups: [{ id: "g1", name: "문법 기초", collapsed: false }],
  units: [
    { id: "u1", groupId: "g1", title: "수동태", rows: padRows(PASSIVE_ROWS) },
    { id: "u2", groupId: "g1", title: "관계대명사", rows: padRows(RELATIVE_ROWS) },
  ],
  settings: { logo: null, academyName: "" },
};

/* ═══════ TagPicker ═══════ */
function TagPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = tagColor(value);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: value ? "2px 8px" : "2px 6px", borderRadius: 4,
        border: value ? "none" : "1px dashed #ccc",
        background: value ? cur.c : "#f9fafb", color: value ? cur.tx : "#aaa",
        fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", minWidth: 38, justifyContent: "center",
      }}>{value || "태그"}<span style={{ fontSize: 7, opacity: 0.6 }}>▼</span></button>
      {open && (
        <div style={{
          position: "absolute", top: "110%", left: 0, zIndex: 50,
          background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,.18)",
          padding: 6, display: "flex", flexWrap: "wrap", gap: 4, width: 195, marginTop: 2,
        }}>
          {TAG_LIST.map((t) => (
            <button key={t.v} onClick={() => { onChange(t.v); setOpen(false); }} style={{
              padding: "3px 10px", borderRadius: 4, border: "none",
              background: t.v ? t.c : "#f3f4f6", color: t.v ? t.tx : "#6b7280",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              outline: value === t.v ? "2px solid #111" : "none", outlineOffset: 1,
            }}>{t.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════ EditorRow ═══════ */
function CellArrows({ onUp, onDown, first, last }) {
  const ab = { border: "none", background: "none", cursor: "pointer", padding: "1px 2px", lineHeight: 1, fontSize: 8, color: "#999" };
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0, gap: 1 }}>
      <button onClick={onUp} disabled={first} style={{ ...ab, opacity: first ? 0.15 : 0.7 }}>▲</button>
      <button onClick={onDown} disabled={last} style={{ ...ab, opacity: last ? 0.15 : 0.7 }}>▼</button>
    </div>
  );
}

function EditorRow({ row, onChange, onMoveLUp, onMoveLDown, onMoveRUp, onMoveRDown, first, last }) {
  const upd = (s, f, v) => onChange({ ...row, [s]: { ...row[s], [f]: v } });
  const tc = tagColor(row.l.tag);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
      background: "#e0e0e0", borderRadius: 5, marginBottom: 2,
    }}>
      {/* LEFT */}
      <div style={{
        background: row.l.hdr ? "#e8f5e9" : row.l.tag ? `${tc.c}0a` : "#fff", padding: "3px 4px",
        display: "flex", alignItems: "center", gap: 3,
        borderLeft: row.l.hdr ? "3px solid #16a34a" : row.l.tag ? `3px solid ${tc.c}` : "3px solid transparent",
      }}>
        <CellArrows onUp={onMoveLUp} onDown={onMoveLDown} first={first} last={last} />
        <TagPicker value={row.l.tag} onChange={(v) => upd("l", "tag", v)} />
        <input value={row.l.text} onChange={(e) => upd("l", "text", e.target.value)} placeholder="내용..."
          style={{ flex: 1, padding: "2px 5px", border: "1px solid #e5e7eb", borderRadius: 3, fontSize: 11.5, outline: "none", background: "#fff", minWidth: 0, fontWeight: row.l.bold ? 700 : 400 }} />
        <MiniBtn active={row.l.hdr} onClick={() => upd("l", "hdr", !row.l.hdr)} title="헤더" color="#16a34a" textColor="#fff">H</MiniBtn>
        <MiniBtn active={row.l.bold} onClick={() => upd("l", "bold", !row.l.bold)} title="굵게">B</MiniBtn>
        <MiniBtn active={row.l.ans} onClick={() => upd("l", "ans", !row.l.ans)} title="답안" color="#fbbf24" textColor="#78350f">답</MiniBtn>
      </div>
      {/* RIGHT */}
      <div style={{ background: row.r.hdr ? "#e8f5e9" : "#fff", padding: "3px 4px", display: "flex", alignItems: "center", gap: 3 }}>
        <CellArrows onUp={onMoveRUp} onDown={onMoveRDown} first={first} last={last} />
        <select value={row.r.num} onChange={(e) => upd("r", "num", e.target.value)}
          style={{ width: 32, padding: "1px", borderRadius: 3, fontSize: 11, fontWeight: 700, border: row.r.num ? "none" : "1px dashed #ccc", textAlign: "center", background: row.r.num ? "#16a34a" : "#f9fafb", color: row.r.num ? "#fff" : "#aaa", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
          <option value="">—</option>
          {[...Array(15)].map((_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
        </select>
        <select value={row.r.ptag} onChange={(e) => upd("r", "ptag", e.target.value)}
          style={{ padding: "1px 3px", borderRadius: 3, fontSize: 10.5, fontWeight: 600, border: row.r.ptag ? "1px solid #d1fae5" : "1px dashed #ccc", background: row.r.ptag ? "#f0fdf4" : "#f9fafb", color: row.r.ptag ? "#166534" : "#aaa", cursor: "pointer", minWidth: 46 }}>
          {PTAG_LIST.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <input value={row.r.text} onChange={(e) => upd("r", "text", e.target.value)} placeholder="내용..."
          style={{ flex: 1, padding: "2px 5px", border: "1px solid #e5e7eb", borderRadius: 3, fontSize: 11.5, outline: "none", background: "#fff", minWidth: 0, fontWeight: row.r.bold ? 700 : 400 }} />
        <MiniBtn active={row.r.hdr} onClick={() => upd("r", "hdr", !row.r.hdr)} title="헤더" color="#16a34a" textColor="#fff">H</MiniBtn>
        <MiniBtn active={row.r.bold} onClick={() => upd("r", "bold", !row.r.bold)} title="굵게">B</MiniBtn>
        <MiniBtn active={row.r.ans} onClick={() => upd("r", "ans", !row.r.ans)} title="답안" color="#fbbf24" textColor="#78350f">답</MiniBtn>
      </div>
    </div>
  );
}

function MiniBtn({ active, onClick, title, children, color, textColor }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 20, height: 20, border: "none", borderRadius: 3, cursor: "pointer",
      fontSize: 9.5, fontWeight: 800, flexShrink: 0, padding: 0, lineHeight: 1,
      background: active ? (color || "#1f2937") : "#f0f0f0",
      color: active ? (textColor || "#fff") : "#bbb",
    }}>{children}</button>
  );
}

/* ═══════ Preview ═══════ */
const ROW_H = 27; // fixed row height (px) — notebook-ruled feel
const CELL_STYLE = {
  height: ROW_H, maxHeight: ROW_H, overflow: "hidden",
  display: "flex", alignItems: "center", gap: 4,
  background: "#fff",
};
const TEXT_CLIP = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "100%" };

function Preview({ unit, isBlank, logo, academyName, scale = 1 }) {
  if (!unit) return <div style={{ padding: 40, color: "#bbb", textAlign: "center", fontSize: 13 }}>단원을 선택하세요</div>;
  return (
    <div id="print-wrapper" style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${100 / scale}%`, padding: "16px 12px" }}>
      <div id="print-area" style={{
        padding: "20px 28px", width: 740, maxWidth: "100%", boxSizing: "border-box", margin: "0 auto",
        fontFamily: "'Malgun Gothic','Noto Sans KR',sans-serif", background: "#fff",
        boxShadow: "0 2px 12px rgba(0,0,0,.1)", borderRadius: 3,
      }}>
        {/* Top: name/date + badge */}
        <div style={{ display: "flex", justifyContent: isBlank ? "space-between" : "flex-end", alignItems: "center", marginBottom: 2 }}>
          {isBlank && (
            <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "#222" }}>
              <span>이름 : <span style={{ display: "inline-block", borderBottom: "1px solid #222", width: 100, marginLeft: 4 }}>&nbsp;</span></span>
              <span>날짜 : <span style={{ display: "inline-block", borderBottom: "1px solid #222", width: 80, marginLeft: 4 }}>&nbsp;</span></span>
            </div>
          )}
          <div style={{ display: "flex" }}>
            {["백", "지", "테", "스", "트"].map((c, i) => (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 24, color: "#fff", fontWeight: 800, fontSize: 11,
                background: i % 2 === 0 ? "#16a34a" : "#1e7a3e",
                borderRadius: i === 0 ? "3px 0 0 3px" : i === 4 ? "0 3px 3px 0" : 0,
              }}>{c}</span>
            ))}
          </div>
        </div>
        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 14px", color: "#111", letterSpacing: -0.5 }}>{unit.title}</h1>
        {/* Table */}
        <div style={{ border: "2px solid #16a34a", borderRadius: 4, overflow: "hidden" }}>
          {/* Content rows — fixed height, no expansion */}
          {unit.rows.map((row, i) => {
            const isHdrL = row.l.hdr;
            const isHdrR = row.r.hdr;
            const isHdrRow = isHdrL || isHdrR;
            const showL = !isBlank || !row.l.ans;
            const showR = !isBlank || !row.r.ans;
            const tc = tagColor(row.l.tag);
            const emptyL = !row.l.tag && !row.l.text && !isHdrL;
            const emptyR = !row.r.num && !row.r.ptag && !row.r.text && !isHdrR;
            const HDR_STYLE = { padding: "0 12px", display: "flex", alignItems: "center", fontWeight: 800, fontSize: 12, color: "#16a34a", letterSpacing: 2, background: "#e8f5e9", height: ROW_H, maxHeight: ROW_H, overflow: "hidden" };
            // border: thick green only between hdr and non-hdr rows
            const nextRow = unit.rows[i + 1];
            const nextIsHdr = nextRow && (nextRow.l.hdr || nextRow.r.hdr);
            const hdrBoundary = (isHdrRow && !nextIsHdr) || (!isHdrRow && nextIsHdr);
            const btmBorder = i >= unit.rows.length - 1 ? "none" : hdrBoundary ? "2px solid #16a34a" : "1px solid #e5e7eb";
            return (
              <div key={row.id} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                borderBottom: btmBorder,
              }}>
                {/* Left cell */}
                {isHdrL ? (
                  <div style={HDR_STYLE}>
                    <span style={{ ...TEXT_CLIP }}>{row.l.text}</span>
                  </div>
                ) : (
                  <div style={{ ...CELL_STYLE, padding: "0 10px", background: emptyL ? "#fafafa" : "#fff" }}>
                    {row.l.tag && (
                      <span style={{
                        display: "inline-block", padding: "1px 7px", borderRadius: 3,
                        background: tc.c, color: tc.tx, fontSize: 9.5, fontWeight: 700, flexShrink: 0, lineHeight: "16px",
                      }}>{row.l.tag}</span>
                    )}
                    {showL && row.l.text && (
                      <span style={{
                        ...TEXT_CLIP, fontSize: 12, color: "#1f2937", lineHeight: `${ROW_H}px`,
                        fontWeight: row.l.bold ? 700 : 400,
                        textDecoration: row.l.bold ? "underline" : "none",
                        textUnderlineOffset: 3, textDecorationColor: "#aaa",
                      }}>{row.l.text}</span>
                    )}
                  </div>
                )}
                {/* Right cell */}
                {isHdrR ? (
                  <div style={{ ...HDR_STYLE, borderLeft: "2px solid #16a34a" }}>
                    <span style={{ ...TEXT_CLIP }}>{row.r.text}</span>
                  </div>
                ) : (
                  <div style={{ ...CELL_STYLE, padding: "0 10px", borderLeft: "2px solid #16a34a", background: emptyR ? "#fafafa" : "#fff" }}>
                    {row.r.num && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 18, height: 18, borderRadius: "50%", background: "#16a34a",
                        color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>{row.r.num}</span>
                    )}
                    {row.r.ptag && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", flexShrink: 0 }}>
                        {row.r.ptag === "영작" || row.r.ptag === "수동태" ? `[${row.r.ptag}]` : row.r.ptag}
                      </span>
                    )}
                    {showR && row.r.text && (
                      <span style={{
                        ...TEXT_CLIP, fontSize: 12, color: "#1f2937", lineHeight: `${ROW_H}px`,
                        fontWeight: row.r.bold ? 700 : 400,
                      }}>{row.r.text}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer: logo + academy */}
        {(logo || academyName) && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 }}>
            {logo && <img src={logo} style={{ height: 36, objectFit: "contain" }} alt="" />}
            {academyName && <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>{academyName}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════ UnitItem ═══════ */
function UnitItem({ u, active, onSelect, onDup, onDel, groups, onMove }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [menu]);
  return (
    <div onClick={onSelect} style={{
      padding: "6px 8px 6px 20px", borderRadius: 4, cursor: "pointer", marginBottom: 1,
      background: active ? "#f0fdf4" : "transparent", border: active ? "1px solid #bbf7d0" : "1px solid transparent",
      display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.title}</div>
        <div style={{ fontSize: 9.5, color: "#aaa" }}>{u.rows.length}행</div>
      </div>
      <div ref={ref} style={{ position: "relative" }}>
        <button onClick={(e) => { e.stopPropagation(); setMenu(!menu); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#aaa", padding: "2px 4px" }}>⋯</button>
        {menu && (
          <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,.15)", padding: 4, zIndex: 30, minWidth: 120 }}>
            <MItem onClick={() => { onDup(); setMenu(false); }}>📋 복제</MItem>
            <MItem onClick={() => { onDel(); setMenu(false); }}>🗑 삭제</MItem>
            <div style={{ height: 1, background: "#eee", margin: "3px 0" }} />
            <div style={{ padding: "3px 8px", fontSize: 9.5, color: "#aaa", fontWeight: 600 }}>그룹 이동</div>
            <MItem onClick={() => { onMove(null); setMenu(false); }}>미분류</MItem>
            {groups.map((g) => <MItem key={g.id} onClick={() => { onMove(g.id); setMenu(false); }}>{g.name}</MItem>)}
          </div>
        )}
      </div>
    </div>
  );
}
function MItem({ onClick, children }) {
  const [hover, setHover] = useState(false);
  return <button onClick={(e) => { e.stopPropagation(); onClick(); }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: "block", width: "100%", padding: "4px 10px", border: "none", background: hover ? "#f3f4f6" : "none", textAlign: "left", fontSize: 11.5, cursor: "pointer", borderRadius: 3, color: "#374151" }}>{children}</button>;
}

/* ═══════ MAIN APP ═══════ */
export default function App() {
  const [data, setData] = useState(DEFAULT_STATE);
  const [curId, setCurId] = useState(DEFAULT_STATE.units[0]?.id || null);
  const [previewMode, setPreviewMode] = useState("answer");
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState(null);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGrp, setNewGrp] = useState("");

  const unit = data.units.find((u) => u.id === curId) || null;

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("bt-v3");
        if (r?.value) {
          const p = JSON.parse(r.value);
          if (p.units) {
            // migrate: headerL/headerR → first hdr row, pad to 28 rows
            p.units = p.units.map((u) => {
              if (u.headerL || u.headerR) {
                const hasHdr = u.rows.length > 0 && u.rows[0].l?.hdr;
                if (!hasHdr) u.rows = [hdrRow(u.headerL || "SUMMARY", u.headerR || "PRACTICE"), ...u.rows];
                delete u.headerL; delete u.headerR;
              }
              u.rows = padRows(u.rows);
              return u;
            });
            setData(p); setCurId(p.units[0]?.id || null);
          }
        }
      } catch {} setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    (async () => { try { await window.storage.set("bt-v3", JSON.stringify(data)); } catch {} })();
  }, [data, loaded]);

  const setUnits = (fn) => setData((d) => ({ ...d, units: typeof fn === "function" ? fn(d.units) : fn }));
  const setGroups = (fn) => setData((d) => ({ ...d, groups: typeof fn === "function" ? fn(d.groups) : fn }));
  const setSettings = (s) => setData((d) => ({ ...d, settings: { ...d.settings, ...s } }));
  const updateUnit = (id, upd) => setUnits((us) => us.map((u) => (u.id === id ? (typeof upd === "function" ? upd(u) : { ...u, ...upd }) : u)));

  const addUnit = (gid) => { const u = { id: uid(), groupId: gid, title: "새 단원", rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) }; setUnits((us) => [...us, u]); setCurId(u.id); };
  const delUnit = (id) => { if (!confirm("삭제할까요?")) return; setUnits((us) => { const n = us.filter((u) => u.id !== id); if (curId === id) setCurId(n[0]?.id || null); return n; }); };
  const dupUnit = (id) => {
    const s = data.units.find((u) => u.id === id); if (!s) return;
    const d = JSON.parse(JSON.stringify(s)); d.id = uid(); d.title += " (복사)"; d.rows.forEach((r) => { r.id = uid(); });
    setUnits((us) => [...us, d]); setCurId(d.id);
  };

  const updateRow = (rid, nr) => updateUnit(curId, (u) => ({ ...u, rows: u.rows.map((r) => (r.id === rid ? nr : r)) }));
  const delRow = (rid) => updateUnit(curId, (u) => ({ ...u, rows: u.rows.filter((r) => r.id !== rid) }));
  const moveCellContent = (rid, side, dir) => updateUnit(curId, (u) => {
    const rs = u.rows.map(r => ({ ...r, l: { ...r.l }, r: { ...r.r } }));
    const i = rs.findIndex((r) => r.id === rid); const j = i + dir;
    if (j < 0 || j >= rs.length) return u;
    const tmp = rs[i][side]; rs[i][side] = rs[j][side]; rs[j][side] = tmp;
    return { ...u, rows: rs };
  });
  const addRowAfter = (idx) => updateUnit(curId, (u) => { const rs = [...u.rows]; rs.splice(idx + 1, 0, emptyRow()); return { ...u, rows: rs }; });

  const addGroup = () => { if (!newGrp.trim()) return; setGroups((gs) => [...gs, { id: uid(), name: newGrp.trim(), collapsed: false }]); setNewGrp(""); setAddGroupOpen(false); };
  const renameGroup = (id, n) => setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, name: n } : g)));
  const delGroup = (id) => { setGroups((gs) => gs.filter((g) => g.id !== id)); setUnits((us) => us.map((u) => (u.groupId === id ? { ...u, groupId: null } : u))); };
  const toggleGroup = (id) => setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)));

  const handleLogo = () => { const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setSettings({ logo: ev.target.result }); r.readAsDataURL(f); }; i.click(); };
  const exportJSON = () => { const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "백지테스트_데이터.json"; a.click(); URL.revokeObjectURL(u); };
  const importJSON = () => { const i = document.createElement("input"); i.type = "file"; i.accept = ".json"; i.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (d.units) { setData(d); setCurId(d.units[0]?.id || null); } } catch { alert("잘못된 파일"); } }; r.readAsText(f); }; i.click(); };
  const resetAll = () => { if (confirm("초기화할까요?")) { setData(DEFAULT_STATE); setCurId(DEFAULT_STATE.units[0]?.id || null); } };

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#999" }}>불러오는 중...</div>;

  const ungrouped = data.units.filter((u) => !u.groupId || !data.groups.find((g) => g.id === u.groupId));
  const BS = { padding: "4px 9px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 10.5, cursor: "pointer", fontWeight: 500, color: "#555" };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Malgun Gothic','Noto Sans KR',sans-serif", fontSize: 13, background: "#f0f2f5" }}>
      <style>{`
        @page{size:A4;margin:10mm 12mm}
        @media print{
          html,body{height:auto!important;overflow:visible!important;margin:0!important;padding:0!important}
          body *{visibility:hidden!important}
          #print-wrapper,#print-wrapper *{visibility:visible!important}
          #print-wrapper{position:fixed!important;left:0!important;top:0!important;width:100%!important;height:auto!important;transform:none!important;padding:0!important;margin:0!important;overflow:visible!important}
          #print-area{width:100%!important;max-width:100%!important;height:auto!important;padding:0!important;margin:0!important;transform:none!important;box-shadow:none!important;border-radius:0!important;box-sizing:border-box!important}
          .no-print{display:none!important}
        }
        input:focus,select:focus{border-color:#86efac!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
      `}</style>

      {/* SIDEBAR */}
      <div className="no-print" style={{ width: 220, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            {["백", "지", "테", "스", "트"].map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 18, color: "#fff", fontWeight: 800, fontSize: 9, borderRadius: 2, background: i % 2 === 0 ? "#16a34a" : "#15803d" }}>{c}</span>
            ))}
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#374151", marginLeft: 2 }}>메이커</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => addUnit(null)} style={{ flex: 1, padding: "6px 0", borderRadius: 5, border: "none", background: "#16a34a", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>+ 단원</button>
            <button onClick={() => setAddGroupOpen(true)} style={{ padding: "6px 8px", borderRadius: 5, border: "1px solid #d1d5db", background: "#fff", fontSize: 11, cursor: "pointer", color: "#888" }}>+ 그룹</button>
          </div>
          {addGroupOpen && (
            <div style={{ display: "flex", gap: 3, marginTop: 5 }}>
              <input value={newGrp} onChange={(e) => setNewGrp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} placeholder="그룹 이름" autoFocus style={{ flex: 1, padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 3, fontSize: 11, outline: "none" }} />
              <button onClick={addGroup} style={{ padding: "3px 7px", border: "none", borderRadius: 3, background: "#16a34a", color: "#fff", fontSize: 10, cursor: "pointer" }}>확인</button>
              <button onClick={() => { setAddGroupOpen(false); setNewGrp(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 11 }}>✕</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px" }}>
          {data.groups.map((g) => {
            const gu = data.units.filter((u) => u.groupId === g.id);
            return (
              <div key={g.id} style={{ marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 5px", borderRadius: 3, cursor: "pointer", userSelect: "none" }} onClick={() => toggleGroup(g.id)}>
                  <span style={{ fontSize: 8, color: "#aaa", transform: g.collapsed ? "rotate(-90deg)" : "rotate(0)", transition: ".15s" }}>▼</span>
                  {editGroupId === g.id ? (
                    <input value={g.name} onChange={(e) => renameGroup(g.id, e.target.value)} onBlur={() => setEditGroupId(null)} onKeyDown={(e) => e.key === "Enter" && setEditGroupId(null)} onClick={(e) => e.stopPropagation()} autoFocus style={{ flex: 1, padding: "1px 3px", border: "1px solid #86efac", borderRadius: 2, fontSize: 11, fontWeight: 600, outline: "none" }} />
                  ) : (
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#374151" }}>{g.name}</span>
                  )}
                  <span style={{ fontSize: 9, color: "#bbb" }}>{gu.length}</span>
                  <button onClick={(e) => { e.stopPropagation(); setEditGroupId(g.id); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 9, color: "#bbb", padding: 0 }}>✎</button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`"${g.name}" 삭제?`)) delGroup(g.id); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 9, color: "#ddd", padding: 0 }}>✕</button>
                </div>
                {!g.collapsed && gu.map((u) => <UnitItem key={u.id} u={u} active={curId === u.id} onSelect={() => setCurId(u.id)} onDup={() => dupUnit(u.id)} onDel={() => delUnit(u.id)} groups={data.groups} onMove={(gid) => updateUnit(u.id, { groupId: gid })} />)}
                {!g.collapsed && <button onClick={() => addUnit(g.id)} style={{ width: "100%", padding: 3, border: "1px dashed #ddd", borderRadius: 3, background: "none", fontSize: 10, color: "#bbb", cursor: "pointer", marginTop: 1, marginBottom: 3 }}>+ 단원</button>}
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ padding: "3px 5px", fontSize: 10, color: "#aaa", fontWeight: 600 }}>미분류</div>
              {ungrouped.map((u) => <UnitItem key={u.id} u={u} active={curId === u.id} onSelect={() => setCurId(u.id)} onDup={() => dupUnit(u.id)} onDel={() => delUnit(u.id)} groups={data.groups} onMove={(gid) => updateUnit(u.id, { groupId: gid })} />)}
            </div>
          )}
        </div>
        <div style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 3, flexWrap: "wrap" }}>
          <button onClick={() => setSettingsOpen(true)} style={{ ...BS, flex: 1 }}>⚙ 설정</button>
          <button onClick={exportJSON} title="내보내기" style={BS}>↓</button>
          <button onClick={importJSON} title="불러오기" style={BS}>↑</button>
          <button onClick={resetAll} title="초기화" style={{ ...BS, color: "#ef4444" }}>↺</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <div className="no-print" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {unit ? (
            <>
              <input value={unit.title} onChange={(e) => updateUnit(curId, { title: e.target.value })} style={{ fontSize: 15, fontWeight: 700, border: "none", outline: "none", background: "transparent", padding: "2px 4px", borderBottom: "2px solid transparent", width: 180 }} onFocus={(e) => { e.target.style.borderBottomColor = "#86efac"; }} onBlur={(e) => { e.target.style.borderBottomColor = "transparent"; }} />
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 6, padding: 2 }}>
                {[{ k: "answer", l: "답지" }, { k: "blank", l: "시험지" }].map((v) => (
                  <button key={v.k} onClick={() => setPreviewMode(v.k)} style={{
                    padding: "4px 12px", borderRadius: 5, border: "none", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    background: previewMode === v.k ? "#fff" : "transparent",
                    color: previewMode === v.k ? (v.k === "answer" ? "#16a34a" : "#ea580c") : "#aaa",
                    boxShadow: previewMode === v.k ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                  }}>{v.l}</button>
                ))}
              </div>
              <button onClick={() => window.print()} style={{ padding: "5px 12px", borderRadius: 5, border: "none", background: "#16a34a", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>🖨 인쇄</button>
            </>
          ) : <span style={{ color: "#aaa", fontSize: 12 }}>단원을 선택하세요</span>}
        </div>

        {/* Split */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
          {/* Editor */}
          <div className="no-print" style={{ overflowY: "auto", padding: "8px 10px", background: "#fafafa", borderRight: "1px solid #e5e7eb" }}>
            {unit ? (
              <>
                {unit.rows.map((row, i) => (
                  <EditorRow key={row.id} row={row} onChange={(r) => updateRow(row.id, r)} onMoveLUp={() => moveCellContent(row.id, 'l', -1)} onMoveLDown={() => moveCellContent(row.id, 'l', 1)} onMoveRUp={() => moveCellContent(row.id, 'r', -1)} onMoveRDown={() => moveCellContent(row.id, 'r', 1)} first={i === 0} last={i === unit.rows.length - 1} />
                ))}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "#bbb" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 12 }}>왼쪽에서 단원을 선택하세요</div>
              </div>
            )}
          </div>
          {/* Preview */}
          <div style={{ overflowY: "auto", background: "#e8e8e8" }}>
            <Preview unit={unit} isBlank={previewMode === "blank"} logo={data.settings.logo} academyName={data.settings.academyName} scale={0.82} />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSettingsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>설정</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>학원 이름</label>
              <input value={data.settings.academyName || ""} onChange={(e) => setSettings({ academyName: e.target.value })} placeholder="시험지 하단에 표시" style={{ width: "100%", padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12.5, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>로고 이미지</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={handleLogo} style={{ padding: "6px 12px", borderRadius: 5, border: "1px solid #d1d5db", background: "#fff", fontSize: 11.5, cursor: "pointer" }}>이미지 선택</button>
                {data.settings.logo && (
                  <>
                    <img src={data.settings.logo} style={{ height: 32, objectFit: "contain", borderRadius: 3, border: "1px solid #eee" }} alt="" />
                    <button onClick={() => setSettings({ logo: null })} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>삭제</button>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setSettingsOpen(false)} style={{ padding: "7px 18px", borderRadius: 5, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
