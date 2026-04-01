import { useState, useEffect, useRef } from "react";

/* ═══════ helpers ═══════ */
const uid = () => Math.random().toString(36).slice(2, 10);
// 마이그레이션: 구 num 필드는 이제 그대로 tag 값이 됨 (1~15)
const NUM_TAGS = ["1","2","3","4","5","6","7","8","9","10"];
const NUM_TAG_SET = new Set(NUM_TAGS);
const DEFAULT_NUM_COLOR = "#16a34a";
const DEFAULT_TAGS = [
  { v: "개념", c: "#3B82F6", tx: "#fff" },
  { v: "형태", c: "#F59E0B", tx: "#fff" },
  { v: "예문", c: "#22C55E", tx: "#fff" },
  { v: "종류", c: "#EF4444", tx: "#fff" },
  { v: "주의", c: "#E11D48", tx: "#fff" },
  { v: "예시", c: "#14B8A6", tx: "#fff" },
  { v: "형태1", c: "#F97316", tx: "#fff" },
  { v: "형태2", c: "#F97316", tx: "#fff" },
  { v: "형태3", c: "#F97316", tx: "#fff" },
];
// 마이그레이션용 상수
const OLD_PTAG_VALUES = new Set(["영작", "수동태", "(1)", "(2)"]);
const NO_TAG = { v: "", label: "태그 없음", c: "#d1d5db", tx: "#6b7280" };
const tagColor = (v, tags, numColor) => {
  if (!v) return NO_TAG;
  if (NUM_TAG_SET.has(v)) return { v, c: numColor || DEFAULT_NUM_COLOR, tx: "#fff" };
  return (tags || DEFAULT_TAGS).find((t) => t.v === v) || NO_TAG;
};
const emptyRow = () => ({
  id: uid(),
  l: { tag: "", mark: "", text: "", vis: false, bold: false, hdr: false, indent: 0 },
  r: { tag: "", mark: "", text: "", vis: false, bold: false, hdr: false, indent: 0 },
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
  l: { tag: ld.t || "", mark: ld.m || "", text: ld.x || "", vis: !ld.a, bold: !!ld.b, indent: ld.i || 0 },
  r: { tag: rd.t || "", mark: rd.m || "", text: rd.x || "", vis: !rd.a, bold: !!rd.b, indent: rd.i || 0 },
});

const hdrRow = (lText, rText) => ({
  id: uid(),
  l: { tag: "", mark: "", text: lText, vis: true, bold: false, hdr: true, indent: 0 },
  r: { tag: "", mark: "", text: rText, vis: true, bold: false, hdr: true, indent: 0 },
});

const PASSIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "능동: 주어가 동사를 직접 함", a: 1 }, { x: "영작 & 수동태 전환 연습", b: 1 }),
  mk({ x: "수동: 주어가 동사를 다른 행위자에 의해 당함", a: 1 }, { t: "1", x: "나의 친구들은 나를 사랑한다." }),
  mk({}, { m: "[영작]", x: "My friends love me.", a: 1 }),
  mk({ x: "능동태 -> 수동태 전환방법", b: 1 }, { m: "[수동태]", x: "I am loved by my friends.", a: 1 }),
  mk({ t: "예문", x: "She wrote a letter.", a: 1 }, { t: "2", x: "나는 접시들을 씻는다." }),
  mk({ x: "1) 능동태의 주어, 동사, 목적어를 찾는다.", a: 1 }, { m: "[영작]", x: "I wash the dishes.", a: 1 }),
  mk({ x: "=> 주어: She / 동사: wrote / 목적어: a letter", a: 1 }, { m: "[수동태]", x: "The dishes are washed by me.", a: 1 }),
  mk({ x: "2) 능동태의 시제를 파악한다.", a: 1 }, { t: "3", x: "그는 창문을 닫았다." }),
  mk({ x: "=> 과거", a: 1 }, { m: "[영작]", x: "He closed the window.", a: 1 }),
  mk({ x: "3) 능동태의 목적어를 수동태의 주어 자리에 쓴다.", a: 1 }, { m: "[수동태]", x: "The window was closed by him.", a: 1 }),
  mk({ x: "=> A letter", a: 1 }, { t: "4", x: "Joy는 컵들을 깼다." }),
  mk({ x: "4) be동사를 수/시제에 맞게 쓴다.", a: 1 }, { m: "[영작]", x: "Joy broke the cups.", a: 1 }),
  mk({ x: "=> A letter was", a: 1 }, { m: "[수동태]", x: "The cups were broken by Joy.", a: 1 }),
  mk({ x: "5) 동사를 p.p형태로 바꾼다.", a: 1 }, { t: "5", x: "그녀는 파티를 개최할 것이다." }),
  mk({ x: "=> A letter was written", a: 1 }, { m: "[영작]", x: "She will hold a party.", a: 1 }),
  mk({ x: "6) by + 원래 주어를 목적격으로 쓴다.", a: 1 }, { m: "[수동태]", x: "A party will be held by her.", a: 1 }),
  mk({ x: "=> A letter was written by her.", a: 1 }, { t: "6", x: "할머니는 케이크를 구울 것이다." }),
  mk({ t: "주의", x: "A letter was written by she. (X)", a: 1 }, { m: "[영작]", x: "Grandma will bake the cake.", a: 1 }),
  mk({}, { m: "[수동태]", x: "The cake will be baked by Grandma.", a: 1 }),
  mk({ x: "by + 목적격의 생략", b: 1 }, { t: "7", x: "사람들은 미국에서 영어를 말한다." }),
  mk({ t: "개념", x: "행위자가 분명하지 않거나 중요하지 않을 때", a: 1 }, { m: "[영작]", x: "People speak English in America.", a: 1 }),
  mk({ x: "by + 목적격은 생략할 수 있다", a: 1 }, { m: "[수동태]", x: "English is spoken in America.", a: 1 }),
  mk({ t: "예문", x: "Someone planted the tree in 1995.", a: 1 }, {}),
  mk({ x: "=> The tree was planted in 1995.", a: 1 }, {}),
];

const RELATIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "관계대명사는 [접속사 + 대명사] 의 역할을 하며", a: 1 }, { x: "영작연습", b: 1 }),
  mk({ x: "관계대명사가 이끄는 절은 앞의 명사(선행사)를 수식한다", a: 1, i: 1 }, { t: "1", x: "나는 착한 소년을 안다." }),
  mk({ x: "주격관계대명사", b: 1 }, { m: "(1)", x: "I know a boy.", a: 1 }),
  mk({ t: "개념", x: "주격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { m: "(2)", x: "The boy is kind.", a: 1 }),
  mk({ x: "주어의 역할을 한다", a: 1, i: 1 }, { x: "=> I know a boy ( who is kind ).", a: 1 }),
  mk({ t: "형태", x: "- 선행사가 사람일 때 : who", a: 1 }, { t: "2", x: "그는 내가 믿는 친구를 가지고 있다." }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { m: "(1)", x: "He has a friend.", a: 1 }),
  mk({ t: "예문", x: "She is a girl ( who likes pasta ).", a: 1 }, { m: "(2)", x: "I trust the friend.", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "=> He has a friend ( who(m) I trust ).", a: 1 }),
  mk({ t: "예문", x: "This is a house ( which is expensive ).", a: 1 }, { t: "3", x: "우리는 빠른 차를 봤다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { m: "(1)", x: "We saw a car.", a: 1 }),
  mk({ x: "목적격관계대명사", b: 1 }, { m: "(2)", x: "The car was fast.", a: 1 }),
  mk({ t: "개념", x: "목적격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> We saw a car ( which was fast ).", a: 1 }),
  mk({ x: "목적어의 역할을 한다", a: 1, i: 1 }, { t: "4", x: "우리가 어제 만난 그 선생님은 착하다." }),
  mk({ t: "형태", x: "- 선행사가 사람일 때 : who / whom", a: 1 }, { m: "(1)", x: "The teacher is kind.", a: 1 }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { m: "(2)", x: "We met the teacher yesterday.", a: 1 }),
  mk({ t: "예문", x: "She is a girl ( who(m) I like ).", a: 1 }, { x: "=> The teacher ( who(m) we met yesterday )", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "is kind.", a: 1 }),
  mk({ t: "예문", x: "This is a house ( which Joy bought ).", a: 1 }, { t: "5", x: "그는 머리가 긴 소녀를 만났다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { m: "(1)", x: "He met a girl.", a: 1 }),
  mk({ x: "소유격관계대명사", b: 1 }, { m: "(2)", x: "Her hair is long.", a: 1 }),
  mk({ t: "개념", x: "소유격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> He met a girl ( whose hair is long ).", a: 1 }),
  mk({ x: "소유격 역할을 한다", a: 1, i: 1 }, { t: "6", x: "그는 부산에서 일하는 의사를 안다." }),
  mk({ t: "형태", x: "선행사와 상관없이 whose", a: 1 }, { m: "(1)", x: "He knows a doctor.", a: 1 }),
  mk({ t: "예문", x: "She is a girl ( whose hair is long ).", a: 1 }, { m: "(2)", x: "The doctor works in Busan.", a: 1 }),
  mk({ t: "예문", x: "This is a house ( whose roof is red ).", a: 1 }, { x: "=> He knows a doctor ( who works in Busan ).", a: 1 }),
];

const DEFAULT_STATE = {
  groups: [{ id: "g1", name: "문법 기초", collapsed: false }],
  units: [
    { id: "u1", groupId: "g1", title: "수동태", rows: padRows(PASSIVE_ROWS) },
    { id: "u2", groupId: "g1", title: "관계대명사", rows: padRows(RELATIVE_ROWS) },
  ],
  settings: { logo: null, slogan: "", tags: DEFAULT_TAGS },
};

/* ═══════ CellProps (태그 + 마커 + 들여쓰기 통합 팝오버) ═══════ */
function CellProps({ cell, upd, tags, numColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nc = numColor || DEFAULT_NUM_COLOR;
  const tc = tagColor(cell.tag, tags, nc);
  const indLv = cell.indent || 0;
  const hasAny = cell.tag || cell.mark || indLv > 0;
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const mkBtn = (v, c, tx, label) => (
    <button key={v} onClick={() => upd("tag", v)} style={{
      padding: "3px 8px", borderRadius: 4, border: "none",
      background: v ? c : "#f3f4f6", color: v ? tx : "#6b7280",
      fontSize: 11, fontWeight: 600, cursor: "pointer",
      outline: cell.tag === v ? "2px solid #111" : "none", outlineOffset: 1,
    }}>{label}</button>
  );
  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 2 }}>
      {/* 팝오버 토글 */}
      <button onClick={() => setOpen(!open)} style={{
        width: 18, height: 18, border: "none", borderRadius: 3, cursor: "pointer",
        fontSize: 8, fontWeight: 600, flexShrink: 0, padding: 0, lineHeight: 1,
        background: open ? "#f0f0f0" : "transparent", color: "#aaa",
      }}>{open ? "▲" : "▼"}</button>
      {/* 들여쓰기 표시 */}
      {indLv > 0 && <span style={{ color: "#bbb", fontSize: 8, fontWeight: 600, flexShrink: 0, userSelect: "none" }}>┗{indLv}</span>}
      {/* 태그+마커 뱃지 */}
      {cell.tag && (
        <span onClick={() => setOpen(!open)} style={{ padding: "1px 6px", borderRadius: 3, background: tc.c, color: tc.tx, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>{cell.tag}</span>
      )}
      {cell.mark && (
        <span onClick={() => setOpen(!open)} style={{ padding: "1px 5px", borderRadius: 3, background: "#dbeafe", color: "#1d4ed8", fontSize: 9.5, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>{cell.mark}</span>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "110%", left: 0, zIndex: 50,
          background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,.18)",
          padding: 8, width: 240, marginTop: 2,
        }} onClick={(e) => e.stopPropagation()}>
          {/* 태그 */}
          <div style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 4 }}>태그</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
            {mkBtn("", "", "", "없음")}
            {NUM_TAGS.map((n) => mkBtn(n, nc, "#fff", n))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
            {(tags || DEFAULT_TAGS).map((t) => mkBtn(t.v, t.c, t.tx, t.v))}
          </div>
          {/* 마커 */}
          <div style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 3 }}>마커</div>
          <input value={cell.mark} onChange={(e) => upd("mark", e.target.value)} placeholder="예: [영작], (1)"
            style={{ width: "100%", padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 11, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
          {/* 들여쓰기 */}
          <div style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 3 }}>들여쓰기</div>
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2].map((lv) => (
              <button key={lv} onClick={() => upd("indent", lv)} style={{
                padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600,
                background: indLv === lv ? "#6366f1" : "#f3f4f6", color: indLv === lv ? "#fff" : "#888",
              }}>{lv === 0 ? "없음" : `${lv}단계`}</button>
            ))}
          </div>
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

function EditorCell({ side, cell, upd, onUp, onDown, first, last, tags, numColor, idx }) {
  const indLv = cell.indent || 0;
  const indPad = indLv * 20;
  const isEmpty = !cell.tag && !cell.mark && !cell.text && !cell.hdr;
  const TB = (active, onClick, title, children, color, textColor) => (
    <button onClick={onClick} title={title} style={{
      width: 20, height: 20, border: "none", borderRadius: 3, cursor: "pointer",
      fontSize: 9.5, fontWeight: 800, flexShrink: 0, padding: 0, lineHeight: 1,
      background: active ? (color || "#1f2937") : "#f0f0f0",
      color: active ? (textColor || "#fff") : "#bbb",
    }}>{children}</button>
  );
  return (
    <div style={{
      background: cell.hdr ? "#e8f5e9" : isEmpty ? "#f3f4f6" : "#fff", padding: "3px 4px",
      display: "flex", alignItems: "center", gap: 3,
      borderLeft: cell.hdr ? "3px solid #16a34a" : "3px solid transparent",
      opacity: isEmpty ? 0.5 : 1,
    }}>
      <span style={{ fontSize: 8, color: "#bbb", fontWeight: 600, width: 14, textAlign: "right", flexShrink: 0, userSelect: "none" }}>{idx + 1}</span>
      <CellProps cell={cell} upd={upd} tags={tags} numColor={numColor} />
      {indLv > 0 && <span style={{ width: indLv * 20, flexShrink: 0 }} />}
      <input value={cell.text} onChange={(e) => upd("text", e.target.value)} placeholder="내용..."
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); upd("indent", e.shiftKey ? Math.max(0, indLv - 1) : Math.min(2, indLv + 1)); }
        }}
        style={{ flex: 1, padding: "2px 5px", border: "1px solid #e5e7eb", borderRadius: 3, fontSize: 11.5, outline: "none", background: isEmpty ? "#eee" : "#fff", minWidth: 0, fontWeight: cell.bold ? 700 : 400, color: "#1f2937" }} />
      {TB(cell.hdr, () => upd("hdr", !cell.hdr), "헤더", "H", "#16a34a", "#fff")}
      {TB(cell.bold, () => upd("bold", !cell.bold), "굵게", "B")}
      {TB(cell.vis, () => upd("vis", !cell.vis), "시험지에 표시 (기본: 숨김)", "표시", "#f59e0b", "#78350f")}
      <CellArrows onUp={onUp} onDown={onDown} first={first} last={last} />
    </div>
  );
}

function EditorSideGroup({ side, label, color, rows, onCellChange, onMove, tags, numColor }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 4px 4px", position: "sticky", top: 0, zIndex: 5, background: "#fafafa" }}>
        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, background: color, color: "#fff", fontSize: 11, fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: 10, color: "#aaa" }}>{rows.length}행</span>
      </div>
      {rows.map((row, i) => (
        <div key={row.id} style={{ borderRadius: 4, marginBottom: 1, background: "#e0e0e0" }}>
          <EditorCell side={side} cell={row[side]} upd={(f, v) => onCellChange(row.id, side, f, v)} onUp={() => onMove(row.id, side, -1)} onDown={() => onMove(row.id, side, 1)} first={i === 0} last={i === rows.length - 1} tags={tags} numColor={numColor} idx={i} />
        </div>
      ))}
    </div>
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

function Preview({ unit, isBlank, logo, slogan, fontFamily, tags, numColor }) {
  if (!unit) return <div style={{ padding: 40, color: "#bbb", textAlign: "center", fontSize: 13 }}>단원을 선택하세요</div>;
  return (
    <div id="print-wrapper">
      <div id="print-area" style={{
        padding: "20px 28px 20px", width: 740, height: 1046, boxSizing: "border-box",
        fontFamily: fontFamily || "'Pretendard','Malgun Gothic',sans-serif", background: "#fff",
        boxShadow: "0 2px 12px rgba(0,0,0,.1)", borderRadius: 3,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Top: badge */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
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
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 20px", color: "#111", letterSpacing: -0.5 }}>{unit.title}</h1>
        {/* Table */}
        <div style={{ border: "2px solid #16a34a", borderRadius: 4, overflow: "hidden" }}>
          {/* Content rows — fixed height, no expansion */}
          {unit.rows.map((row, i) => {
            const prevRow = unit.rows[i - 1];
            const nextRow = unit.rows[i + 1];
            const isLast = i >= unit.rows.length - 1;
            const HDR_STYLE = { padding: "0 12px", display: "flex", alignItems: "center", fontWeight: 800, fontSize: 12, color: "#16a34a", letterSpacing: 2, background: "#e8f5e9", height: ROW_H, maxHeight: ROW_H, overflow: "hidden" };
            const renderCell = (cell, side) => {
              const isHdr = cell.hdr;
              const show = !isBlank || cell.vis;
              const tc = tagColor(cell.tag, tags, numColor);
              const empty = !cell.tag && !cell.mark && !cell.text && !isHdr && !cell.indent;
              const nxtHdr = side === "l" ? nextRow?.l.hdr : nextRow?.r.hdr;
              const btm = isLast ? "none" : ((isHdr && !nxtHdr) || (!isHdr && nxtHdr)) ? "2px solid #16a34a" : "1px solid #e5e7eb";
              const extra = side === "r" ? { borderLeft: "2px solid #16a34a" } : {};
              if (isHdr) return (
                <div style={{ ...HDR_STYLE, borderBottom: btm, ...extra }}>
                  <span style={{ ...TEXT_CLIP }}>{cell.text}</span>
                </div>
              );
              // 들여쓰기: 윗줄의 tag/mark를 레벨에 따라 투명 복제
              const indLv = cell.indent || 0;
              const prev = indLv > 0 && prevRow ? prevRow[side] : null;
              const ghostTag = (indLv >= 1) ? prev?.tag : null;
              const ghostMark = (indLv >= 2) ? prev?.mark : null;
              return (
                <div style={{ ...CELL_STYLE, padding: "0 10px", background: empty ? "#fafafa" : "#fff", borderBottom: btm, ...extra }}>
                  {ghostTag && !cell.tag && (
                    <span style={{
                      display: "inline-block", padding: "1px 7px", borderRadius: 3,
                      fontSize: 9.5, fontWeight: 700, flexShrink: 0, lineHeight: "16px", visibility: "hidden",
                    }}>{ghostTag}</span>
                  )}
                  {cell.tag && (
                    <span style={{
                      display: "inline-block", padding: "1px 7px", borderRadius: 3,
                      background: tc.c, color: tc.tx, fontSize: 9.5, fontWeight: 700, flexShrink: 0, lineHeight: "16px",
                    }}>{cell.tag}</span>
                  )}
                  {ghostMark && !cell.mark && (
                    <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, visibility: "hidden" }}>{ghostMark}</span>
                  )}
                  {cell.mark && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", flexShrink: 0 }}>{cell.mark}</span>
                  )}
                  {show && cell.text && (
                    <span style={{
                      ...TEXT_CLIP, fontSize: 12, color: "#1f2937", lineHeight: `${ROW_H}px`,
                      fontWeight: cell.bold ? 700 : 400,
                      textDecoration: cell.bold ? "underline" : "none",
                      textUnderlineOffset: 3, textDecorationColor: "#aaa",
                    }}>{cell.text}</span>
                  )}
                </div>
              );
            };
            return (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {renderCell(row.l, "l")}
                {renderCell(row.r, "r")}
              </div>
            );
          })}
        </div>
        {/* Spacer to push footer down */}
        <div style={{ flex: 1 }} />
        {/* Footer: slogan left, logo right */}
        {(logo || slogan) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#777", letterSpacing: 0.3 }}>{slogan || ""}</span>
            {logo ? <img src={logo} style={{ height: 44, objectFit: "contain" }} alt="" /> : <span />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════ UnitItem ═══════ */
function UnitItem({ u, active, onSelect, onDup, onDel, onExport, groups, onMove }) {
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
            <MItem onClick={() => { onExport(); setMenu(false); }}>📤 내보내기</MItem>
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
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [splitPct, setSplitPct] = useState(50);
  const splitDragging = useRef(false);
  const splitContainerRef = useRef(null);

  const unit = data.units.find((u) => u.id === curId) || null;

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("bt-v3");
        if (r?.value) {
          const p = JSON.parse(r.value);
          if (p.units) {
            // migrate: academyName → slogan
            if (p.settings?.academyName && !p.settings.slogan) {
              p.settings.slogan = p.settings.academyName;
              delete p.settings.academyName;
            }
            // migrate: headerL/headerR → first hdr row, pad to TOTAL_ROWS
            p.units = p.units.map((u) => {
              if (u.headerL || u.headerR) {
                const hasHdr = u.rows.length > 0 && u.rows[0].l?.hdr;
                if (!hasHdr) u.rows = [hdrRow(u.headerL || "SUMMARY", u.headerR || "PRACTICE"), ...u.rows];
                delete u.headerL; delete u.headerR;
              }
              u.rows = padRows(u.rows);
              return u;
            });
            // migrate: unified tags + symmetric cells
            if (!p.settings) p.settings = {};
            if (!p.settings.tags) p.settings.tags = DEFAULT_TAGS;
            // remove old ptags from settings, strip old ptag entries from tags list
            delete p.settings.ptags;
            p.settings.tags = p.settings.tags.filter((t) => !OLD_PTAG_VALUES.has(t.v) && !NUM_TAG_SET.has(t.v));
            // migrate cell fields
            p.units.forEach((u) => {
              u.rows.forEach((r) => {
                [r.l, r.r].forEach((c) => {
                  // ensure mark exists
                  if (c.mark === undefined) c.mark = "";
                  // indent: boolean → number
                  if (c.indent === true) c.indent = 1;
                  else if (!c.indent) c.indent = 0;
                  // num → tag (1,2,3...)
                  if (c.num) {
                    if (!c.tag) c.tag = c.num;
                  }
                  delete c.num;
                  // ptag → mark
                  if (c.ptag !== undefined) {
                    if (!c.mark) {
                      const pv = c.ptag;
                      c.mark = (pv === "영작" || pv === "수동태") ? `[${pv}]` : pv;
                    }
                    delete c.ptag;
                  }
                  // tag that was a ptag value → move to mark
                  if (c.tag && OLD_PTAG_VALUES.has(c.tag)) {
                    if (!c.mark) {
                      const tv = c.tag;
                      c.mark = (tv === "영작" || tv === "수동태") ? `[${tv}]` : tv;
                    }
                    c.tag = "";
                  }
                  // ans → vis (invert: ans=true meant hidden, vis=true means visible)
                  if (c.vis === undefined) {
                    c.vis = !c.ans;
                    delete c.ans;
                  }
                });
              });
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

  useEffect(() => {
    if (!fileMenuOpen) return;
    const h = (e) => { if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) setFileMenuOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [fileMenuOpen]);

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
  const updateCellField = (rid, side, field, val) => updateUnit(curId, (u) => ({ ...u, rows: u.rows.map((r) => r.id === rid ? { ...r, [side]: { ...r[side], [field]: val } } : r) }));
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
  const handleFont = () => { const i = document.createElement("input"); i.type = "file"; i.accept = ".woff2,.woff,.ttf,.otf"; i.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setSettings({ customFont: ev.target.result, customFontName: f.name }); r.readAsDataURL(f); }; i.click(); };
  const exportJSON = () => {
    const d = new Date(); const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `백지테스트_${ds}.json`; a.click(); URL.revokeObjectURL(u);
  };
  const importJSON = () => {
    if (!confirm("주의: 현재 작업 중인 데이터가 모두 교체됩니다.\n\n미리 '내 데이터 저장'으로 백업하셨나요?")) return;
    const i = document.createElement("input"); i.type = "file"; i.accept = ".json"; i.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (d.units) { setData(d); setCurId(d.units[0]?.id || null); } else { alert("올바른 데이터 파일이 아닙니다."); } } catch { alert("잘못된 파일입니다."); } }; r.readAsText(f); }; i.click();
  };
  const exportUnit = (id) => {
    const u = data.units.find((x) => x.id === id); if (!u) return;
    const usedTags = new Set();
    u.rows.forEach((r) => { if (r.l.tag && !NUM_TAG_SET.has(r.l.tag)) usedTags.add(r.l.tag); if (r.r.tag && !NUM_TAG_SET.has(r.r.tag)) usedTags.add(r.r.tag); });
    const tags = (data.settings.tags || DEFAULT_TAGS).filter((t) => usedTags.has(t.v));
    const d = { _type: "bt-units", units: [JSON.parse(JSON.stringify(u))], tags };
    const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = `${u.title}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importUnits = () => { const i = document.createElement("input"); i.type = "file"; i.accept = ".json"; i.multiple = true; i.onchange = (e) => { Array.from(e.target.files).forEach((f) => { const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (d._type === "bt-units" && d.units) { const newUnits = d.units.map((u) => { const nu = JSON.parse(JSON.stringify(u)); nu.id = uid(); nu.rows.forEach((r) => { r.id = uid(); [r.l, r.r].forEach((c) => { if (c.vis === undefined) { c.vis = !c.ans; delete c.ans; } }); }); nu.groupId = null; return nu; }); if (d.tags && d.tags.length) { setSettings({ tags: (() => { const cur = data.settings.tags || DEFAULT_TAGS; const curSet = new Set(cur.map((t) => t.v)); const added = d.tags.filter((t) => !curSet.has(t.v)); return added.length ? [...cur, ...added] : cur; })() }); } setUnits((us) => [...us, ...newUnits]); setCurId(newUnits[0]?.id || curId); } else { alert("단원 파일이 아닙니다. 단원 내보내기로 만든 파일만 가져올 수 있습니다."); } } catch { alert("잘못된 파일: " + f.name); } }; r.readAsText(f); }); }; i.click(); };
  const resetAll = () => { if (confirm("초기화할까요?")) { setData(DEFAULT_STATE); setCurId(DEFAULT_STATE.units[0]?.id || null); } };

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#999" }}>불러오는 중...</div>;

  const ungrouped = data.units.filter((u) => !u.groupId || !data.groups.find((g) => g.id === u.groupId));
  const BS = { padding: "4px 9px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 10.5, cursor: "pointer", fontWeight: 500, color: "#555" };

  const fontFamily = data.settings.customFont
    ? `'CustomFont','Pretendard','Malgun Gothic',sans-serif`
    : `'Pretendard','Malgun Gothic',sans-serif`;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily, fontSize: 13, background: "#f0f2f5" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css');
        ${data.settings.customFont ? `@font-face{font-family:'CustomFont';src:url('${data.settings.customFont}');font-display:swap}` : ''}
        @page{size:A4;margin:0}
        @media print{
          html,body{height:auto!important;overflow:visible!important;margin:0!important;padding:0!important;width:210mm!important;height:297mm!important}
          body *{visibility:hidden!important}
          #print-wrapper,#print-wrapper *{visibility:visible!important}
          #print-wrapper{position:fixed!important;left:0!important;top:0!important;width:210mm!important;height:297mm!important;display:flex!important;justify-content:center!important;align-items:center!important;transform:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
          #preview-zoom{transform:none!important}
          #print-area{box-shadow:none!important;border-radius:0!important;margin:0!important}
          .no-print{display:none!important}
        }
        input:focus,select:focus{border-color:#86efac!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
      `}</style>

      {/* SIDEBAR */}
      <div className="no-print" style={{ width: sidebarOpen ? 220 : 44, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .2s ease" }}>
        {!sidebarOpen ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 10 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, padding: 4, color: "#16a34a" }} title="사이드바 열기">☰</button>
            {["백", "지", "테", "스", "트"].map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 18, color: "#fff", fontWeight: 800, fontSize: 9, borderRadius: 2, background: i % 2 === 0 ? "#16a34a" : "#15803d" }}>{c}</span>
            ))}
          </div>
        ) : <>
        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <button onClick={() => setSidebarOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, padding: "0 2px", color: "#aaa", flexShrink: 0 }} title="사이드바 접기">◀</button>
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
                {!g.collapsed && gu.map((u) => <UnitItem key={u.id} u={u} active={curId === u.id} onSelect={() => setCurId(u.id)} onDup={() => dupUnit(u.id)} onDel={() => delUnit(u.id)} onExport={() => exportUnit(u.id)} groups={data.groups} onMove={(gid) => updateUnit(u.id, { groupId: gid })} />)}
                {!g.collapsed && <button onClick={() => addUnit(g.id)} style={{ width: "100%", padding: 3, border: "1px dashed #ddd", borderRadius: 3, background: "none", fontSize: 10, color: "#bbb", cursor: "pointer", marginTop: 1, marginBottom: 3 }}>+ 단원</button>}
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ padding: "3px 5px", fontSize: 10, color: "#aaa", fontWeight: 600 }}>미분류</div>
              {ungrouped.map((u) => <UnitItem key={u.id} u={u} active={curId === u.id} onSelect={() => setCurId(u.id)} onDup={() => dupUnit(u.id)} onDel={() => delUnit(u.id)} onExport={() => exportUnit(u.id)} groups={data.groups} onMove={(gid) => updateUnit(u.id, { groupId: gid })} />)}
            </div>
          )}
        </div>
        <div style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 4, position: "relative" }}>
          <button onClick={() => setSettingsOpen(true)} style={{ ...BS, flex: 1 }}>⚙ 설정</button>
          <div ref={fileMenuRef} style={{ position: "relative", flex: 1 }}>
            <button onClick={() => setFileMenuOpen(!fileMenuOpen)} style={{ ...BS, width: "100%", background: fileMenuOpen ? "#f0fdf4" : "#fff" }}>📁 파일</button>
            {fileMenuOpen && (
              <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 8, boxShadow: "0 -4px 20px rgba(0,0,0,.12)", padding: 6, zIndex: 50, minWidth: 190 }}>
                <div style={{ padding: "4px 8px", fontSize: 9, color: "#999", fontWeight: 700, letterSpacing: 1 }}>내 데이터</div>
                <button onClick={() => { exportJSON(); setFileMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "7px 10px", border: "none", background: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#1f2937" }} onMouseEnter={(e) => e.target.style.background="#f0fdf4"} onMouseLeave={(e) => e.target.style.background="none"}>
                  💾 내 데이터 저장<br/><span style={{ fontSize: 9.5, color: "#999" }}>JSON 파일로 PC에 다운로드</span>
                </button>
                <button onClick={() => { importJSON(); setFileMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "7px 10px", border: "none", background: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#1f2937" }} onMouseEnter={(e) => e.target.style.background="#f0fdf4"} onMouseLeave={(e) => e.target.style.background="none"}>
                  📂 내 데이터 불러오기<br/><span style={{ fontSize: 9.5, color: "#999" }}>저장한 JSON 파일로 전체 복원</span>
                </button>
                <div style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }} />
                <div style={{ padding: "4px 8px", fontSize: 9, color: "#999", fontWeight: 700, letterSpacing: 1 }}>단원 공유</div>
                <button onClick={() => { importUnits(); setFileMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "7px 10px", border: "none", background: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#1f2937" }} onMouseEnter={(e) => e.target.style.background="#f0fdf4"} onMouseLeave={(e) => e.target.style.background="none"}>
                  📥 단원 가져오기<br/><span style={{ fontSize: 9.5, color: "#999" }}>다른 선생님의 단원 파일 추가</span>
                </button>
                <div style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }} />
                <button onClick={() => { resetAll(); setFileMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "7px 10px", border: "none", background: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#ef4444" }} onMouseEnter={(e) => e.target.style.background="#fef2f2"} onMouseLeave={(e) => e.target.style.background="none"}>
                  ↺ 초기화
                </button>
              </div>
            )}
          </div>
        </div>
        </>}
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
        <div ref={splitContainerRef} style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}
          onMouseMove={(e) => { if (!splitDragging.current) return; const rect = splitContainerRef.current.getBoundingClientRect(); const pct = ((e.clientX - rect.left) / rect.width) * 100; setSplitPct(Math.max(20, Math.min(80, pct))); }}
          onMouseUp={() => { splitDragging.current = false; }}
          onMouseLeave={() => { splitDragging.current = false; }}
        >
          {/* Editor */}
          <div className="no-print" style={{ width: `${splitPct}%`, overflowY: "auto", padding: "8px 10px", background: "#fafafa" }}>
            {unit ? (
              <>
                <EditorSideGroup side="l" label="왼쪽 (L)" color="#16a34a" rows={unit.rows} onCellChange={updateCellField} onMove={moveCellContent} tags={data.settings.tags} numColor={data.settings.numTagColor} />
                <EditorSideGroup side="r" label="오른쪽 (R)" color="#ea580c" rows={unit.rows} onCellChange={updateCellField} onMove={moveCellContent} tags={data.settings.tags} numColor={data.settings.numTagColor} />
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "#bbb" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 12 }}>사이드바에서 단원을 선택하세요</div>
              </div>
            )}
          </div>
          {/* Drag handle */}
          <div className="no-print" onMouseDown={() => { splitDragging.current = true; }}
            style={{ width: 6, cursor: "col-resize", background: "#e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}
          >
            <div style={{ width: 2, height: 32, borderRadius: 1, background: "#aaa" }} />
          </div>
          {/* Preview */}
          <div style={{ flex: 1, overflow: "auto", background: "#e8e8e8", display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 8px" }}>
            <div className="no-print" style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
              <button onClick={() => setPreviewZoom(Math.max(30, previewZoom - 10))} style={{ width: 24, height: 24, border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#555", lineHeight: 1 }}>−</button>
              <span style={{ fontSize: 10, color: "#888", fontWeight: 600, minWidth: 36, textAlign: "center" }}>{previewZoom}%</span>
              <button onClick={() => setPreviewZoom(Math.min(150, previewZoom + 10))} style={{ width: 24, height: 24, border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#555", lineHeight: 1 }}>+</button>
            </div>
            <div id="preview-zoom" style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: "top center", flexShrink: 0 }}>
              <Preview unit={unit} isBlank={previewMode === "blank"} logo={data.settings.logo} slogan={data.settings.slogan} fontFamily={fontFamily} tags={data.settings.tags} numColor={data.settings.numTagColor} />
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSettingsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, width: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>설정</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>슬로건</label>
              <input value={data.settings.slogan || ""} onChange={(e) => setSettings({ slogan: e.target.value })} placeholder="예: 손에 잡히는 영어" style={{ width: "100%", padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12.5, outline: "none", boxSizing: "border-box" }} />
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
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>커스텀 폰트</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={handleFont} style={{ padding: "6px 12px", borderRadius: 5, border: "1px solid #d1d5db", background: "#fff", fontSize: 11.5, cursor: "pointer" }}>폰트 파일 선택</button>
                {data.settings.customFont && (
                  <>
                    <span style={{ fontSize: 11, color: "#555" }}>{data.settings.customFontName || "업로드됨"}</span>
                    <button onClick={() => setSettings({ customFont: null, customFontName: null })} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>삭제</button>
                  </>
                )}
              </div>
              <span style={{ fontSize: 10, color: "#999", marginTop: 2, display: "block" }}>woff2, woff, ttf, otf 지원 (기본: Pretendard)</span>
            </div>

            {/* ── 숫자 태그 색상 ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>숫자 태그 색상</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="color" value={data.settings.numTagColor || DEFAULT_NUM_COLOR} onChange={(e) => setSettings({ numTagColor: e.target.value })}
                  style={{ width: 30, height: 30, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", padding: 1 }} />
                <div style={{ display: "flex", gap: 2 }}>
                  {NUM_TAGS.slice(0, 5).map((n) => (
                    <span key={n} style={{ display: "inline-block", padding: "1px 6px", borderRadius: 3, background: data.settings.numTagColor || DEFAULT_NUM_COLOR, color: "#fff", fontSize: 10, fontWeight: 700 }}>{n}</span>
                  ))}
                </div>
                {data.settings.numTagColor && data.settings.numTagColor !== DEFAULT_NUM_COLOR && (
                  <button onClick={() => setSettings({ numTagColor: null })} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 10 }}>초기화</button>
                )}
              </div>
            </div>

            {/* ── 태그 관리 ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>일반 태그 관리</label>
              <span style={{ fontSize: 10, color: "#999", display: "block", marginBottom: 5 }}>추가/삭제/색상 변경 가능</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {(data.settings.tags || []).map((t, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="color" value={t.c} onChange={(e) => {
                      const nTags = [...data.settings.tags];
                      nTags[idx] = { ...nTags[idx], c: e.target.value };
                      setSettings({ tags: nTags });
                    }} style={{ width: 26, height: 26, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", padding: 1 }} />
                    <input value={t.v} onChange={(e) => {
                      const nv = e.target.value;
                      const nTags = [...data.settings.tags];
                      const oldV = nTags[idx].v;
                      nTags[idx] = { ...nTags[idx], v: nv };
                      setSettings({ tags: nTags });
                      if (oldV && oldV !== nv) {
                        setUnits((us) => us.map((u) => ({
                          ...u, rows: u.rows.map((r) => ({
                            ...r,
                            l: r.l.tag === oldV ? { ...r.l, tag: nv } : r.l,
                            r: r.r.tag === oldV ? { ...r.r, tag: nv } : r.r,
                          }))
                        })));
                      }
                    }} placeholder="태그 이름" style={{ flex: 1, padding: "4px 7px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 12, outline: "none" }} />
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 3,
                      background: t.c, color: t.tx, fontSize: 10, fontWeight: 700, minWidth: 30, textAlign: "center",
                    }}>{t.v || "?"}</span>
                    <button onClick={() => {
                      const nTags = data.settings.tags.filter((_, i) => i !== idx);
                      setSettings({ tags: nTags });
                    }} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, padding: "0 2px", flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                const nTags = [...(data.settings.tags || []), { v: "새태그", c: "#6366F1", tx: "#fff" }];
                setSettings({ tags: nTags });
              }} style={{ marginTop: 5, padding: "4px 10px", borderRadius: 4, border: "1px dashed #ccc", background: "none", fontSize: 11, cursor: "pointer", color: "#888" }}>+ 태그 추가</button>
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
