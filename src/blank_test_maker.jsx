import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import logoImg from "./assets/logo.png";

/* ═══════ helpers ═══════ */
const uid = () => Math.random().toString(36).slice(2, 10);
// 태그 (tag): 색상 뱃지로 표시되는 분류/라벨 — 텍스트 안에 #태그이름 으로 삽입
const DEFAULT_TAGS = [
  { v: "개념", c: "#2563EB", tx: "#fff" },
  { v: "형태", c: "#ec6619", tx: "#fff" },
  { v: "예문", c: "#059669", tx: "#fff" },
  { v: "주의", c: "#dc2626", tx: "#fff" },
  { v: "예시", c: "#7e7e7f", tx: "#fff" },
];
const NO_TAG = { v: "", label: "태그 없음", c: "#d1d5db", tx: "#6b7280" };
const tagColor = (v, tags) => {
  if (!v) return NO_TAG;
  return (tags || DEFAULT_TAGS).find((t) => t.v === v) || NO_TAG;
};
const emptyRow = () => ({
  id: uid(),
  l: { text: "", vis: false, bold: false, hdr: false, indent: 0 },
  r: { text: "", vis: false, bold: false, hdr: false, indent: 0 },
});

/* ═══════ 인라인 마크업 파서 ═══════ */
// #태그 → 컬러 뱃지, [라벨] → 가벼운 라벨, [[이스케이프]] → 리터럴 [이스케이프]
const parseInlineMarkup = (text, tags) => {
  if (!text) return [];
  const tagNames = (tags || DEFAULT_TAGS).map((t) => t.v).filter(Boolean);
  // 긴 태그이름 먼저 매칭 (예: "주의사항" 이 "주의"보다 먼저)
  tagNames.sort((a, b) => b.length - a.length);
  const segments = [];
  const pushText = (ch) => {
    if (segments.length && segments[segments.length - 1].type === "text") segments[segments.length - 1].value += ch;
    else segments.push({ type: "text", value: ch });
  };
  let i = 0;
  while (i < text.length) {
    // #태그
    if (text[i] === "#") {
      let matched = false;
      for (const tn of tagNames) {
        if (text.substring(i + 1, i + 1 + tn.length) === tn) {
          const after = i + 1 + tn.length;
          if (after >= text.length || /[\s#\[]/.test(text[after])) {
            const tc = tagColor(tn, tags);
            segments.push({ type: "tag", value: tn, c: tc.c, tx: tc.tx });
            i = after;
            if (i < text.length && text[i] === " ") i++; // 태그 뒤 공백 하나 소비
            matched = true;
            break;
          }
        }
      }
      if (!matched) { pushText("#"); i++; }
      continue;
    }
    // [[이스케이프]] → 리터럴 [...]
    if (text[i] === "[" && text[i + 1] === "[") {
      const close = text.indexOf("]]", i + 2);
      if (close !== -1) {
        pushText("[" + text.substring(i + 2, close) + "]");
        i = close + 2;
        continue;
      }
    }
    // [라벨]
    if (text[i] === "[") {
      const close = text.indexOf("]", i + 1);
      if (close !== -1 && close > i + 1) {
        segments.push({ type: "label", value: text.substring(i + 1, close) });
        i = close + 1;
        if (i < text.length && text[i] === " ") i++; // 라벨 뒤 공백 하나 소비
        continue;
      }
    }
    pushText(text[i]);
    i++;
  }
  return segments;
};


/* ═══════ row helpers ═══════ */
const TOTAL_ROWS = 30; // A4 fixed row count
const padRows = (rows) => {
  if (rows.length >= TOTAL_ROWS) return rows.slice(0, TOTAL_ROWS);
  return [...rows, ...Array.from({ length: TOTAL_ROWS - rows.length }, emptyRow)];
};

/* ═══════ default data ═══════ */
const mk = (ld, rd) => ({
  id: uid(),
  l: { text: ld.x || "", vis: !ld.a, bold: !!ld.b, indent: ld.i || 0 },
  r: { text: rd.x || "", vis: !rd.a, bold: !!rd.b, indent: rd.i || 0 },
});

const hdrRow = (lText, rText) => ({
  id: uid(),
  l: { text: lText, vis: true, bold: false, hdr: true, indent: 0 },
  r: { text: rText, vis: true, bold: false, hdr: true, indent: 0 },
});

const PASSIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "능동: 주어가 동사를 직접 함", a: 1 }, { x: "영작 & 수동태 전환 연습", b: 1 }),
  mk({ x: "수동: 주어가 동사를 다른 행위자에 의해 당함", a: 1 }, { x: "1 나의 친구들은 나를 사랑한다." }),
  mk({}, { x: "[영작] My friends love me.", a: 1 }),
  mk({ x: "능동태 -> 수동태 전환방법", b: 1 }, { x: "[수동태] I am loved by my friends.", a: 1 }),
  mk({ x: "#예문 She wrote a letter.", a: 1 }, { x: "2 나는 접시들을 씻는다." }),
  mk({ x: "1) 능동태의 주어, 동사, 목적어를 찾는다.", a: 1 }, { x: "[영작] I wash the dishes.", a: 1 }),
  mk({ x: "=> 주어: She / 동사: wrote / 목적어: a letter", a: 1 }, { x: "[수동태] The dishes are washed by me.", a: 1 }),
  mk({ x: "2) 능동태의 시제를 파악한다.", a: 1 }, { x: "3 그는 창문을 닫았다." }),
  mk({ x: "=> 과거", a: 1 }, { x: "[영작] He closed the window.", a: 1 }),
  mk({ x: "3) 능동태의 목적어를 수동태의 주어 자리에 쓴다.", a: 1 }, { x: "[수동태] The window was closed by him.", a: 1 }),
  mk({ x: "=> A letter", a: 1 }, { x: "4 Joy는 컵들을 깼다." }),
  mk({ x: "4) be동사를 수/시제에 맞게 쓴다.", a: 1 }, { x: "[영작] Joy broke the cups.", a: 1 }),
  mk({ x: "=> A letter was", a: 1 }, { x: "[수동태] The cups were broken by Joy.", a: 1 }),
  mk({ x: "5) 동사를 p.p형태로 바꾼다.", a: 1 }, { x: "5 그녀는 파티를 개최할 것이다." }),
  mk({ x: "=> A letter was written", a: 1 }, { x: "[영작] She will hold a party.", a: 1 }),
  mk({ x: "6) by + 원래 주어를 목적격으로 쓴다.", a: 1 }, { x: "[수동태] A party will be held by her.", a: 1 }),
  mk({ x: "=> A letter was written by her.", a: 1 }, { x: "6 할머니는 케이크를 구울 것이다." }),
  mk({ x: "#주의 A letter was written by she. (X)", a: 1 }, { x: "[영작] Grandma will bake the cake.", a: 1 }),
  mk({}, { x: "[수동태] The cake will be baked by Grandma.", a: 1 }),
  mk({ x: "by + 목적격의 생략", b: 1 }, { x: "7 사람들은 미국에서 영어를 말한다." }),
  mk({ x: "#개념 행위자가 분명하지 않거나 중요하지 않을 때", a: 1 }, { x: "[영작] People speak English in America.", a: 1 }),
  mk({ x: "by + 목적격은 생략할 수 있다", a: 1 }, { x: "[수동태] English is spoken in America.", a: 1 }),
  mk({ x: "#예문 Someone planted the tree in 1995.", a: 1 }, {}),
  mk({ x: "=> The tree was planted in 1995.", a: 1 }, {}),
];

const RELATIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "관계대명사는 [[접속사 + 대명사]] 의 역할을 하며", a: 1 }, { x: "영작연습", b: 1 }),
  mk({ x: "관계대명사가 이끄는 절은 앞의 명사(선행사)를 수식한다", a: 1, i: 1 }, { x: "1 나는 착한 소년을 안다." }),
  mk({ x: "주격관계대명사", b: 1 }, { x: "(1) I know a boy.", a: 1 }),
  mk({ x: "#개념 주격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "(2) The boy is kind.", a: 1 }),
  mk({ x: "주어의 역할을 한다", a: 1, i: 1 }, { x: "=> I know a boy ( who is kind ).", a: 1 }),
  mk({ x: "#형태 - 선행사가 사람일 때 : who", a: 1 }, { x: "2 그는 내가 믿는 친구를 가지고 있다." }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { x: "(1) He has a friend.", a: 1 }),
  mk({ x: "#예문 She is a girl ( who likes pasta ).", a: 1 }, { x: "(2) I trust the friend.", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "=> He has a friend ( who(m) I trust ).", a: 1 }),
  mk({ x: "#예문 This is a house ( which is expensive ).", a: 1 }, { x: "3 우리는 빠른 차를 봤다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { x: "(1) We saw a car.", a: 1 }),
  mk({ x: "목적격관계대명사", b: 1 }, { x: "(2) The car was fast.", a: 1 }),
  mk({ x: "#개념 목적격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> We saw a car ( which was fast ).", a: 1 }),
  mk({ x: "목적어의 역할을 한다", a: 1, i: 1 }, { x: "4 우리가 어제 만난 그 선생님은 착하다." }),
  mk({ x: "#형태 - 선행사가 사람일 때 : who / whom", a: 1 }, { x: "(1) The teacher is kind.", a: 1 }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { x: "(2) We met the teacher yesterday.", a: 1 }),
  mk({ x: "#예문 She is a girl ( who(m) I like ).", a: 1 }, { x: "=> The teacher ( who(m) we met yesterday )", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "is kind.", a: 1 }),
  mk({ x: "#예문 This is a house ( which Joy bought ).", a: 1 }, { x: "5 그는 머리가 긴 소녀를 만났다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { x: "(1) He met a girl.", a: 1 }),
  mk({ x: "소유격관계대명사", b: 1 }, { x: "(2) Her hair is long.", a: 1 }),
  mk({ x: "#개념 소유격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> He met a girl ( whose hair is long ).", a: 1 }),
  mk({ x: "소유격 역할을 한다", a: 1, i: 1 }, { x: "6 그는 부산에서 일하는 의사를 안다." }),
  mk({ x: "#형태 선행사와 상관없이 whose", a: 1 }, { x: "(1) He knows a doctor.", a: 1 }),
  mk({ x: "#예문 She is a girl ( whose hair is long ).", a: 1 }, { x: "(2) The doctor works in Busan.", a: 1 }),
  mk({ x: "#예문 This is a house ( whose roof is red ).", a: 1 }, { x: "=> He knows a doctor ( who works in Busan ).", a: 1 }),
];

const DEFAULT_SETTINGS = { tags: DEFAULT_TAGS };
const DEFAULT_UNIT = { title: "새 단원", rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) };


/* ═══════ TagDropdown — # 입력 시 태그 자동완성 ═══════ */
function TagDropdown({ tags, filter, anchorEl, onSelect, onClose, focusIdx }) {
  const allTags = tags || DEFAULT_TAGS;
  const filtered = filter ? allTags.filter((t) => t.v.includes(filter)) : allTags;
  if (filtered.length === 0) return null;
  const getPos = () => {
    if (!anchorEl) return { top: 0, left: 0 };
    const r = anchorEl.getBoundingClientRect();
    let top = r.bottom + 4;
    let left = r.left;
    if (left + 220 > window.innerWidth - 8) left = window.innerWidth - 228;
    if (top + 200 > window.innerHeight - 8) top = r.top - 200;
    return { top, left };
  };
  return createPortal(
    <div data-tag-dropdown style={{
      position: "fixed", ...getPos(), zIndex: 1000,
      background: "#fff", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.1)",
      padding: "6px 4px", minWidth: 160,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", padding: "2px 8px 4px", letterSpacing: 0.5 }}>태그 삽입</div>
      {filtered.map((t, i) => (
        <button key={t.v} onClick={() => onSelect(t.v)}
          onMouseEnter={() => {}}
          style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "5px 8px",
            border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: i === focusIdx ? "#f0f4ff" : "transparent", color: "#374151",
            textAlign: "left",
          }}>
          <span style={{
            display: "inline-block", padding: "1px 8px", borderRadius: 3,
            background: t.c, color: t.tx, fontSize: 11, fontWeight: 700, lineHeight: "18px",
          }}>{t.v}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}

/* ═══════ EditorRow ═══════ */
function CellArrows({ onUp, onDown, first, last }) {
  const ab = { border: "none", background: "none", cursor: "pointer", padding: "1px 2px", lineHeight: 1, fontSize: 10, color: "#999" };
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0, gap: 1 }}>
      <button onClick={onUp} disabled={first} style={{ ...ab, opacity: first ? 0.15 : 0.7 }}>▲</button>
      <button onClick={onDown} disabled={last} style={{ ...ab, opacity: last ? 0.15 : 0.7 }}>▼</button>
    </div>
  );
}

function EditorCell({ side, cell, upd, onUp, onDown, first, last, tags, idx, rows, isFocused, onCellFocus, onSwitchCol, compact }) {
  const textInputRef = useRef(null);
  const [tagDrop, setTagDrop] = useState(null); // { hashIdx, filter }
  const [tagFocusIdx, setTagFocusIdx] = useState(0);

  const TB = (active, onClick, title, children, color, textColor) => (
    <button onClick={onClick} title={title} style={{
      width: 20, height: 20, border: "none", borderRadius: 3, cursor: "pointer",
      fontSize: 10, fontWeight: 800, flexShrink: 0, padding: 0, lineHeight: 1,
      background: active ? (color || "#1f2937") : "transparent",
      color: active ? (textColor || "#fff") : "#ccc",
    }}>{children}</button>
  );
  const borderColor = cell.hdr ? "#00391e" : isFocused ? "#3b82f6" : "transparent";

  // # 태그 드롭다운 필터링된 태그 목록
  const allTags = tags || DEFAULT_TAGS;
  const filteredTags = tagDrop ? (tagDrop.filter ? allTags.filter((t) => t.v.includes(tagDrop.filter)) : allTags) : [];

  const selectTag = (tagName) => {
    if (!tagDrop) return;
    const before = cell.text.substring(0, tagDrop.hashIdx);
    const after = cell.text.substring(tagDrop.hashIdx + 1 + tagDrop.filter.length);
    const newText = before + "#" + tagName + " " + after;
    upd("text", newText);
    setTagDrop(null);
    const newCursor = before.length + 1 + tagName.length + 1;
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.selectionStart = newCursor;
        textInputRef.current.selectionEnd = newCursor;
        textInputRef.current.focus();
      }
    }, 0);
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    const cursorPos = e.target.selectionStart;
    upd("text", newText);
    // # 트리거 감지
    const beforeCursor = newText.substring(0, cursorPos);
    const lastHash = beforeCursor.lastIndexOf("#");
    if (lastHash !== -1) {
      const partial = beforeCursor.substring(lastHash + 1);
      if (!partial.includes(" ")) {
        setTagDrop({ hashIdx: lastHash, filter: partial });
        setTagFocusIdx(0);
        return;
      }
    }
    setTagDrop(null);
  };

  const inputKeyDown = (e) => {
    // 태그 드롭다운이 열려있을 때
    if (tagDrop && filteredTags.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setTagFocusIdx((i) => Math.min(i + 1, filteredTags.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setTagFocusIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectTag(filteredTags[tagFocusIdx].v); return; }
      if (e.key === "Escape") { e.preventDefault(); setTagDrop(null); return; }
      return;
    }
    if (e.ctrlKey && (e.key === "1" || e.key === "2")) { e.preventDefault(); onSwitchCol?.(e.key === "1" ? "l" : "r"); return; }
    if (e.ctrlKey && e.key === "b") { e.preventDefault(); upd("bold", !cell.bold); return; }
    if (e.ctrlKey && e.key === "h") { e.preventDefault(); upd("hdr", !cell.hdr); return; }
    if (e.ctrlKey && e.key === "d") { e.preventDefault(); upd("vis", !cell.vis); return; }
    if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); onUp(); return; }
    if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); onDown(); return; }
    if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); const next = e.target.closest("[data-row]")?.nextElementSibling?.querySelector("input"); if (next) next.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); const prev = e.target.closest("[data-row]")?.previousElementSibling?.querySelector("input"); if (prev) prev.focus(); }
  };

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    if (!tagDrop) return;
    const h = (e) => { if (!e.target.closest("[data-tag-dropdown]")) setTagDrop(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [tagDrop]);

  /* ── 컴팩트 모드: 1줄 ── */
  if (compact) return (
    <div style={{
      background: isFocused ? "#eef4ff" : "#f5f6f8", padding: "2px 4px",
      display: "flex", alignItems: "center", gap: 3,
      borderLeft: `3px solid ${borderColor}`,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, width: 16, textAlign: "center", userSelect: "none", color: "#bbb", lineHeight: "18px", flexShrink: 0 }}>{idx + 1}</span>
      <input ref={textInputRef} value={cell.text} onChange={handleTextChange} placeholder=""
        onFocus={onCellFocus} onKeyDown={inputKeyDown}
        style={{ flex: 1, padding: "1px 4px", border: isFocused ? "1px solid #3b82f6" : "1px solid transparent", borderRadius: 2, fontSize: 12, outline: "none", background: "transparent", minWidth: 0, fontWeight: cell.bold ? 700 : 400, color: "#1f2937" }} />
      {tagDrop && filteredTags.length > 0 && (
        <TagDropdown tags={tags} filter={tagDrop.filter} anchorEl={textInputRef.current} onSelect={selectTag} onClose={() => setTagDrop(null)} focusIdx={tagFocusIdx} />
      )}
    </div>
  );

  /* ── 편집 모드: 2줄 ── */
  return (
    <div style={{
      background: isFocused ? "#eef4ff" : "#f5f6f8", padding: "3px 4px",
      display: "flex", gap: 4,
      borderLeft: `3px solid ${borderColor}`,
    }}>
      {/* 행번호 */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{
          fontSize: 9, fontWeight: 700, width: 18, textAlign: "center", flexShrink: 0, userSelect: "none",
          borderRadius: 3, lineHeight: "16px", background: "transparent", color: "#bbb",
        }}>{idx + 1}</span>
      </div>
      {/* 콘텐츠: 2줄 구조 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        {/* 상단: 속성 버튼 */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, height: 18, minHeight: 18 }}>
          {isFocused && <span style={{ fontSize: 9, color: "#bbb", padding: "0 4px", lineHeight: "14px" }}>
            #태그 [라벨]
          </span>}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            {TB(cell.hdr, () => upd("hdr", !cell.hdr), "헤더 (Ctrl+H)", "H", "#00391e", "#fff")}
            {TB(cell.bold, () => upd("bold", !cell.bold), "굵게 (Ctrl+B)", "B", "#1f2937", "#fff")}
            {TB(cell.vis, () => upd("vis", !cell.vis), "시험지에 표시 (Ctrl+D)", "표시", "#f59e0b", "#78350f")}
            <CellArrows onUp={onUp} onDown={onDown} first={first} last={last} />
          </div>
        </div>
        {/* 하단: 텍스트 입력 */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <input ref={textInputRef} value={cell.text} onChange={handleTextChange} placeholder="내용... (#태그, [라벨] 입력 가능)"
            onFocus={onCellFocus} onKeyDown={inputKeyDown}
            style={{ flex: 1, padding: "3px 6px", border: isFocused ? "1px solid #3b82f6" : "1px solid #e5e7eb", borderRadius: 3, fontSize: 13, outline: "none", background: "#fff", minWidth: 0, fontWeight: cell.bold ? 700 : 400, color: "#1f2937" }} />
        </div>
      </div>
      {tagDrop && filteredTags.length > 0 && (
        <TagDropdown tags={tags} filter={tagDrop.filter} anchorEl={textInputRef.current} onSelect={selectTag} onClose={() => setTagDrop(null)} focusIdx={tagFocusIdx} />
      )}
    </div>
  );
}

function EditorSideGroup({ side, label, color, rows, onCellChange, onMove, tags }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 4px 4px", position: "sticky", top: 0, zIndex: 5, background: "#fafafa" }}>
        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, background: color, color: "#fff", fontSize: 13, fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: 12, color: "#aaa" }}>{rows.length}행</span>
      </div>
      {rows.map((row, i) => (
        <div key={row.id} data-row style={{ borderRadius: 4, marginBottom: 1, background: "#e0e0e0" }}>
          <EditorCell side={side} cell={row[side]} upd={(f, v) => onCellChange(row.id, side, f, v)} onUp={() => onMove(row.id, side, -1)} onDown={() => onMove(row.id, side, 1)} first={i === 0} last={i === rows.length - 1} tags={tags} idx={i} rows={rows} />
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

function Preview({ unit, isBlank, fontFamily, tags, printId }) {
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
            const HDR_STYLE = { padding: "0 12px", display: "flex", alignItems: "center", fontWeight: 800, fontSize: 12, color: "#00391e", letterSpacing: 2, background: "#fff", borderBottom: "2px solid #c8d9ca", height: ROW_H, maxHeight: ROW_H, overflow: "hidden" };
            const renderCell = (cell, side) => {
              const isHdr = cell.hdr;
              const show = !isBlank || cell.vis;
              const empty = !cell.text && !isHdr;
              const nxtHdr = side === "l" ? nextRow?.l.hdr : nextRow?.r.hdr;
              const btm = isLast ? "none" : ((isHdr && !nxtHdr) || (!isHdr && nxtHdr)) ? "2px solid #00391e" : "1px solid #e5e7eb";
              const extra = side === "r" ? { borderLeft: "2px solid #00391e" } : {};
              if (isHdr) return (
                <div style={{ ...HDR_STYLE, borderBottom: btm, ...extra }}>
                  <span style={{ ...TEXT_CLIP }}>{cell.text}</span>
                </div>
              );
              const segments = parseInlineMarkup(cell.text, tags);
              return (
                <div style={{ ...CELL_STYLE, padding: "0 10px", background: empty ? "#fafafa" : "#fff", borderBottom: btm, ...extra }}>
                  {cell.text && (
                    <RenderSegments segments={segments} bold={cell.bold} showText={show} />
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

/* ═══════ RenderSegments — parseInlineMarkup 결과를 렌더링 ═══════ */
function RenderSegments({ segments, bold, fontSize = 12, showText = true }) {
  return segments.map((seg, i) => {
    if (seg.type === "tag") return (
      <span key={i} style={{
        display: "inline-block", padding: "1px 7px", borderRadius: 3,
        background: seg.c, color: seg.tx, fontSize: 9.5, fontWeight: 700, flexShrink: 0, lineHeight: "16px",
      }}>{seg.value}</span>
    );
    if (seg.type === "label") return (
      <span key={i} style={{
        display: "inline-block", padding: "1px 5px", borderRadius: 3,
        background: "#f3f4f6", color: "#374151", fontSize: 11, fontWeight: 600, flexShrink: 0, lineHeight: "16px",
      }}>{seg.value}</span>
    );
    return (
      <span key={i} style={{
        fontSize, color: showText ? "#1f2937" : "transparent", fontWeight: bold ? 700 : 400,
        textDecoration: bold && showText ? "underline" : "none", textUnderlineOffset: 3, textDecorationColor: "#aaa",
      }}>{seg.value}</span>
    );
  });
}

/* ═══════ InlinePreviewCell — 편집 행과 나란히 보여주는 셀 미리보기 ═══════ */
function InlinePreviewCell({ cell, isBlank, tags, onClick, isFocused }) {
  const isEmpty = !cell.text && !cell.hdr;
  const show = !isBlank || cell.vis;
  if (cell.hdr) return (
    <div onClick={onClick} style={{ height: ROW_H, display: "flex", alignItems: "center", padding: "0 10px", background: isFocused ? "#eef4ff" : "#fff", fontWeight: 800, fontSize: 12, color: "#00391e", letterSpacing: 2, overflow: "hidden", borderBottom: "2px solid #c8d9ca", cursor: "pointer", boxShadow: isFocused ? "inset 0 0 0 1.5px #3b82f6" : "none" }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cell.text}</span>
    </div>
  );
  const segments = parseInlineMarkup(cell.text, tags);
  return (
    <div onClick={onClick} style={{ height: ROW_H, display: "flex", alignItems: "center", gap: 4, padding: "0 10px", background: isFocused ? "#eef4ff" : (isEmpty ? "#fafafa" : "#fff"), overflow: "hidden", cursor: "pointer", boxShadow: isFocused ? "inset 0 0 0 1.5px #3b82f6" : "none", whiteSpace: "nowrap" }}>
      {cell.text ? (
        <RenderSegments segments={segments} bold={cell.bold} showText={show} />
      ) : null}
    </div>
  );
}

function MItem({ onClick, children }) {
  const [hover, setHover] = useState(false);
  return <button onClick={(e) => { e.stopPropagation(); onClick(); }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: "block", width: "100%", padding: "4px 10px", border: "none", background: hover ? "#f3f4f6" : "none", textAlign: "left", fontSize: 13, cursor: "pointer", borderRadius: 3, color: "#374151" }}>{children}</button>;
}

/* ═══════ PrintThumbnails — 선택된 페이지만 그룹별로 표시 ═══════ */
function PrintThumbnails({ allUnits, printChecked, togglePrintCheck, fontFamily, tags, thumbW }) {
  // 단원별로 페이지 묶기 (체크 여부 무관하게 수집, 체크된 것만 렌더)
  const unitGroups = [];
  let pageNum = 0;
  allUnits.forEach((u) => {
    const aKey = `${u.filePath}::answer`;
    const bKey = `${u.filePath}::blank`;
    const hasA = printChecked.has(aKey);
    const hasB = printChecked.has(bKey);
    if (!hasA && !hasB) return;
    const modes = [];
    if (hasA) { modes.push({ mode: "answer", key: aKey, num: ++pageNum }); }
    if (hasB) { modes.push({ mode: "blank", key: bKey, num: ++pageNum }); }
    unitGroups.push({ u, modes });
  });

  if (unitGroups.length === 0) return <div style={{ color: "#999", fontSize: 12, padding: 40, textAlign: "center" }}>왼쪽에서 인쇄할 페이지를 선택하세요</div>;

  const scale = thumbW / 740;
  const thumbH = 1046 * scale;
  const totalPages = pageNum;

  // 그룹별 분류
  const grouped = {};
  const ungrouped = [];
  unitGroups.forEach((item) => {
    if (item.u.group) { if (!grouped[item.u.group]) grouped[item.u.group] = []; grouped[item.u.group].push(item); }
    else ungrouped.push(item);
  });

  const renderUnit = ({ u, modes }) => (
    <div key={u.filePath} style={{ background: "#f5f5f5", borderRadius: 6, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 2px" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fileName}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {modes.map(({ mode, key, num }) => (
          <div key={key} style={{ width: thumbW }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 2px 3px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <input type="checkbox" checked={printChecked.has(key)} onChange={() => togglePrintCheck(key)}
                  style={{ accentColor: mode === "answer" ? "#00391e" : "#ec6619", width: 12, height: 12 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: mode === "answer" ? "#00391e" : "#ec6619", borderRadius: 3, padding: "1px 5px" }}>
                  {mode === "answer" ? "ANSWER" : "WORKSHEET"}
                </span>
              </label>
              <span style={{ fontSize: 9, color: "#bbb", marginLeft: "auto" }}>{num}/{totalPages}</span>
            </div>
            <div style={{ width: thumbW, height: thumbH, overflow: "hidden", borderRadius: 4, border: "2px solid #d1d5db", boxSizing: "border-box", background: "#fff" }}>
              <div id={`thumb-${key}`} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 740, pointerEvents: "none" }}>
                <Preview unit={u.unit} isBlank={mode === "blank"} fontFamily={fontFamily} tags={tags} printId={`pv-${key}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSection = (items) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
      {items.map(renderUnit)}
    </div>
  );

  return (
    <div id="print-thumbs" style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 20 }}>
      {Object.entries(grouped).map(([gName, items]) => (
        <div key={gName} style={{ background: "#eaeaea", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#374151", padding: "0 2px 10px", borderBottom: "2px solid #ccc", marginBottom: 12 }}>{gName}</div>
          {renderSection(items)}
        </div>
      ))}
      {ungrouped.length > 0 && renderSection(ungrouped)}
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
const [settingsOpen, setSettingsOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGrp, setNewGrp] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitGroup, setNewUnitGroup] = useState("");
  const [inlineAddGroup, setInlineAddGroup] = useState(null);
  const [inlineAddName, setInlineAddName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState("answer"); // "answer" | "worksheet"
  const [editCol, setEditCol] = useState("l"); // "l" = 1열, "r" = 2열
  const [editExpanded, setEditExpanded] = useState(true); // true = 편집모드(2줄), false = 컴팩트(1줄)
  const [focusedRowId, setFocusedRowId] = useState(null); // 현재 편집 중인 행 ID
  const [fullPreview, setFullPreview] = useState(null); // null | "answer" | "blank"
  const [fullPrintMenu, setFullPrintMenu] = useState(false);
  const [fullPrintExtra, setFullPrintExtra] = useState(null); // 출력 시 임시 마운트용
  const [printZoom, setPrintZoom] = useState(100);
  const editorScrollRef = useRef(null);
  const saveTimerRef = useRef(null);
  const historyRef = useRef([]); // undo 스택
  const redoRef = useRef([]);    // redo 스택
  const HISTORY_LIMIT = 50;

  // 출력 관련
  const [allUnits, setAllUnits] = useState([]); // [{filePath, fileName, unit}]
  const [printSelected, setPrintSelected] = useState(new Set()); // 출력 대상 파일 경로
  const [printMode, setPrintMode] = useState("both"); // "answer" | "blank" | "both"
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printChecked, setPrintChecked] = useState(new Set()); // 모달 내부용 (legacy)
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: "error"|"info" }
  const toastTimer = useRef(null);
  const showToast = (message, type = "error", duration = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };

  // 전역 설정 변경 + 저장
  const setSettings = (s) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...s };
      window.electronAPI?.saveAppSettings({ editorSettings: next });
      return next;
    });
  };

  // 마이그레이션 (구 형식 파일 지원 → 인라인 마크업으로 변환)
  const migrateUnit = (p) => {
    if (!p.rows) return p;
    const OLD_NUM_TAG_SET = new Set(["1","2","3","4","5","6","7","8","9","10"]);
    const OLD_PTAG_VALUES = new Set(["영작", "수동태", "(1)", "(2)"]);
    // 구 형식: unit 안에 settings가 있으면 전역 설정으로 흡수 (최초 1회)
    if (p.settings) {
      const us = p.settings;
      if (!us.tags) us.tags = DEFAULT_TAGS;
      delete us.ptags;
      us.tags = us.tags.filter((t) => !OLD_PTAG_VALUES.has(t.v) && !OLD_NUM_TAG_SET.has(t.v));
      setSettingsState((prev) => {
        const isDefault = JSON.stringify(prev.tags) === JSON.stringify(DEFAULT_TAGS);
        return isDefault ? { ...prev, ...us } : prev;
      });
      delete p.settings;
    }
    p.rows = padRows(p.rows);
    p.rows.forEach((r) => { [r.l, r.r].forEach((c) => {
      if (c.indent === true) c.indent = 1; else if (!c.indent) c.indent = 0;
      if (c.vis === undefined) { c.vis = !c.ans; delete c.ans; }
      // 레거시: num → tag, ptag → mark
      if (c.num) { if (!c.tag) c.tag = c.num; delete c.num; }
      if (c.ptag !== undefined) {
        if (!c.mark) { const pv = c.ptag; c.mark = (pv === "영작" || pv === "수동태") ? `[${pv}]` : pv; }
        delete c.ptag;
      }
      // prefix/tag/mark가 있으면 → text에 인라인 병합
      if (c.tag !== undefined || c.prefix !== undefined || c.mark !== undefined) {
        const parts = [];
        const tag = c.tag || "";
        if (tag && !OLD_NUM_TAG_SET.has(tag) && !OLD_PTAG_VALUES.has(tag)) {
          parts.push("#" + tag);
        }
        const prefix = c.prefix || "";
        const mark = c.mark || "";
        const inlineVal = prefix || mark || "";
        if (inlineVal) {
          if (tag && OLD_NUM_TAG_SET.has(tag)) parts.push(tag);
          parts.push(inlineVal);
        } else if (tag && OLD_NUM_TAG_SET.has(tag)) {
          parts.push(tag);
        } else if (tag && OLD_PTAG_VALUES.has(tag)) {
          parts.push((tag === "영작" || tag === "수동태") ? `[${tag}]` : tag);
        }
        if (c.text) parts.push(c.text);
        c.text = parts.join(" ");
        delete c.tag; delete c.prefix; delete c.mark;
      }
    }); });
    return p;
  };

  // 파일 열기
  const openFile = async (filePath) => {
    if (!window.electronAPI) return;
    // 현재 파일 저장
    if (dirty && currentFile && unit) await saveFile();
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) { showToast(`파일 열기 실패: ${result.error || "알 수 없는 오류"}`); return; }
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
      setSidebarOpen(false);
      historyRef.current = [];
      redoRef.current = [];
      if (editorScrollRef.current) editorScrollRef.current.scrollTop = 0;
    } catch (err) { console.warn("파일 파싱 실패:", filePath, err); }
  };

  // 파일 저장
  const saveFile = async () => {
    if (!window.electronAPI || !currentFile || !unit) return;
    const content = JSON.stringify(unit, null, 2);
    const result = await window.electronAPI.writeFile(currentFile, content);
    if (result?.success === false) {
      showToast(`저장 실패: ${result.error || "알 수 없는 오류"}`);
      return;
    }
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
      historyRef.current = [...historyRef.current.slice(-(HISTORY_LIMIT - 1)), u];
      redoRef.current = [];
      const next = typeof fn === "function" ? fn(u) : { ...u, ...fn };
      return next;
    });
    setDirty(true);
  };

  const undo = () => {
    if (!historyRef.current.length) return;
    setUnit((u) => {
      if (!u) return u;
      redoRef.current = [...redoRef.current, u];
      return historyRef.current.pop();
    });
    setDirty(true);
  };

  const redo = () => {
    if (!redoRef.current.length) return;
    setUnit((u) => {
      if (!u) return u;
      historyRef.current = [...historyRef.current, u];
      return redoRef.current.pop();
    });
    setDirty(true);
  };

  // Ctrl+Z / Ctrl+Y 단축키
  useEffect(() => {
    const h = (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // 폴더 스캔 결과 적용
  const applyFolderScan = ({ dirPath, files, groups: grps }) => {
    setWorkspace(dirPath);
    setFileList(files);
    setGroups(grps);
    // 파일이 열려있지 않으면 첫 번째 파일 자동 열기
    if (!currentFile && files.length > 0) {
      openFile(files[0].path);
    }
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
    // 새로고침 시 현재 작업폴더 복원
    window.electronAPI.getWorkspace().then((dir) => {
      if (dir) {
        window.electronAPI.scanFolder(dir).then((scan) => {
          applyFolderScan({ dirPath: dir, ...scan });
        });
      }
    });
  }, []);


  // 출력 파일 선택 토글
  const togglePrintSelected = (filePath) => setPrintSelected((s) => { const n = new Set(s); n.has(filePath) ? n.delete(filePath) : n.add(filePath); return n; });
  const toggleAllPrintSelected = () => {
    const allPaths = fileList.map((f) => f.path);
    setPrintSelected((s) => s.size === allPaths.length ? new Set() : new Set(allPaths));
  };

  // 출력 모달 열기
  const openPrintModal = async () => {
    if (printSelected.size === 0) return;
    if (dirty && currentFile && unit) await saveFile();
    // 선택된 파일만 로드
    const results = await Promise.all(
      fileList.filter((f) => printSelected.has(f.path)).map(async (f) => {
        try {
          const res = await window.electronAPI.readFile(f.path);
          if (!res?.success) return null;
          let d = JSON.parse(res.content);
          if (d.units && !d.rows) d = { ...d.units[0], settings: d.settings || {} };
          d = migrateUnit(d);
          return d.rows ? { filePath: f.path, fileName: f.name.replace(/\.(btm|json)$/, ""), group: f.group, unit: d } : null;
        } catch { return null; }
      })
    );
    setAllUnits(results.filter(Boolean));
    // printChecked 세팅 (printMode 기반)
    const checked = new Set();
    results.filter(Boolean).forEach((u) => {
      if (printMode === "answer" || printMode === "both") checked.add(`${u.filePath}::answer`);
      if (printMode === "blank" || printMode === "both") checked.add(`${u.filePath}::blank`);
    });
    setPrintChecked(checked);
    setPrintModalOpen(true);
  };

  // 인쇄 체크 토글 (모달 내부용)
  const togglePrintCheck = (key) => setPrintChecked((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

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
  const addNewUnit = async (groupName, unitName) => {
    if (!window.electronAPI || !workspace) return;
    if (dirty && currentFile && unit) await saveFile();
    const dir = groupName ? `${workspace}/${groupName}` : workspace;
    // 겹치지 않는 파일명
    let name = unitName || "새 단원"; let n = 1;
    const existing = new Set(fileList.map((f) => f.name));
    while (existing.has(`${name}.btm`)) { name = `${unitName || "새 단원"} (${n++})`; }
    const filePath = `${dir}/${name}.btm`;
    const newUnit = { title: unitName || name, rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) };
    await window.electronAPI.writeFile(filePath, JSON.stringify(newUnit, null, 2));
    await refreshFolder();
    setUnit(newUnit);
    setCurrentFile(filePath);
    setDirty(false);
  };

  // 파일 삭제
  const deleteFile = async (filePath) => {
    if (!window.electronAPI || !confirm("삭제할까요?")) return;
    const res = await window.electronAPI.deleteFile(filePath);
    if (res?.success === false) { showToast(`삭제 실패: ${res.error || "알 수 없는 오류"}`); return; }
    if (currentFile === filePath) { setUnit(null); setCurrentFile(null); setDirty(false); }
    await refreshFolder();
  };

  // 파일 복제
  const duplicateFile = async (filePath) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) { showToast(`복제 실패: ${result.error || "파일 읽기 오류"}`); return; }
    const dir = filePath.replace(/[/\\][^/\\]+$/, "");
    const baseName = filePath.replace(/^.*[/\\]/, "").replace(/\.(btm|json)$/, "");
    let name = `${baseName} (복사)`; let n = 1;
    const existing = new Set(fileList.map((f) => f.name));
    while (existing.has(`${name}.btm`)) { name = `${baseName} (복사 ${n++})`; }
    const newPath = `${dir}/${name}.btm`;
    let dupData; try { dupData = JSON.parse(result.content); } catch { dupData = null; }
    const content = dupData ? JSON.stringify({ ...dupData, title: name }, null, 2) : result.content;
    const writeRes = await window.electronAPI.writeFile(newPath, content);
    if (writeRes?.success === false) { showToast(`복제 실패: ${writeRes.error || "쓰기 오류"}`); return; }
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
    const renRes = await window.electronAPI.renameFile(filePath, newPath);
    if (renRes?.success === false) { showToast(`이동 실패: ${renRes.error || "알 수 없는 오류"}`); return; }
    if (currentFile === filePath) setCurrentFile(newPath);
    await refreshFolder();
  };

  // 활성 파일 이름 변경 (단원명과 동기화)
  const renameActiveFile = async (newTitle) => {
    if (!window.electronAPI || !currentFile || !newTitle.trim()) return;
    const dir = currentFile.replace(/[/\\][^/\\]+$/, "");
    const newPath = `${dir}/${newTitle.trim()}.btm`;
    if (newPath === currentFile) return;
    const res = await window.electronAPI.renameFile(currentFile, newPath);
    if (res?.success === false) { showToast(`이름 변경 실패: ${res.error || "알 수 없는 오류"}`); return; }
    setCurrentFile(newPath);
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
  const BS = { padding: "4px 9px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 500, color: "#555" };

  const fontFamily = `'Pretendard','Malgun Gothic',sans-serif`;

  // 폴더 미선택 시 시작 화면
  if (!workspace) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Pretendard',sans-serif", background: "#f0f2f5" }}>
      <div style={{ textAlign: "center" }}>
        <img src={logoImg} style={{ height: 64, objectFit: "contain", marginBottom: 16 }} alt="잉그립" />
        <div style={{ fontSize: 20, fontWeight: 800, color: "#00391e", marginBottom: 4 }}>백지테스트 메이커</div>
        <div style={{ fontSize: 14, color: "#999", marginBottom: 20 }}>작업 폴더를 선택해서 시작하세요</div>
        <button onClick={() => window.electronAPI?.selectFolder()} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "#ec6619", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          폴더 열기
        </button>
      </div>
    </div>
  );

  const renameGroup = async (oldPath, oldName, newName) => {
    if (!window.electronAPI || !newName.trim() || newName.trim() === oldName) return;
    const parentDir = oldPath.replace(/[/\\][^/\\]+$/, "");
    const newPath = `${parentDir}/${newName.trim()}`;
    const res = await window.electronAPI.renameFile(oldPath, newPath);
    if (res?.success === false) { showToast(`그룹 이름 변경 실패: ${res.error || "알 수 없는 오류"}`); return; }
    await refreshFolder();
  };

  const GroupHeader = ({ g, count, collapsed, onToggle, onDelete }) => {
    const [hover, setHover] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const menuRef = useRef(null);
    useEffect(() => {
      if (!menuOpen) return;
      const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
      document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, [menuOpen]);
    const startRename = () => { setEditName(g.name); setEditing(true); setMenuOpen(false); };
    const commitRename = () => { setEditing(false); renameGroup(g.path, g.name, editName); };
    return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onClick={() => { if (!editing) onToggle(); }}
        style={{ display: "flex", alignItems: "center", padding: "7px 8px", borderRadius: 5, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 13, marginRight: 6, flexShrink: 0 }}>{collapsed ? "📁" : "📂"}</span>
        {editing ? (
          <input value={editName} onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
            autoFocus onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, fontSize: 14, fontWeight: 700, border: "1px solid #f5a855", outline: "none", background: "#fff", borderRadius: 3, padding: "1px 6px", color: "#374151", minWidth: 0 }} />
        ) : (
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#374151" }}>{g.name}</span>
        )}
        {!editing && <span style={{ fontSize: 10, color: "#aaa", background: "#edeef0", borderRadius: 8, padding: "1px 6px", fontWeight: 600, marginRight: 4 }}>{count}</span>}
        {!editing && (hover || menuOpen) && <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#aaa", padding: "0 2px", lineHeight: 1 }}>⋯</button>
          {menuOpen && <div ref={menuRef} style={{ position: "absolute", right: 0, top: "100%", marginTop: 2, background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,.15)", padding: 4, zIndex: 100, minWidth: 120 }}>
            <MItem onClick={startRename}>✎ 이름 변경</MItem>
            <MItem onClick={() => { onDelete(); setMenuOpen(false); }}>🗑 그룹 삭제</MItem>
          </div>}
        </div>}
      </div>
    );
  };

  const FileItem = ({ f }) => {
    const active = currentFile === f.path;
    const displayName = f.name.replace(/\.(btm|json)$/, "");
    const [menuOpen, setMenuOpen] = useState(false);
    const [hover, setHover] = useState(false);
    const btnRef = useRef(null);
    const menuRef = useRef(null);
    useEffect(() => {
      if (!menuOpen) return;
      const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setMenuOpen(false); };
      document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, [menuOpen]);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const startEdit = () => { setEditTitle(active ? (unit?.title || displayName) : displayName); setEditing(true); };
    const commitEdit = async () => {
      setEditing(false);
      const newTitle = editTitle.trim();
      if (!newTitle) return;
      if (active) {
        const oldTitle = unit?.title || displayName;
        if (newTitle === oldTitle) return;
        updateUnit({ title: newTitle });
        await renameActiveFile(newTitle);
      } else {
        if (newTitle === displayName) return;
        const dir = f.path.replace(/[/\\][^/\\]+$/, "");
        const newPath = `${dir}/${newTitle}.btm`;
        const res = await window.electronAPI.renameFile(f.path, newPath);
        if (res?.success === false) { showToast(`이름 변경 실패: ${res.error || "알 수 없는 오류"}`); return; }
        await refreshFolder();
      }
    };
    const toggleMenu = (e) => { e.stopPropagation(); setMenuOpen((v) => !v); };
    const menuPopup = menuOpen && (
        <div ref={menuRef} style={{ position: "absolute", right: 0, top: "100%", marginTop: 2, background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,.15)", padding: 4, zIndex: 100, minWidth: 130 }}>
          <MItem onClick={() => { startEdit(); setMenuOpen(false); }}>✎ 이름 변경</MItem>
          <MItem onClick={() => { duplicateFile(f.path); setMenuOpen(false); }}>📋 복제</MItem>
          <MItem onClick={() => { deleteFile(f.path); setMenuOpen(false); }}>🗑 삭제</MItem>
          {groups.length > 0 && <>
            <div style={{ height: 1, background: "#eee", margin: "3px 0" }} />
            <div style={{ padding: "3px 8px", fontSize: 11, color: "#aaa", fontWeight: 600 }}>그룹 이동</div>
            {f.group && <MItem onClick={() => { moveFileToGroup(f.path, null); setMenuOpen(false); }}>미분류</MItem>}
            {groups.filter((g) => g.name !== f.group).map((g) => <MItem key={g.name} onClick={() => { moveFileToGroup(f.path, g.name); setMenuOpen(false); }}>{g.name}</MItem>)}
          </>}
        </div>
    );
    const dotsArea = (hover || menuOpen) && (
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button ref={btnRef} onClick={toggleMenu} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#aaa", padding: "2px 4px", lineHeight: 1 }}>⋯</button>
        {menuPopup}
      </div>
    );
    // 활성 파일
    if (active) return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
        padding: "7px 8px 7px 12px", borderRadius: 6, marginBottom: 2,
        background: "#fff7f0", borderLeft: "3px solid #ec6619",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>📄</span>
          {editing ? (
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
              autoFocus onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, fontSize: 13, fontWeight: 700, border: "1px solid #f5a855", outline: "none", background: "#fff", borderRadius: 3, padding: "2px 6px", color: "#1f2937", minWidth: 0 }} />
          ) : (
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit?.title || displayName}</span>
          )}
          {!editing && dirty && <span style={{ color: "#f97316", fontSize: 11, flexShrink: 0 }}>●</span>}
          {dotsArea}
        </div>
      </div>
    );
    // 비활성 파일
    return (
      <div onClick={() => { if (!editing) openFile(f.path); }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          padding: "6px 8px 6px 16px", borderRadius: 5, cursor: "pointer", marginBottom: 1,
          background: "transparent",
          display: "flex", alignItems: "center", gap: 5,
        }}>
        <span style={{ fontSize: 12, flexShrink: 0 }}>📄</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? (
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
              autoFocus onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", fontSize: 13, fontWeight: 600, border: "1px solid #f5a855", outline: "none", background: "#fff", borderRadius: 3, padding: "2px 6px", color: "#1f2937", minWidth: 0 }} />
          ) : (
            <div style={{ fontSize: 13, fontWeight: 500, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
          )}
        </div>
        {dotsArea}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", fontFamily, fontSize: 15, background: "#f0f2f5" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css');
        html,body{margin:0;padding:0;height:100%;overflow:hidden}
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
        input:focus,select:focus{border-color:#3b82f6!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
      `}</style>

      {/* ═══ 헤더 ═══ */}
      <div className="no-print" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 14px", height: 42, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setSidebarOpen((v) => !v)} style={{ border: "none", background: sidebarOpen ? "#f3f4f6" : "none", cursor: "pointer", fontSize: 17, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: sidebarOpen ? "#ec6619" : "#888", borderRadius: 5, lineHeight: 1 }} title="파일 목록">☰</button>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#00391e", letterSpacing: 1.5 }}>백지테스트</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#9a9a9b" }}>메이커</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.electronAPI?.selectFolder()} style={{ ...BS, height: 28, display: "flex", alignItems: "center", gap: 4 }}>📁 폴더 변경</button>
        <button onClick={() => setSettingsOpen(true)} style={{ ...BS, height: 28, display: "flex", alignItems: "center", gap: 4 }}>⚙ 설정</button>
      </div>

      {/* ═══ 메인 영역 ═══ */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 세로 바 (사이드바 닫혀있을 때) */}
        {!sidebarOpen && (
          <div onClick={() => setSidebarOpen(true)} style={{ width: 6, flexShrink: 0, background: "#e5e7eb", cursor: "pointer", transition: "background .15s, width .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ec6619"; e.currentTarget.style.width = "8px"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#e5e7eb"; e.currentTarget.style.width = "6px"; }} />
        )}
        {/* 통합 사이드바 */}
        <div className="no-print" style={{ width: sidebarOpen ? 280 : 0, minWidth: 0, background: "#fff", borderRight: sidebarOpen ? "1px solid #e5e7eb" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width .2s ease", flexShrink: 0 }}>
         <div style={{ minWidth: 280, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ padding: "0 12px", height: 42, display: "flex", alignItems: "center", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#374151" }}>파일 목록</span>
            <button onClick={toggleAllPrintSelected} style={{ border: "none", background: "none", fontSize: 10, color: "#888", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>{printSelected.size === fileList.length && fileList.length > 0 ? "전체 해제" : "전체 선택"}</button>
            <button onClick={() => { setAddUnitOpen(true); setNewUnitName(""); setNewUnitGroup(""); }} style={{ padding: "4px 12px", borderRadius: 5, border: "none", background: "#ec6619", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 4 }}>추가</button>
          </div>
          {addUnitOpen && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
              <input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newUnitName.trim()) { addNewUnit(newUnitGroup || null, newUnitName.trim()); setAddUnitOpen(false); } if (e.key === "Escape") setAddUnitOpen(false); }}
                placeholder="단원 이름" autoFocus
                style={{ width: "100%", padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select value={newUnitGroup} onChange={(e) => setNewUnitGroup(e.target.value)}
                  style={{ flex: 1, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12, outline: "none", color: newUnitGroup ? "#374151" : "#aaa", background: "#fff" }}>
                  <option value="">미분류</option>
                  {groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
                <button onClick={() => { if (newUnitName.trim()) { addNewUnit(newUnitGroup || null, newUnitName.trim()); setAddUnitOpen(false); } }}
                  style={{ padding: "4px 12px", border: "none", borderRadius: 4, background: newUnitName.trim() ? "#ec6619" : "#ccc", color: "#fff", fontSize: 12, cursor: newUnitName.trim() ? "pointer" : "default", fontWeight: 600, flexShrink: 0 }}>확인</button>
                <button onClick={() => setAddUnitOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 13 }}>✕</button>
              </div>
            </div>
          )}
          {addGroupOpen && (
            <div style={{ display: "flex", gap: 3, padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>
              <input value={newGrp} onChange={(e) => setNewGrp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} placeholder="그룹 이름" autoFocus style={{ flex: 1, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, outline: "none" }} />
              <button onClick={addGroup} style={{ padding: "4px 10px", border: "none", borderRadius: 4, background: "#ec6619", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>확인</button>
              <button onClick={() => { setAddGroupOpen(false); setNewGrp(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 13 }}>✕</button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
            {groups.map((g) => {
              const gFiles = fileList.filter((f) => f.group === g.name);
              const collapsed = collapsedGroups.has(g.name);
              return (
                <div key={g.name} style={{ marginBottom: 4 }}>
                  <GroupHeader g={g} count={gFiles.length} collapsed={collapsed} onToggle={() => toggleGroup(g.name)} onDelete={() => deleteGroup(g.path)} />
                  {!collapsed && <div style={{ paddingLeft: 10 }}>
                    {gFiles.map((f) => (
                      <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                        <input type="checkbox" checked={printSelected.has(f.path)} onChange={() => togglePrintSelected(f.path)}
                          style={{ accentColor: "#ec6619", width: 14, height: 14, flexShrink: 0, cursor: "pointer", margin: "0 4px 0 0" }} />
                        <div style={{ flex: 1, minWidth: 0 }}><FileItem f={f} /></div>
                      </div>
                    ))}
                    {inlineAddGroup === g.name ? (
                      <div style={{ display: "flex", gap: 3, marginTop: 2, marginBottom: 4 }}>
                        <input value={inlineAddName} onChange={(e) => setInlineAddName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && inlineAddName.trim()) { addNewUnit(g.name, inlineAddName.trim()); setInlineAddGroup(null); setInlineAddName(""); } if (e.key === "Escape") { setInlineAddGroup(null); setInlineAddName(""); } }}
                          placeholder="단원 이름" autoFocus
                          style={{ flex: 1, padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 3, fontSize: 12, outline: "none", minWidth: 0 }} />
                        <button onClick={() => { if (inlineAddName.trim()) { addNewUnit(g.name, inlineAddName.trim()); setInlineAddGroup(null); setInlineAddName(""); } }}
                          style={{ padding: "3px 8px", border: "none", borderRadius: 3, background: inlineAddName.trim() ? "#ec6619" : "#ccc", color: "#fff", fontSize: 11, cursor: inlineAddName.trim() ? "pointer" : "default", fontWeight: 600 }}>확인</button>
                        <button onClick={() => { setInlineAddGroup(null); setInlineAddName(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 12 }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setInlineAddGroup(g.name); setInlineAddName(""); }} style={{ width: "100%", padding: 3, border: "1px dashed #ddd", borderRadius: 3, background: "none", fontSize: 11, color: "#ccc", cursor: "pointer", marginTop: 2, marginBottom: 4 }}>+ 추가</button>
                    )}
                  </div>}
                </div>
              );
            })}
            {ungroupedFiles.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                {groups.length > 0 && <div style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: "#bbb", borderRadius: 5, background: "#f5f6f7", marginBottom: 2 }}>미분류</div>}
                {ungroupedFiles.map((f) => (
                  <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <input type="checkbox" checked={printSelected.has(f.path)} onChange={() => togglePrintSelected(f.path)}
                      style={{ accentColor: "#ec6619", width: 14, height: 14, flexShrink: 0, cursor: "pointer", margin: "0 4px 0 0" }} />
                    <div style={{ flex: 1, minWidth: 0 }}><FileItem f={f} /></div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAddGroupOpen(true)} style={{ width: "100%", padding: "6px 0", border: "1px dashed #d1d5db", borderRadius: 5, background: "none", fontSize: 12, color: "#aaa", cursor: "pointer", marginTop: 4 }}>새 그룹</button>
          </div>
          {/* 하단: 출력 모드 + 출력 버튼 */}
          <div style={{ borderTop: "1px solid #e5e7eb", padding: "8px 12px", flexShrink: 0, background: "#fafafa" }}>
            <div style={{ display: "flex", gap: 2, background: "#e8e8e8", borderRadius: 5, padding: 2, marginBottom: 8 }}>
              {[["answer", "A 답지"], ["blank", "W 시험지"], ["both", "A+W 둘 다"]].map(([mode, label]) => (
                <button key={mode} onClick={() => setPrintMode(mode)} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: printMode === mode ? "#fff" : "transparent", color: printMode === mode ? (mode === "answer" ? "#00391e" : mode === "blank" ? "#ec6619" : "#333") : "#999", boxShadow: printMode === mode ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{label}</button>
              ))}
            </div>
            <button onClick={openPrintModal} disabled={printing || printSelected.size === 0}
              style={{ width: "100%", padding: "7px 0", borderRadius: 6, border: "none", background: (printing || printSelected.size === 0) ? "#ccc" : "#ec6619", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (printing || printSelected.size === 0) ? "default" : "pointer" }}>
              {printing ? "처리 중..." : `🖨 선택 출력 (${printSelected.size})`}
            </button>
          </div>
         </div>
        </div>

        {/* 편집 메인 — 3열 (편집 | ANSWER | WORKSHEET) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            {/* 3열 에디터 */}
            <div ref={editorScrollRef} style={{ flex: 1, overflowY: "auto", background: "#fafafa" }}>
              {unit ? (
                <div>
                  {/* 단원명 + 열 헤더 */}
                  <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  {/* 1행: 단원명 + A4 미리보기 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 42, background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ec6619", flexShrink: 0, letterSpacing: 0.5 }}>단원명</span>
                    <input value={unit.title} onChange={(e) => updateUnit({ title: e.target.value })} placeholder="단원명을 입력하세요"
                      style={{ flex: 1, fontSize: 16, fontWeight: 800, border: "none", outline: "none", background: "transparent", padding: "4px 8px", color: "#111", borderBottom: "2px solid #eee", borderRadius: 0 }}
                      onFocus={(e) => { e.target.style.borderBottomColor = "#3b82f6"; }}
                      onBlur={(e) => { e.target.style.borderBottomColor = "#eee"; }} />
                    <button onClick={() => setFullPreview("answer")} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#888", flexShrink: 0 }}>A4 미리보기</button>
                  </div>
                  {/* 2행: Edit | Preview [A][W] */}
                  <div style={{ display: "flex", background: "#f0f0f0", borderBottom: "none", height: 26, alignItems: "center" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: 0.5 }}>Edit</span>
                      <div style={{ display: "flex", gap: 1, background: "#e0e0e0", borderRadius: 4, padding: 1 }}>
                        <button onClick={() => setEditExpanded(true)} style={{ padding: "2px 10px", borderRadius: 3, border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", background: editExpanded ? "#3b82f6" : "transparent", color: editExpanded ? "#fff" : "#999", transition: "all .15s" }}>편집</button>
                        <button onClick={() => setEditExpanded(false)} style={{ padding: "2px 10px", borderRadius: 3, border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", background: !editExpanded ? "#3b82f6" : "transparent", color: !editExpanded ? "#fff" : "#999", transition: "all .15s" }}>컴팩트</button>
                      </div>
                    </div>
                    <div style={{ width: 684, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderLeft: "3px solid #bbb", boxSizing: "border-box" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: 0.5 }}>Preview</span>
                      <div style={{ display: "flex", gap: 1, background: "#e0e0e0", borderRadius: 4, padding: 1 }}>
                        <button onClick={() => setPreviewMode("answer")} style={{ padding: "2px 8px", borderRadius: 3, border: "none", fontSize: 10, fontWeight: 600, cursor: "pointer", background: previewMode === "answer" ? "#fff" : "transparent", color: previewMode === "answer" ? "#00391e" : "#999" }}>A</button>
                        <button onClick={() => setPreviewMode("worksheet")} style={{ padding: "2px 8px", borderRadius: 3, border: "none", fontSize: 10, fontWeight: 600, cursor: "pointer", background: previewMode === "worksheet" ? "#fff" : "transparent", color: previewMode === "worksheet" ? "#ec6619" : "#999" }}>W</button>
                      </div>
                    </div>
                  </div>
                  {/* 단축키 힌트 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 12px", background: "#f8f8f8", borderBottom: "1px solid #eee" }}>
                    {[
                      ["#", "태그"],
                      ["[...]", "라벨"],
                      ["Ctrl+1/2", "열 전환"],
                      ["Ctrl+H", "헤더"],
                      ["Ctrl+B", "굵게"],
                      ["Ctrl+D", "표시"],
                      ["Alt+↑↓", "행 이동"],
                    ].map(([key, label]) => (
                      <span key={key} style={{ fontSize: 9, color: "#aaa", display: "flex", alignItems: "center", gap: 3 }}>
                        <kbd style={{ padding: "0 4px", borderRadius: 3, background: "#e8e8e8", color: "#777", fontSize: 9, fontFamily: "inherit", fontWeight: 600, lineHeight: "16px" }}>{key}</kbd>
                        {label}
                      </span>
                    ))}
                  </div>
                  {/* 1열|2열 탭 (Edit/Preview 동일 디자인) */}
                  <div style={{ display: "flex", background: "#f0f0f0", borderBottom: "1px solid #e5e7eb", height: 24, alignItems: "stretch" }}>
                    <div style={{ flex: 1, display: "flex" }}>
                      <button onClick={() => { setEditCol("l"); setFocusedRowId(null); }} style={{ flex: 1, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, transition: "all 0.2s", background: editCol === "l" ? "#00391e" : "#e8e8e8", color: editCol === "l" ? "#fff" : "#aaa", borderBottom: editCol === "l" ? "2px solid #00391e" : "2px solid transparent" }}>1열</button>
                      <button onClick={() => { setEditCol("r"); setFocusedRowId(null); }} style={{ flex: 1, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, transition: "all 0.2s", background: editCol === "r" ? "#ec6619" : "#e8e8e8", color: editCol === "r" ? "#fff" : "#aaa", borderBottom: editCol === "r" ? "2px solid #ec6619" : "2px solid transparent" }}>2열</button>
                    </div>
                    <div style={{ width: 684, flexShrink: 0, display: "flex", borderLeft: "3px solid #bbb", boxSizing: "border-box" }}>
                      <button onClick={() => { setEditCol("l"); setFocusedRowId(null); }} style={{ flex: 1, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, transition: "all 0.2s", background: editCol === "l" ? "#e8efe9" : "#e8e8e8", color: editCol === "l" ? "#00391e" : "#ccc", borderBottom: editCol === "l" ? "2px solid #00391e" : "2px solid transparent" }}>1열</button>
                      <div style={{ width: 1, background: "#ddd" }} />
                      <button onClick={() => { setEditCol("r"); setFocusedRowId(null); }} style={{ flex: 1, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, transition: "all 0.2s", background: editCol === "r" ? "#fef3e8" : "#e8e8e8", color: editCol === "r" ? "#ec6619" : "#ccc", borderBottom: editCol === "r" ? "2px solid #ec6619" : "2px solid transparent" }}>2열</button>
                    </div>
                  </div>
                  </div>
                  {/* 에디터 행 — Edit만 슬라이드, Preview는 고정 */}
                  {unit.rows.map((row, i) => (
                    <div key={row.id} data-row data-rowid={row.id} style={{ display: "flex", marginBottom: 1 }}>
                      {/* Edit 영역: 슬라이드 */}
                      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                        <div style={{ display: "flex", width: "200%", transform: editCol === "l" ? "translateX(0)" : "translateX(-50%)", transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                          <div data-side="l" style={{ width: "50%", flexShrink: 0 }}>
                            <EditorCell side="l" cell={row.l} upd={(f, v) => updateCellField(row.id, "l", f, v)} onUp={() => moveCellContent(row.id, "l", -1)} onDown={() => moveCellContent(row.id, "l", 1)} first={i === 0} last={i === unit.rows.length - 1} tags={settings.tags} idx={i} rows={unit.rows} isFocused={focusedRowId === row.id && editCol === "l"} onCellFocus={() => { setFocusedRowId(row.id); setSidebarOpen(false); }} onSwitchCol={(col) => { setEditCol(col); setFocusedRowId(row.id); setTimeout(() => { const r = document.querySelector(`[data-rowid="${row.id}"] [data-side="${col}"] input`); if (r) r.focus(); }, 320); }} compact={!editExpanded} />
                          </div>
                          <div data-side="r" style={{ width: "50%", flexShrink: 0 }}>
                            <EditorCell side="r" cell={row.r} upd={(f, v) => updateCellField(row.id, "r", f, v)} onUp={() => moveCellContent(row.id, "r", -1)} onDown={() => moveCellContent(row.id, "r", 1)} first={i === 0} last={i === unit.rows.length - 1} tags={settings.tags} idx={i} rows={unit.rows} isFocused={focusedRowId === row.id && editCol === "r"} onCellFocus={() => { setFocusedRowId(row.id); setSidebarOpen(false); }} onSwitchCol={(col) => { setEditCol(col); setFocusedRowId(row.id); setTimeout(() => { const r = document.querySelector(`[data-rowid="${row.id}"] [data-side="${col}"] input`); if (r) r.focus(); }, 320); }} compact={!editExpanded} />
                          </div>
                        </div>
                      </div>
                      {/* Preview 영역: 항상 양쪽 표시 */}
                      <div style={{ width: 342, flexShrink: 0, borderLeft: "3px solid #bbb", boxSizing: "border-box" }}>
                        <InlinePreviewCell cell={row.l} isBlank={previewMode === "worksheet"} tags={settings.tags} isFocused={focusedRowId === row.id && editCol === "l"} onClick={() => { setEditCol("l"); setFocusedRowId(row.id); setTimeout(() => { const r = document.querySelector(`[data-rowid="${row.id}"] [data-side="l"] input`); if (r) r.focus(); }, editCol !== "l" ? 320 : 0); }} />
                      </div>
                      <div style={{ width: 342, flexShrink: 0, borderLeft: "1px solid #e5e7eb", boxSizing: "border-box" }}>
                        <InlinePreviewCell cell={row.r} isBlank={previewMode === "worksheet"} tags={settings.tags} isFocused={focusedRowId === row.id && editCol === "r"} onClick={() => { setEditCol("r"); setFocusedRowId(row.id); setTimeout(() => { const r = document.querySelector(`[data-rowid="${row.id}"] [data-side="r"] input`); if (r) r.focus(); }, editCol !== "r" ? 320 : 0); }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "80px 40px", color: "#ccc" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                  <div style={{ fontSize: 13 }}>☰ 메뉴에서 단원을 선택하세요</div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* ═══ 출력 모달 (썸네일 미리보기) ═══ */}
      {printModalOpen && (
        <div tabIndex={-1} autoFocus onKeyDown={(e) => { if (e.key === "Escape") setPrintModalOpen(false); }} ref={(el) => el?.focus()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100, outline: "none" }} onClick={() => setPrintModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, width: "90vw", maxWidth: 1100, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>출력 미리보기</span>
              <span style={{ fontSize: 12, color: "#999" }}>{printChecked.size}페이지</span>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <button onClick={() => setPrintZoom(z => Math.max(30, z - 10))} style={{ width: 24, height: 24, border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#666", lineHeight: 1 }}>−</button>
                <span style={{ fontSize: 11, color: "#999", fontWeight: 600, minWidth: 34, textAlign: "center" }}>{printZoom}%</span>
                <button onClick={() => setPrintZoom(z => Math.min(200, z + 10))} style={{ width: 24, height: 24, border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#666", lineHeight: 1 }}>+</button>
              </div>
              <button onClick={executePrint} disabled={printing || printChecked.size === 0} style={{ padding: "5px 18px", borderRadius: 6, border: "none", background: (printing || printChecked.size === 0) ? "#ccc" : "#ec6619", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (printing || printChecked.size === 0) ? "default" : "pointer", marginLeft: 8 }}>
                {printing ? "처리 중..." : "🖨 출력"}
              </button>
              <button onClick={() => setPrintModalOpen(false)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#999", padding: "2px 6px", marginLeft: 4 }}>✕</button>
            </div>
            <div onWheel={(e) => { if (!e.ctrlKey) return; e.preventDefault(); setPrintZoom(z => Math.max(30, Math.min(200, z + (e.deltaY < 0 ? 10 : -10)))); }} style={{ flex: 1, overflow: "auto", background: "#e8e8e8", padding: "16px" }}>
              <PrintThumbnails allUnits={allUnits} printChecked={printChecked} togglePrintCheck={togglePrintCheck} fontFamily={fontFamily} tags={settings.tags || DEFAULT_TAGS} thumbW={Math.round(370 * printZoom / 100)} />
            </div>
          </div>
        </div>
      )}

      {/* A4 Full Preview Modal */}
      {fullPreview && unit && (
        <div tabIndex={-1} autoFocus onKeyDown={(e) => { if (e.key === "Escape") { setFullPrintMenu(false); setFullPreview(null); } }} ref={(el) => el?.focus()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, outline: "none" }} onClick={() => { setFullPrintMenu(false); setFullPreview(null); }}>
          <div onClick={(e) => { e.stopPropagation(); setFullPrintMenu(false); }} style={{ position: "relative", maxHeight: "95vh", overflowY: "auto", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", justifyContent: "center", gap: 6, padding: "8px 0", background: "rgba(0,0,0,.4)", borderRadius: "8px 8px 0 0" }}>
              <button onClick={() => setFullPreview("answer")} style={{ padding: "4px 14px", borderRadius: 4, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: fullPreview === "answer" ? "#fff" : "rgba(255,255,255,.2)", color: fullPreview === "answer" ? "#00391e" : "#fff" }}>답지 (ANSWER)</button>
              <button onClick={() => setFullPreview("blank")} style={{ padding: "4px 14px", borderRadius: 4, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: fullPreview === "blank" ? "#fff" : "rgba(255,255,255,.2)", color: fullPreview === "blank" ? "#ec6619" : "#fff" }}>시험지 (WORKSHEET)</button>
              {(() => {
                const doPrint = async (modes) => {
                  if (!window.electronAPI) return;
                  setPrinting(true);
                  setFullPrintMenu(false);
                  // 현재 안 보이는 모드가 필요하면 잠깐 마운트해서 HTML 추출
                  const needOther = modes.length > 1 || modes[0] !== fullPreview;
                  const otherMode = fullPreview === "answer" ? "blank" : "answer";
                  if (needOther && modes.includes(otherMode)) setFullPrintExtra(otherMode);
                  // 렌더 완료 대기
                  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                  const parts = modes.map((m) => {
                    const el = document.getElementById(`fullpreview-${m}`);
                    if (!el) return "";
                    return `<div style="width:210mm;min-height:297mm;display:flex;justify-content:center;align-items:center;page-break-after:always">${el.innerHTML}</div>`;
                  }).filter(Boolean);
                  setFullPrintExtra(null); // 임시 마운트 해제
                  if (!parts.length) { setPrinting(false); return; }
                  const body = parts.join("");
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css">
                    <style>@page{size:A4;margin:0}body{margin:0;font-family:'Pretendard','Malgun Gothic',sans-serif}div:last-child{page-break-after:auto!important}</style>
                    </head><body>${body}</body></html>`;
                  await window.electronAPI.printPreview(html);
                  setPrinting(false);
                };
                return (<div style={{ position: "relative", marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setFullPrintMenu((v) => !v)} style={{ padding: "4px 14px", borderRadius: 4, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#2563eb", color: "#fff" }}>🖨 출력 ▾</button>
                  {fullPrintMenu && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,.25)", padding: 4, minWidth: 150, zIndex: 10 }}>
                      <button onClick={() => doPrint([fullPreview === "answer" ? "answer" : "blank"])} style={{ display: "block", width: "100%", padding: "6px 12px", border: "none", background: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 4, color: "#1f2937" }} onMouseEnter={(e) => e.target.style.background = "#f3f4f6"} onMouseLeave={(e) => e.target.style.background = "none"}>{fullPreview === "answer" ? "답지만 출력" : "시험지만 출력"}</button>
                      <button onClick={() => doPrint(["answer", "blank"])} style={{ display: "block", width: "100%", padding: "6px 12px", border: "none", background: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 4, color: "#1f2937" }} onMouseEnter={(e) => e.target.style.background = "#f3f4f6"} onMouseLeave={(e) => e.target.style.background = "none"}>답지 + 시험지 출력</button>
                    </div>
                  )}
                </div>);
              })()}
              <button onClick={() => setFullPreview(null)} style={{ padding: "4px 10px", borderRadius: 4, border: "none", fontSize: 14, cursor: "pointer", background: "rgba(255,255,255,.2)", color: "#fff", marginLeft: 4 }}>✕</button>
            </div>
            <Preview unit={unit} isBlank={fullPreview === "blank"} fontFamily={fontFamily} tags={settings.tags || DEFAULT_TAGS} printId={`fullpreview-${fullPreview}`} />
            {fullPrintExtra && (
              <div style={{ position: "absolute", left: -9999, top: -9999, pointerEvents: "none" }}>
                <Preview unit={unit} isBlank={fullPrintExtra === "blank"} fontFamily={fontFamily} tags={settings.tags || DEFAULT_TAGS} printId={`fullpreview-${fullPrintExtra}`} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSettingsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, width: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 700 }}>설정</h3>
            {/* ── 태그 관리 ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>태그 관리</label>
              <span style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 5 }}>추가/삭제/색상 변경 가능</span>
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
                        // text 안의 #oldTag → #newTag 치환
                        const replaceTag = (text) => text.replace(new RegExp("#" + oldV.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)", "g"), "#" + nv);
                        updateUnit((u) => ({
                          ...u, rows: u.rows.map((r) => ({
                            ...r,
                            l: { ...r.l, text: replaceTag(r.l.text) },
                            r: { ...r.r, text: replaceTag(r.r.text) },
                          }))
                        }));
                      }
                    }} placeholder="태그 이름" style={{ flex: 1, padding: "4px 7px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 14, outline: "none" }} />
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 3,
                      background: t.c, color: t.tx, fontSize: 12, fontWeight: 700, minWidth: 30, textAlign: "center",
                    }}>{t.v || "?"}</span>
                    <button onClick={() => {
                      const nTags = settings.tags.filter((_, i) => i !== idx);
                      setSettings({ tags: nTags });
                    }} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 15, padding: "0 2px", flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                const nTags = [...(settings.tags || []), { v: "새태그", c: "#6366F1", tx: "#fff" }];
                setSettings({ tags: nTags });
              }} style={{ marginTop: 5, padding: "4px 10px", borderRadius: 4, border: "1px dashed #ccc", background: "none", fontSize: 13, cursor: "pointer", color: "#888" }}>+ 태그 추가</button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setSettingsOpen(false)} style={{ padding: "7px 18px", borderRadius: 5, border: "none", background: "#ec6619", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 24px", borderRadius: 8, background: toast.type === "error" ? "#dc2626" : "#16a34a", color: "#fff", fontSize: 15, fontWeight: 600, zIndex: 99999, boxShadow: "0 4px 12px rgba(0,0,0,.25)", cursor: "pointer", maxWidth: 400, textAlign: "center" }} onClick={() => setToast(null)}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
