import { useState, useEffect, useRef } from "react";
import logoImg from "./assets/logo.png";

/* ═══════ helpers ═══════ */
const uid = () => Math.random().toString(36).slice(2, 10);
// 마이그레이션: 구 num 필드는 이제 그대로 tag 값이 됨 (1~15)
const NUM_TAGS = ["1","2","3","4","5","6","7","8","9","10"];
const NUM_TAG_SET = new Set(NUM_TAGS);
const DEFAULT_NUM_COLOR = "#00391e";
const DEFAULT_TAGS = [
  { v: "개념", c: "#2563EB", tx: "#fff" },
  { v: "형태", c: "#ec6619", tx: "#fff" },
  { v: "예문", c: "#059669", tx: "#fff" },
  { v: "주의", c: "#dc2626", tx: "#fff" },
  { v: "예시", c: "#7e7e7f", tx: "#fff" },
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

const DEFAULT_SETTINGS = { slogan: "손에 잡히는 영어", tags: DEFAULT_TAGS };
const DEFAULT_UNIT = { title: "새 단원", rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) };

/* ═══════ CellProps (태그 + 마커 + 들여쓰기 통합 팝오버) ═══════ */
function CellProps({ cell, upd, tags, numColor, ghostTag, ghostMark }) {
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
      {/* 태그 (실제 or ghost) */}
      {cell.tag ? (
        <span onClick={() => setOpen(!open)} style={{ padding: "1px 6px", borderRadius: 3, background: tc.c, color: tc.tx, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>{cell.tag}</span>
      ) : ghostTag ? (
        <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 700, flexShrink: 0, visibility: "hidden" }}>{ghostTag}</span>
      ) : null}
      {/* 마커 (실제 or ghost) */}
      {cell.mark ? (
        <span onClick={() => setOpen(!open)} style={{ padding: "1px 5px", borderRadius: 3, background: "#f0e6dc", color: "#7a3d10", fontSize: 9.5, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>{cell.mark}</span>
      ) : ghostMark ? (
        <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 9.5, fontWeight: 700, flexShrink: 0, visibility: "hidden" }}>{ghostMark}</span>
      ) : null}
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
                background: indLv === lv ? "#00391e" : "#f3f4f6", color: indLv === lv ? "#fff" : "#888",
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

function EditorCell({ side, cell, upd, onUp, onDown, first, last, tags, numColor, idx, rows }) {
  const indLv = cell.indent || 0;
  const isEmpty = !cell.tag && !cell.mark && !cell.text && !cell.hdr;
  // 부모 행 찾기 (들여쓰기 기준)
  let parent = null;
  if (indLv > 0 && rows) {
    for (let k = idx - 1; k >= 0; k--) {
      if ((rows[k][side].indent || 0) < indLv) { parent = rows[k][side]; break; }
    }
  }
  const ghostTag = (indLv >= 1 && !cell.tag) ? parent?.tag : null;
  const ghostMark = (indLv >= 2 && !cell.mark) ? parent?.mark : null;
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
      background: cell.hdr ? "#e8efe9" : isEmpty ? "#f3f4f6" : "#fff", padding: "3px 4px",
      display: "flex", alignItems: "center", gap: 3,
      borderLeft: cell.hdr ? "3px solid #00391e" : "3px solid transparent",
      opacity: isEmpty ? 0.5 : 1,
    }}>
      <span style={{ fontSize: 8, color: "#bbb", fontWeight: 600, width: 14, textAlign: "right", flexShrink: 0, userSelect: "none" }}>{idx + 1}</span>
      <CellProps cell={cell} upd={upd} tags={tags} numColor={numColor} ghostTag={ghostTag} ghostMark={ghostMark} />
      <input value={cell.text} onChange={(e) => upd("text", e.target.value)} placeholder="내용..."
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); upd("indent", e.shiftKey ? Math.max(0, indLv - 1) : Math.min(2, indLv + 1)); }
        }}
        style={{ flex: 1, padding: "2px 5px", border: "1px solid #e5e7eb", borderRadius: 3, fontSize: 11.5, outline: "none", background: isEmpty ? "#eee" : "#fff", minWidth: 0, fontWeight: cell.bold ? 700 : 400, color: "#1f2937" }} />
      {TB(cell.hdr, () => upd("hdr", !cell.hdr), "헤더", "H", "#00391e", "#fff")}
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
          <EditorCell side={side} cell={row[side]} upd={(f, v) => onCellChange(row.id, side, f, v)} onUp={() => onMove(row.id, side, -1)} onDown={() => onMove(row.id, side, 1)} first={i === 0} last={i === rows.length - 1} tags={tags} numColor={numColor} idx={i} rows={rows} />
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

function Preview({ unit, isBlank, slogan, fontFamily, tags, numColor, printId }) {
  if (!unit) return <div style={{ padding: 40, color: "#bbb", textAlign: "center", fontSize: 13 }}>단원을 선택하세요</div>;
  return (
    <div id={printId || "print-wrapper"}>
      <div id={printId ? undefined : "print-area"} style={{
        padding: "20px 28px 20px", width: 740, height: 1046, boxSizing: "border-box",
        fontFamily: fontFamily || "'Pretendard','Malgun Gothic',sans-serif",
        background: "#f2f7f4",
        boxShadow: "0 2px 12px rgba(0,0,0,.1)", borderRadius: 3,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Top: badge + name field */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 3, height: 14, background: "#ec6619", borderRadius: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#00391e", letterSpacing: 1.5 }}>BLANK TEST</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, height: 18 }}>
            {isBlank ? (<>
              <span style={{ fontSize: 12, color: "#7e7e7f", fontWeight: 700, letterSpacing: 1 }}>NAME</span>
              <div style={{ width: 120, borderBottom: "1.5px solid #aaa", height: 18 }} />
            </>) : (
              <span style={{ fontSize: 12, color: "#00391e", fontWeight: 700, letterSpacing: 1, opacity: 0.45 }}>ANSWER SHEET</span>
            )}
          </div>
        </div>
        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 18px", color: "#111", letterSpacing: -0.5 }}>{unit.title}</h1>
        {/* Table */}
        <div style={{ border: "2px solid #00391e", borderRadius: 4, overflow: "hidden" }}>
          {/* Content rows — fixed height, no expansion */}
          {unit.rows.map((row, i) => {
            const prevRow = unit.rows[i - 1];
            const nextRow = unit.rows[i + 1];
            const isLast = i >= unit.rows.length - 1;
            const HDR_STYLE = { padding: "0 12px", display: "flex", alignItems: "center", fontWeight: 800, fontSize: 12, color: "#00391e", letterSpacing: 2, background: "#e8efe9", height: ROW_H, maxHeight: ROW_H, overflow: "hidden" };
            const renderCell = (cell, side) => {
              const isHdr = cell.hdr;
              const show = !isBlank || cell.vis;
              const tc = tagColor(cell.tag, tags, numColor);
              const empty = !cell.tag && !cell.mark && !cell.text && !isHdr && !cell.indent;
              const nxtHdr = side === "l" ? nextRow?.l.hdr : nextRow?.r.hdr;
              const btm = isLast ? "none" : ((isHdr && !nxtHdr) || (!isHdr && nxtHdr)) ? "2px solid #00391e" : "1px solid #e5e7eb";
              const extra = side === "r" ? { borderLeft: "2px solid #00391e" } : {};
              if (isHdr) return (
                <div style={{ ...HDR_STYLE, borderBottom: btm, ...extra }}>
                  <span style={{ ...TEXT_CLIP }}>{cell.text}</span>
                </div>
              );
              // 들여쓰기: 위로 올라가며 부모(들여쓰기 없는 행) 찾아서 투명 복제
              const indLv = cell.indent || 0;
              let parent = null;
              if (indLv > 0) {
                for (let k = i - 1; k >= 0; k--) {
                  const c = unit.rows[k][side];
                  if ((c.indent || 0) < indLv) { parent = c; break; }
                }
              }
              const ghostTag = (indLv >= 1) ? parent?.tag : null;
              const ghostMark = (indLv >= 2) ? parent?.mark : null;
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
        {/* Footer: logo center */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: -4 }}>
          <img src={logoImg} style={{ height: 48, objectFit: "contain" }} alt="" />
        </div>
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
      background: active ? "#fff7f0" : "transparent", border: active ? "1px solid #fed7aa" : "1px solid transparent",
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

/* ═══════ PrintThumbnails — 선택된 페이지만 그룹별로 표시 ═══════ */
function PrintThumbnails({ allUnits, printChecked, togglePrintCheck, fontFamily, slogan, tags, numColor }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(600);
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setContainerW(e.contentRect.width);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // 체크된 페이지만 수집
  const checkedPages = [];
  allUnits.forEach((u) => {
    ["answer", "blank"].forEach((mode) => {
      const key = `${u.filePath}::${mode}`;
      if (printChecked.has(key)) checkedPages.push({ ...u, mode, key });
    });
  });

  // 그룹별로 분류
  const grouped = {};
  const ungrouped = [];
  checkedPages.forEach((p) => {
    if (p.group) { if (!grouped[p.group]) grouped[p.group] = []; grouped[p.group].push(p); }
    else ungrouped.push(p);
  });

  const gap = 12;
  const labelH = 28;
  const thumbW = Math.min((containerW - gap * 3) / 2, 370);
  const scale = thumbW / 740;
  const thumbH = 1046 * scale;

  const renderPage = (p) => (
    <div key={p.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* 라벨 — 이미지 바깥 위 */}
      <div style={{ height: labelH, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{p.fileName}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: p.mode === "answer" ? "#00391e" : "#ec6619", letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>
          {p.mode === "answer" ? "— answer" : "— worksheet"}
        </span>
      </div>
      {/* 썸네일 */}
      <div onClick={() => togglePrintCheck(p.key)} style={{ position: "relative", cursor: "pointer", width: thumbW, height: thumbH, overflow: "hidden", borderRadius: 4, border: "2px solid #d1d5db", boxSizing: "border-box", background: "#fff" }}>
        <div id={`thumb-${p.key}`} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 740, pointerEvents: "none" }}>
          <Preview unit={p.unit} isBlank={p.mode === "blank"} slogan={slogan} fontFamily={fontFamily} tags={tags} numColor={numColor} printId={`pv-${p.key}`} />
        </div>
      </div>
    </div>
  );

  if (checkedPages.length === 0) return <div style={{ color: "#999", fontSize: 12, padding: 40, textAlign: "center" }}>왼쪽에서 인쇄할 페이지를 선택하세요</div>;

  return (
    <div ref={containerRef} id="print-thumbs" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20, paddingBottom: 20 }}>
      {Object.entries(grouped).map(([gName, pages]) => (
        <div key={gName}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#555", padding: "0 4px 6px", borderBottom: "2px solid #d1d5db", marginBottom: 10 }}>{gName}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap, justifyContent: "center" }}>
            {pages.map(renderPage)}
          </div>
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div>
          {Object.keys(grouped).length > 0 && <div style={{ fontSize: 12, fontWeight: 800, color: "#aaa", padding: "0 4px 6px", borderBottom: "2px solid #e5e7eb", marginBottom: 10 }}>미분류</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap, justifyContent: "center" }}>
            {ungrouped.map(renderPage)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ MAIN APP ═══════ */
export default function App() {
  // 작업 폴더 상태
  const [workspace, setWorkspace] = useState(null); // 폴더 경로
  const [fileList, setFileList] = useState([]); // [{name, path, group}]
  const [groups, setGroups] = useState([]); // [{name, path}]
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // 현재 편집 중인 단원
  const [unit, setUnit] = useState(null); // {title, rows}
  const [currentFile, setCurrentFile] = useState(null); // 파일 경로
  const [dirty, setDirty] = useState(false); // 변경 여부
  const [settings, setSettingsState] = useState({ ...DEFAULT_SETTINGS }); // 전역 설정

  // UI 상태
  const [previewMode, setPreviewMode] = useState("answer");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGrp, setNewGrp] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [splitPct, setSplitPct] = useState(50);
  const splitDragging = useRef(false);
  const splitContainerRef = useRef(null);
  const saveTimerRef = useRef(null);

  // 오른쪽 패널 탭: "edit" | "print"
  const [rightTab, setRightTab] = useState("edit");
  const [allUnits, setAllUnits] = useState([]); // [{filePath, fileName, unit}]
  const [printChecked, setPrintChecked] = useState(new Set()); // "filePath::answer" | "filePath::blank"
  const [printing, setPrinting] = useState(false);

  // 전역 설정 변경 + 저장
  const setSettings = (s) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...s };
      window.electronAPI?.saveAppSettings({ editorSettings: next });
      return next;
    });
  };

  // 마이그레이션 (구 형식 파일 지원)
  const migrateUnit = (p) => {
    if (!p.rows) return p;
    // 구 형식: unit 안에 settings가 있으면 전역 설정으로 흡수 (최초 1회)
    if (p.settings) {
      const us = p.settings;
      if (!us.tags) us.tags = DEFAULT_TAGS;
      delete us.ptags;
      us.tags = us.tags.filter((t) => !OLD_PTAG_VALUES.has(t.v) && !NUM_TAG_SET.has(t.v));
      // 전역 설정이 기본값이면 파일의 설정으로 덮어씀
      setSettingsState((prev) => {
        const isDefault = prev.slogan === DEFAULT_SETTINGS.slogan;
        return isDefault ? { ...prev, ...us } : prev;
      });
      delete p.settings;
    }
    p.rows = padRows(p.rows);
    p.rows.forEach((r) => { [r.l, r.r].forEach((c) => {
      if (c.mark === undefined) c.mark = "";
      if (c.indent === true) c.indent = 1; else if (!c.indent) c.indent = 0;
      if (c.num) { if (!c.tag) c.tag = c.num; } delete c.num;
      if (c.ptag !== undefined) { if (!c.mark) { const pv = c.ptag; c.mark = (pv === "영작" || pv === "수동태") ? `[${pv}]` : pv; } delete c.ptag; }
      if (c.tag && OLD_PTAG_VALUES.has(c.tag)) { if (!c.mark) { const tv = c.tag; c.mark = (tv === "영작" || tv === "수동태") ? `[${tv}]` : tv; } c.tag = ""; }
      if (c.vis === undefined) { c.vis = !c.ans; delete c.ans; }
    }); });
    return p;
  };

  // 파일 열기
  const openFile = async (filePath) => {
    if (!window.electronAPI) return;
    // 현재 파일 저장
    if (dirty && currentFile && unit) await saveFile();
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) return;
    try {
      let d = JSON.parse(result.content);
      // 구 형식 (전체 데이터 파일) 호환: 첫 번째 unit 추출
      if (d.units && !d.rows) {
        const oldSettings = d.settings || {};
        d = { ...d.units[0], settings: oldSettings };
      }
      d = migrateUnit(d);
      if (!d.rows) return;
      setUnit(d);
      setCurrentFile(filePath);
      setDirty(false);
    } catch {}
  };

  // 파일 저장
  const saveFile = async () => {
    if (!window.electronAPI || !currentFile || !unit) return;
    const content = JSON.stringify(unit, null, 2);
    await window.electronAPI.writeFile(currentFile, content);
    setDirty(false);
  };

  // 자동저장 (debounce 1초)
  useEffect(() => {
    if (!dirty || !currentFile || !unit) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveFile(), 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [unit, dirty]);

  // unit 변경 헬퍼
  const updateUnit = (fn) => {
    setUnit((u) => {
      if (!u) return u;
      const next = typeof fn === "function" ? fn(u) : { ...u, ...fn };
      return next;
    });
    setDirty(true);
  };

  // 폴더 스캔 결과 적용
  const applyFolderScan = ({ dirPath, files, groups: grps }) => {
    setWorkspace(dirPath);
    setFileList(files);
    setGroups(grps);
  };

  // 폴더 새로고침
  const refreshFolder = async () => {
    if (!window.electronAPI || !workspace) return;
    const scan = await window.electronAPI.scanFolder(workspace);
    setFileList(scan.files);
    setGroups(scan.groups);
  };

  // Electron 이벤트 + 전역 설정 로드
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onFolderOpened(applyFolderScan);
    window.electronAPI.onMenuNewUnit(() => addNewUnit(null));
    window.electronAPI.onMenuSave(() => saveFile());
    window.electronAPI.getAppSettings().then((s) => {
      if (s?.editorSettings) setSettingsState({ ...DEFAULT_SETTINGS, ...s.editorSettings });
    });
  }, []);

  // 인쇄 탭으로 전환 시 모든 파일 로드
  const loadAllUnits = async () => {
    if (!window.electronAPI) return;
    // 현재 편집 중인 파일 먼저 저장
    if (dirty && currentFile && unit) await saveFile();
    const loaded = [];
    for (const f of fileList) {
      const result = await window.electronAPI.readFile(f.path);
      if (!result.success) continue;
      try {
        let d = JSON.parse(result.content);
        if (d.units && !d.rows) d = { ...d.units[0], settings: d.settings || {} };
        d = migrateUnit(d);
        if (d.rows) loaded.push({ filePath: f.path, fileName: f.name.replace(/\.(btm|json)$/, ""), group: f.group, unit: d });
      } catch {}
    }
    setAllUnits(loaded);
    // 기본: 전체 해제
    setPrintChecked(new Set());
  };

  const switchToTab = (tab) => {
    setRightTab(tab);
    if (tab === "print") loadAllUnits();
  };

  // 인쇄 체크 토글
  const togglePrintCheck = (key) => setPrintChecked((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleAllPrintCheck = () => {
    const allKeys = [];
    allUnits.forEach((u) => { allKeys.push(`${u.filePath}::answer`); allKeys.push(`${u.filePath}::blank`); });
    setPrintChecked((s) => s.size === allKeys.length ? new Set() : new Set(allKeys));
  };
  const toggleAllByMode = (mode) => {
    const keys = allUnits.map((u) => `${u.filePath}::${mode}`);
    setPrintChecked((s) => {
      const n = new Set(s);
      const allOn = keys.every((k) => n.has(k));
      keys.forEach((k) => allOn ? n.delete(k) : n.add(k));
      return n;
    });
  };
  const toggleGroupPrint = (groupUnits, mode) => {
    // mode가 없으면 A+W 전체, 있으면 해당 모드만
    const keys = [];
    groupUnits.forEach((u) => {
      if (!mode || mode === "answer") keys.push(`${u.filePath}::answer`);
      if (!mode || mode === "blank") keys.push(`${u.filePath}::blank`);
    });
    setPrintChecked((s) => {
      const n = new Set(s);
      const allOn = keys.every((k) => n.has(k));
      keys.forEach((k) => allOn ? n.delete(k) : n.add(k));
      return n;
    });
  };

  // 인쇄 실행 — 체크된 썸네일의 HTML을 추출
  const executePrint = async () => {
    if (!window.electronAPI || printChecked.size === 0) return;
    setPrinting(true);
    // 체크된 썸네일들의 내부 HTML 수집
    const htmlParts = [];
    allUnits.forEach((u) => {
      ["answer", "blank"].forEach((mode) => {
        const key = `${u.filePath}::${mode}`;
        if (!printChecked.has(key)) return;
        const el = document.getElementById(`thumb-${key}`);
        if (el) htmlParts.push(el.innerHTML);
      });
    });
    if (!htmlParts.length) { setPrinting(false); return; }
    const pagesHtml = htmlParts.map((h) =>
      `<div style="width:210mm;min-height:297mm;display:flex;justify-content:center;align-items:center;page-break-after:always">${h}</div>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css">
      <style>@page{size:A4;margin:0}body{margin:0;font-family:'Pretendard','Malgun Gothic',sans-serif}
      div:last-child{page-break-after:auto!important}</style>
      </head><body>${pagesHtml}</body></html>`;
    await window.electronAPI.printPreview(html);
    setPrinting(false);
  };

  // 새 단원 생성
  const addNewUnit = async (groupName) => {
    if (!window.electronAPI || !workspace) return;
    if (dirty && currentFile && unit) await saveFile();
    const dir = groupName ? `${workspace}/${groupName}` : workspace;
    // 겹치지 않는 파일명
    let name = "새 단원"; let n = 1;
    const existing = new Set(fileList.map((f) => f.name));
    while (existing.has(`${name}.btm`)) { name = `새 단원 (${n++})`; }
    const filePath = `${dir}/${name}.btm`;
    const newUnit = { title: name, rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) };
    await window.electronAPI.writeFile(filePath, JSON.stringify(newUnit, null, 2));
    await refreshFolder();
    setUnit(newUnit);
    setCurrentFile(filePath);
    setDirty(false);
  };

  // 파일 삭제
  const deleteFile = async (filePath) => {
    if (!window.electronAPI || !confirm("삭제할까요?")) return;
    await window.electronAPI.deleteFile(filePath);
    if (currentFile === filePath) { setUnit(null); setCurrentFile(null); setDirty(false); }
    await refreshFolder();
  };

  // 파일 복제
  const duplicateFile = async (filePath) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) return;
    const dir = filePath.replace(/[/\\][^/\\]+$/, "");
    const baseName = filePath.replace(/^.*[/\\]/, "").replace(/\.(btm|json)$/, "");
    let name = `${baseName} (복사)`; let n = 1;
    const existing = new Set(fileList.map((f) => f.name));
    while (existing.has(`${name}.btm`)) { name = `${baseName} (복사 ${n++})`; }
    const newPath = `${dir}/${name}.btm`;
    await window.electronAPI.writeFile(newPath, result.content);
    await refreshFolder();
    openFile(newPath);
  };

  // 파일 → 다른 그룹으로 이동
  const moveFileToGroup = async (filePath, groupName) => {
    if (!window.electronAPI || !workspace) return;
    const fileName = filePath.replace(/^.*[/\\]/, "");
    const newDir = groupName ? `${workspace}/${groupName}` : workspace;
    const newPath = `${newDir}/${fileName}`;
    if (newPath === filePath) return;
    await window.electronAPI.renameFile(filePath, newPath);
    if (currentFile === filePath) setCurrentFile(newPath);
    await refreshFolder();
  };

  // 그룹(폴더) 추가
  const addGroup = async () => {
    if (!window.electronAPI || !workspace || !newGrp.trim()) return;
    await window.electronAPI.createGroupFolder(`${workspace}/${newGrp.trim()}`);
    setNewGrp(""); setAddGroupOpen(false);
    await refreshFolder();
  };

  // 그룹(폴더) 삭제
  const deleteGroup = async (groupPath) => {
    if (!window.electronAPI || !confirm("그룹을 삭제할까요? (파일은 미분류로 이동됩니다)")) return;
    await window.electronAPI.deleteGroupFolder(groupPath);
    await refreshFolder();
  };

  const toggleGroup = (name) => setCollapsedGroups((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });

  // 행 편집 헬퍼
  const updateCellField = (rid, side, field, val) => updateUnit((u) => ({ ...u, rows: u.rows.map((r) => r.id === rid ? { ...r, [side]: { ...r[side], [field]: val } } : r) }));
  const moveCellContent = (rid, side, dir) => updateUnit((u) => {
    const rs = u.rows.map(r => ({ ...r, l: { ...r.l }, r: { ...r.r } }));
    const i = rs.findIndex((r) => r.id === rid); const j = i + dir;
    if (j < 0 || j >= rs.length) return u;
    const tmp = rs[i][side]; rs[i][side] = rs[j][side]; rs[j][side] = tmp;
    return { ...u, rows: rs };
  });


  const ungroupedFiles = fileList.filter((f) => !f.group);
  const BS = { padding: "4px 9px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 10.5, cursor: "pointer", fontWeight: 500, color: "#555" };

  const fontFamily = `'Pretendard','Malgun Gothic',sans-serif`;

  // 폴더 미선택 시 시작 화면
  if (!workspace) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Pretendard',sans-serif", background: "#f0f2f5" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#00391e", marginBottom: 4 }}>백지테스트 메이커</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>작업 폴더를 선택해서 시작하세요</div>
        <button onClick={() => window.electronAPI?.selectFolder()} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "#ec6619", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          폴더 열기
        </button>
      </div>
    </div>
  );

  const FileItem = ({ f }) => {
    const active = currentFile === f.path;
    const displayName = f.name.replace(/\.(btm|json)$/, "");
    const [menuOpen, setMenuOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      if (!menuOpen) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
      document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, [menuOpen]);
    return (
      <div onClick={() => openFile(f.path)} style={{
        padding: "6px 8px 6px 20px", borderRadius: 4, cursor: "pointer", marginBottom: 1,
        background: active ? "#fff7f0" : "transparent", border: active ? "1px solid #fed7aa" : "1px solid transparent",
        display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative",
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
        </div>
        <div ref={ref} style={{ position: "relative" }}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#aaa", padding: "2px 4px" }}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,.15)", padding: 4, zIndex: 30, minWidth: 120 }}>
              <MItem onClick={() => { duplicateFile(f.path); setMenuOpen(false); }}>📋 복제</MItem>
              <MItem onClick={() => { deleteFile(f.path); setMenuOpen(false); }}>🗑 삭제</MItem>
              {groups.length > 0 && <>
                <div style={{ height: 1, background: "#eee", margin: "3px 0" }} />
                <div style={{ padding: "3px 8px", fontSize: 9.5, color: "#aaa", fontWeight: 600 }}>그룹 이동</div>
                {f.group && <MItem onClick={() => { moveFileToGroup(f.path, null); setMenuOpen(false); }}>미분류</MItem>}
                {groups.filter((g) => g.name !== f.group).map((g) => <MItem key={g.name} onClick={() => { moveFileToGroup(f.path, g.name); setMenuOpen(false); }}>{g.name}</MItem>)}
              </>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily, fontSize: 13, background: "#f0f2f5" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css');
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
        input:focus,select:focus{border-color:#f5a855!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
      `}</style>

      {/* ═══ 최상위: 로고 + 모드 탭 ═══ */}
      <div className="no-print" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "6px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#00391e", letterSpacing: 1.5 }}>백지테스트</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "#7e7e7f" }}>메이커</span>
        <div style={{ width: 1, height: 18, background: "#e5e7eb", margin: "0 4px" }} />
        <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 6, padding: 2 }}>
          <button onClick={() => setRightTab("edit")} style={{ padding: "5px 20px", borderRadius: 5, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: rightTab === "edit" ? "#fff" : "transparent", color: rightTab === "edit" ? "#00391e" : "#aaa", boxShadow: rightTab === "edit" ? "0 1px 2px rgba(0,0,0,.06)" : "none" }}>편집</button>
          <button onClick={() => switchToTab("print")} style={{ padding: "5px 20px", borderRadius: 5, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: rightTab === "print" ? "#fff" : "transparent", color: rightTab === "print" ? "#ec6619" : "#aaa", boxShadow: rightTab === "print" ? "0 1px 2px rgba(0,0,0,.06)" : "none" }}>인쇄</button>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.electronAPI?.selectFolder()} style={{ ...BS, fontSize: 10 }}>📁 폴더 변경</button>
        <button onClick={() => setSettingsOpen(true)} style={{ ...BS, fontSize: 10 }}>⚙ 설정</button>
      </div>

      {/* ═══ 편집 모드 ═══ */}
      {rightTab === "edit" && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* 편집 사이드바 */}
          <div className="no-print" style={{ width: sidebarOpen ? 210 : 40, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .2s ease" }}>
            {!sidebarOpen ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 10 }}>
                <button onClick={() => setSidebarOpen(true)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, padding: 4, color: "#ec6619" }} title="사이드바 열기">☰</button>
              </div>
            ) : <>
            <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setSidebarOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, padding: "0 2px", color: "#aaa", flexShrink: 0 }} title="접기">◀</button>
                <button onClick={() => addNewUnit(null)} style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", background: "#ec6619", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ 단원</button>
                <button onClick={() => setAddGroupOpen(true)} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid #d1d5db", background: "#fff", fontSize: 10.5, cursor: "pointer", color: "#888" }}>+ 그룹</button>
              </div>
              {addGroupOpen && (
                <div style={{ display: "flex", gap: 3, marginTop: 5 }}>
                  <input value={newGrp} onChange={(e) => setNewGrp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} placeholder="그룹 이름" autoFocus style={{ flex: 1, padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 3, fontSize: 11, outline: "none" }} />
                  <button onClick={addGroup} style={{ padding: "3px 7px", border: "none", borderRadius: 3, background: "#ec6619", color: "#fff", fontSize: 10, cursor: "pointer" }}>확인</button>
                  <button onClick={() => { setAddGroupOpen(false); setNewGrp(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 11 }}>✕</button>
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px" }}>
              {groups.map((g) => {
                const gFiles = fileList.filter((f) => f.group === g.name);
                const collapsed = collapsedGroups.has(g.name);
                return (
                  <div key={g.name} style={{ marginBottom: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 5px", borderRadius: 3, cursor: "pointer", userSelect: "none" }} onClick={() => toggleGroup(g.name)}>
                      <span style={{ fontSize: 8, color: "#aaa", transform: collapsed ? "rotate(-90deg)" : "rotate(0)", transition: ".15s" }}>▼</span>
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#374151" }}>{g.name}</span>
                      <span style={{ fontSize: 9, color: "#bbb" }}>{gFiles.length}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteGroup(g.path); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 9, color: "#ddd", padding: 0 }}>✕</button>
                    </div>
                    {!collapsed && gFiles.map((f) => <FileItem key={f.path} f={f} />)}
                    {!collapsed && <button onClick={() => addNewUnit(g.name)} style={{ width: "100%", padding: 3, border: "1px dashed #ddd", borderRadius: 3, background: "none", fontSize: 10, color: "#bbb", cursor: "pointer", marginTop: 1, marginBottom: 3 }}>+ 단원</button>}
                  </div>
                );
              })}
              {ungroupedFiles.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {groups.length > 0 && <div style={{ padding: "3px 5px", fontSize: 10, color: "#aaa", fontWeight: 600 }}>미분류</div>}
                  {ungroupedFiles.map((f) => <FileItem key={f.path} f={f} />)}
                </div>
              )}
            </div>
            <div style={{ padding: "6px 8px", borderTop: "1px solid #e5e7eb" }}>
            </div>
            </>}
          </div>

          {/* 편집 메인 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* 서브바 */}
            <div className="no-print" style={{ background: "#f9faf8", borderBottom: "1px solid #e5e7eb", padding: "5px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {unit ? (<>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <input value={unit.title} onChange={(e) => updateUnit({ title: e.target.value })} style={{ fontSize: 14, fontWeight: 700, border: "none", outline: "none", background: "transparent", padding: "2px 4px", borderBottom: "2px solid transparent", width: 170 }} onFocus={(e) => { e.target.style.borderBottomColor = "#f5a855"; }} onBlur={(e) => { e.target.style.borderBottomColor = "transparent"; }} />
                  <span style={{ fontSize: 13, color: "#bbb", cursor: "text" }} onClick={(e) => { e.target.previousSibling.focus(); }}>✎</span>
                </div>
                <div style={{ display: "flex", gap: 2, background: "#e8efe9", borderRadius: 6, padding: 2 }}>
                  {[{ k: "answer", l: "ANSWER" }, { k: "blank", l: "WORKSHEET" }].map((v) => (
                    <button key={v.k} onClick={() => setPreviewMode(v.k)} style={{
                      padding: "3px 12px", borderRadius: 5, border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5,
                      background: previewMode === v.k ? "#fff" : "transparent",
                      color: previewMode === v.k ? (v.k === "answer" ? "#00391e" : "#ec6619") : "#999",
                      boxShadow: previewMode === v.k ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                    }}>{v.l}</button>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <button onClick={() => setPreviewZoom(Math.max(30, previewZoom - 10))} style={{ width: 22, height: 22, border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#555", lineHeight: 1 }}>−</button>
                <span style={{ fontSize: 10, color: "#888", fontWeight: 600, minWidth: 32, textAlign: "center" }}>{previewZoom}%</span>
                <button onClick={() => setPreviewZoom(Math.min(150, previewZoom + 10))} style={{ width: 22, height: 22, border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#555", lineHeight: 1 }}>+</button>
              </>) : <span style={{ color: "#aaa", fontSize: 12 }}>사이드바에서 단원을 선택하세요</span>}
            </div>
            {/* Split: 에디터 + 미리보기 */}
            <div ref={splitContainerRef} style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}
              onMouseMove={(e) => { if (!splitDragging.current) return; const rect = splitContainerRef.current.getBoundingClientRect(); const pct = ((e.clientX - rect.left) / rect.width) * 100; setSplitPct(Math.max(20, Math.min(80, pct))); }}
              onMouseUp={() => { splitDragging.current = false; }}
              onMouseLeave={() => { splitDragging.current = false; }}
            >
              <div className="no-print" style={{ width: `${splitPct}%`, overflowY: "auto", padding: "8px 10px", background: "#fafafa" }}>
                {unit ? (
                  <>
                    <EditorSideGroup side="l" label="왼쪽 (L)" color="#00391e" rows={unit.rows} onCellChange={updateCellField} onMove={moveCellContent} tags={settings.tags} numColor={settings.numTagColor} />
                    <EditorSideGroup side="r" label="오른쪽 (R)" color="#ec6619" rows={unit.rows} onCellChange={updateCellField} onMove={moveCellContent} tags={settings.tags} numColor={settings.numTagColor} />
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: 40, color: "#bbb" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                    <div style={{ fontSize: 12 }}>사이드바에서 단원을 선택하세요</div>
                  </div>
                )}
              </div>
              <div className="no-print" onMouseDown={() => { splitDragging.current = true; }} style={{ width: 6, cursor: "col-resize", background: "#e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                <div style={{ width: 2, height: 32, borderRadius: 1, background: "#aaa" }} />
              </div>
              <div style={{ flex: 1, overflow: "auto", background: "#e8e8e8", display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 8px" }}>
                <div id="preview-zoom" style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: "top center", flexShrink: 0 }}>
                  <Preview unit={unit} isBlank={previewMode === "blank"} slogan={settings.slogan} fontFamily={fontFamily} tags={settings.tags} numColor={settings.numTagColor} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 인쇄 모드 ═══ */}
      {rightTab === "print" && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* 인쇄 사이드바 */}
          <div className="no-print" style={{ width: 220, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", flex: 1 }}>단원 목록</span>
              <button onClick={toggleAllPrintCheck} style={{ border: "none", background: "none", fontSize: 10, color: "#555", cursor: "pointer", fontWeight: 600 }}>
                {printChecked.size === allUnits.length * 2 ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(() => {
                const grouped = {};
                const ungrouped = [];
                allUnits.forEach((u) => {
                  if (u.group) { if (!grouped[u.group]) grouped[u.group] = []; grouped[u.group].push(u); }
                  else ungrouped.push(u);
                });
                const renderUnit = (u) => {
                  const aKey = `${u.filePath}::answer`;
                  const bKey = `${u.filePath}::blank`;
                  return (
                    <div key={u.filePath} style={{ display: "flex", alignItems: "center", gap: 0, padding: "5px 6px 5px 14px", borderBottom: "1px solid #f5f5f5" }}>
                      <span style={{ flex: 1, fontSize: 11.5, fontWeight: 500, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fileName}</span>
                      <label style={{ display: "flex", alignItems: "center", gap: 2, cursor: "pointer", padding: "2px 5px", borderRadius: 3, background: printChecked.has(aKey) ? "#e8efe9" : "transparent" }} title="Answer Sheet">
                        <input type="checkbox" checked={printChecked.has(aKey)} onChange={() => togglePrintCheck(aKey)} style={{ accentColor: "#00391e", width: 13, height: 13 }} />
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: printChecked.has(aKey) ? "#00391e" : "#ccc" }}>A</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 2, cursor: "pointer", padding: "2px 5px", borderRadius: 3, background: printChecked.has(bKey) ? "#fef3eb" : "transparent" }} title="Worksheet">
                        <input type="checkbox" checked={printChecked.has(bKey)} onChange={() => togglePrintCheck(bKey)} style={{ accentColor: "#ec6619", width: 13, height: 13 }} />
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: printChecked.has(bKey) ? "#ec6619" : "#ccc" }}>W</span>
                      </label>
                    </div>
                  );
                };
                return (<>
                  {Object.entries(grouped).map(([gName, gUnits]) => (
                    <div key={gName}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 8px", background: "#f9fafb", borderBottom: "1px solid #eee" }}>
                        <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: "#555" }}>{gName}</span>
                        <button onClick={() => toggleGroupPrint(gUnits, "answer")} style={{ border: "none", background: "none", fontSize: 8.5, color: "#00391e", cursor: "pointer", fontWeight: 700 }}>A</button>
                        <button onClick={() => toggleGroupPrint(gUnits, "blank")} style={{ border: "none", background: "none", fontSize: 8.5, color: "#ec6619", cursor: "pointer", fontWeight: 700 }}>W</button>
                        <button onClick={() => toggleGroupPrint(gUnits)} style={{ border: "none", background: "none", fontSize: 8.5, color: "#888", cursor: "pointer", fontWeight: 600 }}>전체</button>
                      </div>
                      {gUnits.map(renderUnit)}
                    </div>
                  ))}
                  {ungrouped.length > 0 && (<>
                    {Object.keys(grouped).length > 0 && <div style={{ padding: "5px 8px", background: "#f9fafb", borderBottom: "1px solid #eee", fontSize: 10.5, fontWeight: 700, color: "#aaa" }}>미분류</div>}
                    {ungrouped.map(renderUnit)}
                  </>)}
                </>);
              })()}
              {allUnits.length === 0 && <div style={{ padding: 16, color: "#bbb", fontSize: 11, textAlign: "center" }}>파일이 없습니다</div>}
            </div>
          </div>
          {/* 인쇄 메인 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div className="no-print" style={{ background: "#fdf8f4", borderBottom: "1px solid #e5e7eb", padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "#888" }}>{printChecked.size}페이지 선택됨</span>
              <div style={{ flex: 1 }} />
              <button onClick={executePrint} disabled={printing || printChecked.size === 0} style={{ padding: "5px 16px", borderRadius: 5, border: "none", background: (printing || printChecked.size === 0) ? "#ccc" : "#ec6619", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: (printing || printChecked.size === 0) ? "default" : "pointer" }}>
                {printing ? "처리 중..." : "🖨 인쇄"}
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", background: "#e8e8e8", padding: "12px" }}>
              <PrintThumbnails allUnits={allUnits} printChecked={printChecked} togglePrintCheck={togglePrintCheck} fontFamily={fontFamily} slogan={settings.slogan} tags={settings.tags || DEFAULT_TAGS} numColor={settings.numTagColor} />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSettingsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, width: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>설정</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>슬로건</label>
              <input value={settings.slogan || ""} onChange={(e) => setSettings({ slogan: e.target.value })} placeholder="예: 손에 잡히는 영어" style={{ width: "100%", padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12.5, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* ── 숫자 태그 색상 ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>숫자 태그 색상</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="color" value={settings.numTagColor || DEFAULT_NUM_COLOR} onChange={(e) => setSettings({ numTagColor: e.target.value })}
                  style={{ width: 30, height: 30, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", padding: 1 }} />
                <div style={{ display: "flex", gap: 2 }}>
                  {NUM_TAGS.slice(0, 5).map((n) => (
                    <span key={n} style={{ display: "inline-block", padding: "1px 6px", borderRadius: 3, background: settings.numTagColor || DEFAULT_NUM_COLOR, color: "#fff", fontSize: 10, fontWeight: 700 }}>{n}</span>
                  ))}
                </div>
                {settings.numTagColor && settings.numTagColor !== DEFAULT_NUM_COLOR && (
                  <button onClick={() => setSettings({ numTagColor: null })} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 10 }}>초기화</button>
                )}
              </div>
            </div>

            {/* ── 태그 관리 ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>일반 태그 관리</label>
              <span style={{ fontSize: 10, color: "#999", display: "block", marginBottom: 5 }}>추가/삭제/색상 변경 가능</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {(settings.tags || []).map((t, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="color" value={t.c} onChange={(e) => {
                      const nTags = [...settings.tags];
                      nTags[idx] = { ...nTags[idx], c: e.target.value };
                      setSettings({ tags: nTags });
                    }} style={{ width: 26, height: 26, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", padding: 1 }} />
                    <input value={t.v} onChange={(e) => {
                      const nv = e.target.value;
                      const nTags = [...settings.tags];
                      const oldV = nTags[idx].v;
                      nTags[idx] = { ...nTags[idx], v: nv };
                      setSettings({ tags: nTags });
                      if (oldV && oldV !== nv && unit) {
                        updateUnit((u) => ({
                          ...u, rows: u.rows.map((r) => ({
                            ...r,
                            l: r.l.tag === oldV ? { ...r.l, tag: nv } : r.l,
                            r: r.r.tag === oldV ? { ...r.r, tag: nv } : r.r,
                          }))
                        }));
                      }
                    }} placeholder="태그 이름" style={{ flex: 1, padding: "4px 7px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 12, outline: "none" }} />
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 3,
                      background: t.c, color: t.tx, fontSize: 10, fontWeight: 700, minWidth: 30, textAlign: "center",
                    }}>{t.v || "?"}</span>
                    <button onClick={() => {
                      const nTags = settings.tags.filter((_, i) => i !== idx);
                      setSettings({ tags: nTags });
                    }} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, padding: "0 2px", flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                const nTags = [...(settings.tags || []), { v: "새태그", c: "#6366F1", tx: "#fff" }];
                setSettings({ tags: nTags });
              }} style={{ marginTop: 5, padding: "4px 10px", borderRadius: 4, border: "1px dashed #ccc", background: "none", fontSize: 11, cursor: "pointer", color: "#888" }}>+ 태그 추가</button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setSettingsOpen(false)} style={{ padding: "7px 18px", borderRadius: 5, border: "none", background: "#ec6619", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
