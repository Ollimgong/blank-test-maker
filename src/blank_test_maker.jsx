import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

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
const NO_TAG = { v: "", label: "태그 없음", c: "#cbd5e1", tx: "#6b7280" };
const tagColor = (v, tags) => {
  if (!v) return NO_TAG;
  return (tags || DEFAULT_TAGS).find((t) => t.v === v) || NO_TAG;
};
const emptyRow = () => ({
  id: uid(),
  l: { text: "", indent: 0 },
  r: { text: "", indent: 0 },
});

/* ═══════ 인라인 마크업 파서 ═══════ */
// # HEADER (줄 시작) → 헤더, ## 소제목 (줄 시작) → 강조, ! 보임 (줄 시작) → 시험지 표시, @태그 → 컬러 뱃지, [라벨]
const parseInlineMarkup = (text, tags) => {
  if (!text) return [];
  let isVis = false;
  let workText = text;
  
  // ! 보임 
  if (workText.startsWith("!")) {
    isVis = true;
    workText = workText[1] === " " ? workText.substring(2) : workText.substring(1);
  }

  // ## 소제목 (줄 시작이 ## 이면 소제목)
  if (workText.startsWith("## ")) return [{ type: "heading", value: workText.substring(3), vis: isVis }];
  // # 헤더 (줄 시작이 # 이면 헤더)
  if (workText.startsWith("# ")) return [{ type: "header", value: workText.substring(2), vis: isVis }];

  const innerSegs = parseInlineMarkup_inner(workText, tags);
  if (isVis) innerSegs.forEach((s) => { s.vis = true; });
  return innerSegs;
};

const parseInlineMarkup_inner = (text, tags) => {
  const tagNames = (tags || DEFAULT_TAGS).map((t) => t.v).filter(Boolean);
  tagNames.sort((a, b) => b.length - a.length);
  const segments = [];
  const pushText = (ch) => {
    if (segments.length && segments[segments.length - 1].type === "text") segments[segments.length - 1].value += ch;
    else segments.push({ type: "text", value: ch });
  };
  let i = 0;
  while (i < text.length) {
    // @태그
    if (text[i] === "@") {
      let matched = false;
      for (const tn of tagNames) {
        if (text.substring(i + 1, i + 1 + tn.length) === tn) {
          const after = i + 1 + tn.length;
          if (after >= text.length || /[\s@\[]/.test(text[after])) {
            const tc = tagColor(tn, tags);
            segments.push({ type: "tag", value: tn, c: tc.c, tx: tc.tx });
            i = after;
            if (i < text.length && text[i] === " ") i++;
            matched = true;
            break;
          }
        }
      }
      if (!matched) { pushText("@"); i++; }
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
        if (i < text.length && text[i] === " ") i++;
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

/* ═══════ Ghost helpers (들여쓰기) ═══════ */
const getPrefixBlocks = (text, tags) => {
  if (!text) return [];
  const segs = parseInlineMarkup(text, tags).map(s => ({...s}));
  const blocks = [];
  
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.type === "header" || seg.type === "heading") break;
    if (seg.type === "tag" || seg.type === "label") {
      let block = [seg];
      if (i + 1 < segs.length && segs[i+1].type === "text") {
        const spaceMatch = segs[i+1].value.match(/^([\s\u00A0]+)/);
        if (spaceMatch) {
           block.push({ type: "text", value: spaceMatch[1], vis: segs[i+1].vis });
           segs[i+1].value = segs[i+1].value.substring(spaceMatch[1].length);
           if (!segs[i+1].value) i++; // skip the empty segment next iteration
        }
      }
      blocks.push(block);
    } else if (seg.type === "text") {
      const markerMatch = seg.value.match(/^([\s\u00A0]*(?:\d+[\.\)]?|\(\d+\)|=>|-|•|※)[\s\u00A0]+)/);
      if (markerMatch && markerMatch[1]) {
         blocks.push([{ type: "text", value: markerMatch[1], vis: seg.vis }]);
         segs[i].value = segs[i].value.substring(markerMatch[1].length);
         if (segs[i].value) i--; // re-process the remaining text in the same segment
      } else {
         break;
      }
    } else {
       break;
    }
  }
  return blocks;
};

const getGhostSegments = (rows, idx, side, tags) => {
  const currentIndent = rows[idx]?.[side]?.indent;
  if (!currentIndent) return [];

  let parentIdx = -1;
  for (let p = idx - 1; p >= 0; p--) {
    if ((rows[p]?.[side]?.indent || 0) < currentIndent) {
      parentIdx = p;
      break;
    }
  }

  if (parentIdx === -1) {
     return Array.from({ length: currentIndent }, () => ({ type: "text", value: "        " }));
  }

  const pIndent = rows[parentIdx][side].indent || 0;
  let pGhosts = [];
  if (pIndent > 0) {
     pGhosts = getGhostSegments(rows, parentIdx, side, tags);
  }
  
  const diff = currentIndent - pIndent;
  const pBlocks = getPrefixBlocks(rows[parentIdx][side].text, tags);
  
  let extraGhosts = [];
  for (let i = 0; i < diff; i++) {
     if (i < pBlocks.length) {
       extraGhosts = extraGhosts.concat(pBlocks[i]);
     } else {
       extraGhosts.push({ type: "text", value: "        " });
     }
  }
  
  return pGhosts.concat(extraGhosts);
};

/* ═══════ default data ═══════ */
const mk = (ld, rd) => ({
  id: uid(),
  l: { text: ld.x ? (ld.a ? ld.x : `*${ld.x}*`) : "", indent: ld.i || 0 },
  r: { text: rd.x ? (rd.a ? rd.x : `*${rd.x}*`) : "", indent: rd.i || 0 },
});

const hdrRow = (lText, rText) => ({
  id: uid(),
  l: { text: `# ${lText}`, indent: 0 },
  r: { text: `# ${rText}`, indent: 0 },
});

const PASSIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "능동: 주어가 동사를 직접 함", a: 1 }, { x: "## 영작 & 수동태 전환 연습" }),
  mk({ x: "수동: 주어가 동사를 다른 행위자에 의해 당함", a: 1 }, { x: "1 나의 친구들은 나를 사랑한다." }),
  mk({}, { x: "[영작] My friends love me.", a: 1 }),
  mk({ x: "## 능동태 -> 수동태 전환방법" }, { x: "[수동태] I am loved by my friends.", a: 1 }),
  mk({ x: "@예문 She wrote a letter.", a: 1 }, { x: "2 나는 접시들을 씻는다." }),
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
  mk({ x: "@주의 A letter was written by she. (X)", a: 1 }, { x: "[영작] Grandma will bake the cake.", a: 1 }),
  mk({}, { x: "[수동태] The cake will be baked by Grandma.", a: 1 }),
  mk({ x: "## by + 목적격의 생략" }, { x: "7 사람들은 미국에서 영어를 말한다." }),
  mk({ x: "@개념 행위자가 분명하지 않거나 중요하지 않을 때", a: 1 }, { x: "[영작] People speak English in America.", a: 1 }),
  mk({ x: "by + 목적격은 생략할 수 있다", a: 1 }, { x: "[수동태] English is spoken in America.", a: 1 }),
  mk({ x: "@예문 Someone planted the tree in 1995.", a: 1 }, {}),
  mk({ x: "=> The tree was planted in 1995.", a: 1 }, {}),
];

const RELATIVE_ROWS = [
  hdrRow("SUMMARY", "PRACTICE"),
  mk({ x: "관계대명사는 [[접속사 + 대명사]] 의 역할을 하며", a: 1 }, { x: "## 영작연습" }),
  mk({ x: "관계대명사가 이끄는 절은 앞의 명사(선행사)를 수식한다", a: 1, i: 1 }, { x: "1 나는 착한 소년을 안다." }),
  mk({ x: "## 주격관계대명사" }, { x: "(1) I know a boy.", a: 1 }),
  mk({ x: "@개념 주격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "(2) The boy is kind.", a: 1 }),
  mk({ x: "주어의 역할을 한다", a: 1, i: 1 }, { x: "=> I know a boy ( who is kind ).", a: 1 }),
  mk({ x: "@형태 - 선행사가 사람일 때 : who", a: 1 }, { x: "2 그는 내가 믿는 친구를 가지고 있다." }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { x: "(1) He has a friend.", a: 1 }),
  mk({ x: "@예문 She is a girl ( who likes pasta ).", a: 1 }, { x: "(2) I trust the friend.", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "=> He has a friend ( who(m) I trust ).", a: 1 }),
  mk({ x: "@예문 This is a house ( which is expensive ).", a: 1 }, { x: "3 우리는 빠른 차를 봤다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { x: "(1) We saw a car.", a: 1 }),
  mk({ x: "## 목적격관계대명사" }, { x: "(2) The car was fast.", a: 1 }),
  mk({ x: "@개념 목적격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> We saw a car ( which was fast ).", a: 1 }),
  mk({ x: "목적어의 역할을 한다", a: 1, i: 1 }, { x: "4 우리가 어제 만난 그 선생님은 착하다." }),
  mk({ x: "@형태 - 선행사가 사람일 때 : who / whom", a: 1 }, { x: "(1) The teacher is kind.", a: 1 }),
  mk({ x: "- 선행사가 사람이 아닐 때 : which", a: 1 }, { x: "(2) We met the teacher yesterday.", a: 1 }),
  mk({ x: "@예문 She is a girl ( who(m) I like ).", a: 1 }, { x: "=> The teacher ( who(m) we met yesterday )", a: 1 }),
  mk({ x: "선행사 (사람O)", a: 1 }, { x: "is kind.", a: 1 }),
  mk({ x: "@예문 This is a house ( which Joy bought ).", a: 1 }, { x: "5 그는 머리가 긴 소녀를 만났다." }),
  mk({ x: "선행사 (사람X)", a: 1 }, { x: "(1) He met a girl.", a: 1 }),
  mk({ x: "## 소유격관계대명사" }, { x: "(2) Her hair is long.", a: 1 }),
  mk({ x: "@개념 소유격관계대명사는 관계대명사가 이끄는 절에서", a: 1 }, { x: "=> He met a girl ( whose hair is long ).", a: 1 }),
  mk({ x: "소유격 역할을 한다", a: 1, i: 1 }, { x: "6 그는 부산에서 일하는 의사를 안다." }),
  mk({ x: "@형태 선행사와 상관없이 whose", a: 1 }, { x: "(1) He knows a doctor.", a: 1 }),
  mk({ x: "@예문 She is a girl ( whose hair is long ).", a: 1 }, { x: "(2) The doctor works in Busan.", a: 1 }),
  mk({ x: "@예문 This is a house ( whose roof is red ).", a: 1 }, { x: "=> He knows a doctor ( who works in Busan ).", a: 1 }),
];

const DEFAULT_SETTINGS = { tags: DEFAULT_TAGS };
const DEFAULT_UNIT = { title: "새 단원", rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) };


/* ═══════ TagDropdown — # 입력 시 태그 자동완성 ═══════ */
function TagDropdown({ tags, filter, anchorEl, onSelect, onClose, focusIdx, darkMode }) {
  const allTags = tags || DEFAULT_TAGS;
  const filtered = filter ? allTags.filter((t) => t.v.includes(filter)) : allTags;
  if (filtered.length === 0) return null;
  const dk = !!darkMode;
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
      background: dk ? "rgba(255,255,255,0.05)" : "#fff", borderRadius: 8, boxShadow: dk ? "0 8px 32px rgba(0,0,0,.45)" : "0 8px 32px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.1)",
      padding: "6px 4px", minWidth: 160, border: dk ? "1px solid #404155" : "none",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: dk ? "#888" : "#aaa", padding: "2px 8px 4px", letterSpacing: 0.5 }}>태그 삽입</div>
      {filtered.map((t, i) => (
        <button key={t.v} onClick={() => onSelect(t.v)}
          onMouseEnter={() => {}}
          style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "5px 8px",
            border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: i === focusIdx ? (dk ? "#334155" : "#f0f4ff") : "transparent", color: dk ? "#f8fafc" : "#334155",
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

/* ═══════ contentEditable 커서 헬퍼 ═══════ */
const getCaretOffset = (el) => {
  const sel = window.getSelection();
  if (!sel.rangeCount || !el.contains(sel.anchorNode)) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.anchorNode, sel.anchorOffset);
  return range.toString().length;
};

const setCaretOffset = (el, offset) => {
  const sel = window.getSelection();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  let pos = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const len = node.textContent.length;
    if (pos + len >= offset) {
      const range = document.createRange();
      range.setStart(node, offset - pos);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    pos += len;
  }
  // offset이 텍스트 끝을 넘으면 맨 끝으로
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
};

// 세그먼트를 HTML 문자열로 변환
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 프리뷰용 (비포커스, 풀 렌더링 — 뱃지, 소제목 등)
const segmentsToPreviewHTML = (segments, isBlank, darkMode) => {
  const dk = !!darkMode;
  return segments.map((seg) => {
    if (seg.type === "header") return `<span style="font-weight:800;color:${dk ? "#7ecba1" : "#00391e"};letter-spacing:2px">${esc(seg.value)}</span>`;
    if (seg.type === "tag") return `<span style="display:inline-block;padding:1px 7px;border-radius:3px;background:${seg.c};color:${seg.tx};font-size:9.5px;font-weight:700;line-height:16px;margin-right:4px">${esc(seg.value)}</span>`;
    if (seg.type === "heading") return `<span style="font-weight:800;color:${dk ? "#ffffff" : "inherit"};text-decoration:underline;text-underline-offset:3px;text-decoration-color:${dk ? "#555" : "#aaa"}">${esc(seg.value)}</span>`;
    if (seg.type === "label") return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;background:${dk ? "rgba(255,255,255,0.1)" : "#f3f4f6"};color:${dk ? "#c0c0d0" : "#334155"};font-size:11px;font-weight:600;line-height:16px;margin-right:4px">${esc(seg.value)}</span>`;
    return `<span style="color:${(isBlank && !seg.vis) ? "transparent" : dk ? "#f8fafc" : "#1f2937"}">${esc(seg.value)}</span>`;
  }).join("");
};

// 편집용 (포커스 중, 원본 텍스트 + 문법 하이라이팅)
const textToEditHTML = (text, tags, darkMode) => {
  if (!text) return "";
  const dk = !!darkMode;
  const tagNames = (tags || DEFAULT_TAGS).map((t) => t.v).filter(Boolean);
  tagNames.sort((a, b) => b.length - a.length);
  let result = "";
  let i = 0;

  // 1. ! 보임 마커
  if (text.startsWith("!")) {
    const hasSpace = text[1] === " ";
    result += `<span style="color:${dk ? "#666" : "#aaa"}">!${hasSpace ? " " : ""}</span>`;
    i = hasSpace ? 2 : 1;
  }

  // 2. 단독 처리 마커 (소제목, 헤더)
  if (text.startsWith("## ", i)) {
    result += `<span style="color:${dk ? "#666" : "#aaa"}">## </span><span style="font-weight:800;text-decoration:underline;color:${dk ? "#ffffff" : "inherit"}">${esc(text.substring(i + 3))}</span>`;
    return result;
  }
  if (text.startsWith("# ", i)) {
    result += `<span style="color:${dk ? "#7ecba1" : "#00391e"};font-weight:800">${esc(text.substring(i))}</span>`;
    return result;
  }

  // 3. 인라인 컨텐츠 루프
  while (i < text.length) {
    // @태그 하이라이팅
    if (text[i] === "@") {
      let matched = false;
      for (const tn of tagNames) {
        if (text.substring(i + 1, i + 1 + tn.length) === tn) {
          const after = i + 1 + tn.length;
          if (after >= text.length || /[\s@\[]/.test(text[after])) {
            const tc = tagColor(tn, tags);
            result += `<span style="color:${tc.c};font-weight:700">${esc("@" + tn)}</span>`;
            i = after;
            matched = true;
            break;
          }
        }
      }
      if (!matched) { result += esc("@"); i++; }
      continue;
    }
    // [라벨] 하이라이팅
    if (text[i] === "[" && text[i + 1] !== "[") {
      const close = text.indexOf("]", i + 1);
      if (close !== -1 && close > i + 1) {
        result += `<span style="color:${dk ? "#666" : "#aaa"}">[</span><span style="color:${dk ? "#c0c0d0" : "#334155"};font-weight:600">${esc(text.substring(i + 1, close))}</span><span style="color:${dk ? "#666" : "#aaa"}">]</span>`;
        i = close + 1;
        continue;
      }
    }
    result += esc(text[i]);
    i++;
  }
  return result;
};

function EditorCell({ side, cell, upd, onUp, onDown, onInsert, onMouseDown, onMouseEnter, onMultiPaste, isSelected, first, last, tags, idx, rows, isFocused, onCellFocus, isBlank, darkMode }) {
  const editRef = useRef(null);
  const composingRef = useRef(false);
  const caretRef = useRef(0);
  const [tagDrop, setTagDrop] = useState(null);
  const [tagFocusIdx, setTagFocusIdx] = useState(0);

  const allTags = tags || DEFAULT_TAGS;
  const filteredTags = tagDrop ? (tagDrop.filter ? allTags.filter((t) => t.v.includes(tagDrop.filter)) : allTags) : [];
  const segments = parseInlineMarkup(cell.text, tags);
  const isHeader = segments.length === 1 && segments[0].type === "header";

  // 수동 innerHTML 동기화 (React children 사용하지 않음)
  // 포커스 중: raw 텍스트 + 문법 하이라이팅, 비포커스: 풀 렌더링 (뱃지 등)
  useEffect(() => {
    const el = editRef.current;
    if (!el || composingRef.current) return;
    const isFocusedEl = document.activeElement === el;
    const html = isFocusedEl ? textToEditHTML(cell.text, tags, darkMode) : segmentsToPreviewHTML(segments, isBlank, darkMode);
    let offset = 0;
    if (isFocusedEl) offset = getCaretOffset(el);
    el.innerHTML = html || "";
    if (isFocusedEl) setCaretOffset(el, offset);
  }, [cell.text, tags, isBlank, isFocused, darkMode]);

  const handleInput = () => {
    const el = editRef.current;
    if (!el || composingRef.current) return;
    const newText = (el.textContent || "").replace(/\n/g, "");
    caretRef.current = getCaretOffset(el);
    upd("text", newText);
    // # 트리거 감지
    const cursorPos = caretRef.current;
    const beforeCursor = newText.substring(0, cursorPos);
    const lastHash = beforeCursor.lastIndexOf("@");
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

  const selectTag = (tagName) => {
    if (!tagDrop) return;
    const before = cell.text.substring(0, tagDrop.hashIdx);
    const after = cell.text.substring(tagDrop.hashIdx + 1 + tagDrop.filter.length);
    const newText = before + "@" + tagName + " " + after;
    caretRef.current = before.length + 1 + tagName.length + 1;
    upd("text", newText);
    setTagDrop(null);
    setTimeout(() => { if (editRef.current) { editRef.current.focus(); setCaretOffset(editRef.current, caretRef.current); } }, 0);
  };

  const handleKeyDown = (e) => {
    // 탭 키는 최우선 가로채기 (들여쓰기)
    if (e.key === "Tab" || e.keyCode === 9 || e.which === 9) {
      if (!tagDrop || filteredTags.length === 0) {
        e.preventDefault();
        const curIndent = cell.indent || 0;
        if (e.shiftKey) {
          upd("indent", Math.max(0, curIndent - 1));
        } else {
          upd("indent", Math.min(2, curIndent + 1));
        }
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (onInsert) onInsert(e.shiftKey); // true면 위, false면 아래 삽입
      return;
    }

    // 한글 조합 중에는 키 이벤트 무시 (Enter로 글자 중복 방지)
    if (composingRef.current) return;
    if (tagDrop && filteredTags.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setTagFocusIdx((i) => Math.min(i + 1, filteredTags.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setTagFocusIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectTag(filteredTags[tagFocusIdx].v); return; }
      if (e.key === "Escape") { e.preventDefault(); setTagDrop(null); return; }
      return;
    }
    if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); onUp(); return; }
    if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); onDown(); return; }

    const colIdx = side === "r" ? 1 : 0;
    const goNext = () => { const next = e.target.closest("[data-row]")?.nextElementSibling?.querySelectorAll("[contenteditable]")[colIdx]; if (next) next.focus(); };
    const goPrev = () => { const prev = e.target.closest("[data-row]")?.previousElementSibling?.querySelectorAll("[contenteditable]")[colIdx]; if (prev) prev.focus(); };
    if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); goNext(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); goPrev(); return; }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (text.includes("\t") || text.includes("\n")) {
      if (onMultiPaste) onMultiPaste(text);
      return;
    }
    const cleanText = text.replace(/\n/g, " ");
    document.execCommand("insertText", false, cleanText);
  };

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    if (!tagDrop) return;
    const h = (e) => { if (!e.target.closest("[data-tag-dropdown]")) setTagDrop(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [tagDrop]);

  const dk = !!darkMode;

  const ghosts = getGhostSegments(rows, idx, side, tags);
  const ghostHTML = segmentsToPreviewHTML(ghosts, isBlank, darkMode);

  return (
    <div onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} style={{
      background: isSelected ? (dk ? "#2c3e50" : "#e0f2fe") : isFocused ? (dk ? "#1e2a45" : "#eef4ff") : (isHeader ? (dk ? "#1a2535" : "#fff") : (!cell.text ? (dk ? "rgba(30,41,59,0.7)" : "#fafafa") : (dk ? "rgba(15,23,42,0.6)" : "#fff"))),
      padding: "0 10px", display: "flex", alignItems: "center", gap: 0,
      height: ROW_H, maxHeight: ROW_H, overflow: "hidden", position: "relative"
    }}>
      {/* 들여쓰기 UI 표시기 (절대 위치로 배치하여 실제 너비 간섭 방지) */}
      {(cell.indent || 0) > 0 && (
        <div style={{ position: "absolute", left: 6, display: "flex", gap: 2, alignItems: "center", height: "100%" }}>
          {Array.from({ length: cell.indent }).map((_, i) => (
             <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#ec6619", opacity: 0.8 }} />
          ))}
        </div>
      )}
      {ghosts.length > 0 && (
        <div 
          dangerouslySetInnerHTML={{ __html: ghostHTML }} 
          style={{ visibility: "hidden", whiteSpace: "pre", paddingLeft: 4, pointerEvents: "none" }} 
        />
      )}
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={onCellFocus}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => { composingRef.current = false; handleInput(); }}
        style={{
          flex: 1, padding: `0 4px 0 ${ghosts.length > 0 ? 0 : 4}px`, outline: "none", minWidth: 0,
          fontSize: 12, lineHeight: `${ROW_H}px`, whiteSpace: "nowrap", overflow: "hidden",
          cursor: "text", color: dk ? "#f8fafc" : "inherit",
        }}
      />
      {tagDrop && filteredTags.length > 0 && (
        <TagDropdown tags={tags} filter={tagDrop.filter} anchorEl={editRef.current} onSelect={selectTag} onClose={() => setTagDrop(null)} focusIdx={tagFocusIdx} darkMode={darkMode} />
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
          <EditorCell 
            side={side} cell={row[side]} 
            upd={(f, v) => onCellChange(row.id, side, f, v)} 
            onUp={() => onMove(row.id, side, -1)} 
            onDown={() => onMove(row.id, side, 1)}
            onIndent={() => onCellChange(row.id, side, "indent", Math.min(2, (row[side].indent || 0) + 1))}
            onOutdent={() => onCellChange(row.id, side, "indent", Math.max(0, (row[side].indent || 0) - 1))}
            first={i === 0} last={i === rows.length - 1} tags={tags} idx={i} rows={rows} 
          />
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
              const segments = parseInlineMarkup(cell.text, tags);
              const isHdr = segments.length === 1 && segments[0].type === "header";
              const empty = !cell.text;
              const nxtSegs = side === "l" ? parseInlineMarkup(nextRow?.l.text, tags) : parseInlineMarkup(nextRow?.r.text, tags);
              const nxtHdr = nxtSegs.length === 1 && nxtSegs[0]?.type === "header";
              const btm = isLast ? "none" : ((isHdr && !nxtHdr) || (!isHdr && nxtHdr)) ? "2px solid #00391e" : "1px solid #e2e8f0";
              const extra = side === "r" ? { borderLeft: "2px solid #00391e" } : {};
              if (isHdr) return (
                <div style={{ ...HDR_STYLE, borderBottom: btm, ...extra }}>
                  <RenderSegments segments={segments} />
                </div>
              );
              const ghosts = getGhostSegments(unit.rows, i, side, tags);
              return (
                <div style={{ ...CELL_STYLE, padding: "0 10px", background: empty ? "#fafafa" : "#fff", borderBottom: btm, ...extra }}>
                  {cell.text && (
                    <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%", gap: 0 }}>
                      {ghosts.length > 0 && (
                        <div style={{ visibility: "hidden", whiteSpace: "pre", paddingLeft: 4, pointerEvents: "none" }}>
                           <RenderSegments segments={ghosts} isBlank={isBlank} />
                        </div>
                      )}
                      <div style={{ flex: 1, overflow: "hidden", paddingLeft: ghosts.length > 0 ? 0 : 4, whiteSpace: "nowrap" }}>
                        <RenderSegments segments={segments} isBlank={isBlank} />
                      </div>
                    </div>
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

/* ═══════ OverflowModal — 행 삽입 시 데이터 초과 경고창 ═══════ */
function OverflowModal({ onConfirm, onCancel, darkMode }) {
  const [foc, setFoc] = useState(1); // 0=취소, 1=확인
  useEffect(() => {
    const hk = (e) => {
      e.stopPropagation(); e.preventDefault();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") setFoc(f => 1 - f);
      if (e.key === "Enter") { if (foc === 1) onConfirm(); else onCancel(); }
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", hk, true); // 캡처 단계에서 가로채기
    return () => window.removeEventListener("keydown", hk, true);
  }, [foc, onConfirm, onCancel]);

  const dk = !!darkMode;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: dk ? "rgba(30,41,59,0.7)" : "#fff", padding: 30, borderRadius: 8, width: 360, textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: 0, color: dk ? "#ff6b6b" : "#e53e3e", fontSize: 18 }}>마지막 줄 삭제 경고</h3>
        <p style={{ fontSize: 14, color: dk ? "#f8fafc" : "#555", marginTop: 15, marginBottom: 25, lineHeight: 1.5 }}>
          현재 행을 삽입하면 <b>A4 규격(30줄)을 초과한 맨 마지막 줄의 데이터가 삭제됩니다.</b><br/>계속 진행하시겠습니까?
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 4, border: dk ? "1px solid #444" : "1px solid #ccc", background: foc === 0 ? (dk ? "#444" : "#e2e8f0") : (dk ? "rgba(255,255,255,0.05)" : "#fff"), color: dk ? "#eee" : "#333", fontWeight: foc === 0 ? 800 : 500, cursor: "pointer", outline: "none" }}>취소</button>
          <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: 4, border: "none", background: foc === 1 ? "#e53e3e" : (dk ? "#872b2b" : "#fc8181"), color: "#fff", fontWeight: foc === 1 ? 800 : 500, cursor: "pointer", outline: "none" }}>삭제 후 삽입</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════ RenderSegments — parseInlineMarkup 결과를 렌더링 ═══════ */
function RenderSegments({ segments, fontSize = 12, isBlank = false }) {
  return segments.map((seg, i) => {
    if (seg.type === "header") return (
      <span key={i} style={{
        fontWeight: 800, fontSize, color: "#00391e", letterSpacing: 2,
      }}>{seg.value}</span>
    );
    if (seg.type === "tag") return (
      <span key={i} style={{
        display: "inline-block", padding: "1px 7px", borderRadius: 3, marginRight: 4,
        background: seg.c, color: seg.tx, fontSize: 9.5, fontWeight: 700, flexShrink: 0, lineHeight: "16px",
      }}>{seg.value}</span>
    );
    if (seg.type === "heading") return (
      <span key={i} style={{
        fontSize: fontSize - 0.5, fontWeight: 800, color: "#1f2937",
        textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#aaa",
      }}>{seg.value}</span>
    );
    if (seg.type === "label") return (
      <span key={i} style={{
        display: "inline-block", padding: "1px 5px", borderRadius: 3, marginRight: 4,
        background: "#f3f4f6", color: "#334155", fontSize: 11, fontWeight: 600, flexShrink: 0, lineHeight: "16px",
      }}>{seg.value}</span>
    );
    // 일반 텍스트: worksheet이고 vis 아니면 투명, vis면 파란색
    return (
      <span key={i} style={{
        fontSize, color: (isBlank && !seg.vis) ? "transparent" : "#1f2937",
      }}>{seg.value}</span>
    );
  });
}

function MItem({ onClick, children, darkMode }) {
  const [hover, setHover] = useState(false);
  const dk = !!darkMode;
  return <button onClick={(e) => { e.stopPropagation(); onClick(); }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: "block", width: "100%", padding: "4px 10px", border: "none", background: hover ? (dk ? "#334155" : "#f3f4f6") : "none", textAlign: "left", fontSize: 13, cursor: "pointer", borderRadius: 3, color: dk ? "#f8fafc" : "#334155" }}>{children}</button>;
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
            <div style={{ width: thumbW, height: thumbH, overflow: "hidden", borderRadius: 4, border: "2px solid #cbd5e1", boxSizing: "border-box", background: "#fff" }}>
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
          <div style={{ fontSize: 13, fontWeight: 800, color: "#334155", padding: "0 2px 10px", borderBottom: "2px solid #ccc", marginBottom: 12 }}>{gName}</div>
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

  const updateUnit = (updates) => {
    setUnit((prev) => {
      if (!prev) return prev;
      const newUnit = typeof updates === "function" ? updates(prev) : { ...prev, ...updates };
      return newUnit;
    });
    setDirty(true);
  };

  // UI 상태
  const [darkMode, setDarkMode] = useState(false);
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
  const [focusedSide, setFocusedSide] = useState("l"); // "l" = 1열, "r" = 2열
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

  const [selection, setSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [insertPending, setInsertPending] = useState(null);
  const [session, setSession] = useState(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  const [myWorkspaces, setMyWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState("join");
  const [wsInput, setWsInput] = useState("");

  const handleWorkspaceAction = async (e) => {
    e.preventDefault();
    if (!wsInput.trim()) return alert("입력값이 없습니다.");
    
    if (workspaceMode === "create") {
      const { data: wsData, error: wsError } = await supabase.from('workspaces').insert([{ name: wsInput.trim(), owner_id: session.user.id }]).select().single();
      if (wsError) return alert(wsError.message);
      await supabase.from('workspace_members').insert([{ workspace_id: wsData.id, user_id: session.user.id, role: 'owner' }]);
      alert(`[${wsData.name}] 워크스페이스가 생성되었습니다!\\n초대 코드(ID): ${wsData.id}\\n동료 강사님들께 이 코드를 공유해주세요.`);
      await loadWorkspaces();
      setCurrentWorkspace(wsData);
    } else {
      const { error: joinError } = await supabase.from('workspace_members').insert([{ workspace_id: wsInput.trim(), user_id: session.user.id }]);
      if (joinError) return alert("유효하지 않은 코드이거나 이미 가입된 학원입니다.");
      alert("워크스페이스에 성공적으로 참가했습니다!");
      await loadWorkspaces();
      const { data } = await supabase.from('workspaces').select('*').eq('id', wsInput.trim()).single();
      if (data) setCurrentWorkspace(data);
    }
    setWsInput("");
    setShowWorkspaceModal(false);
  };

  const loadWorkspaces = async () => {
    if (!session) return;
    const { data } = await supabase.from('workspace_members').select('workspace_id, workspaces(id, name, owner_id)').eq('user_id', session.user.id);
    if (data) setMyWorkspaces(data.map(d => d.workspaces));
  };

  const handleJoinUrl = async (sessionData) => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode && sessionData) {
      await supabase.from('workspace_members').insert([{ workspace_id: joinCode, user_id: sessionData.user.id }]);
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("✨ 원장님/선생님의 학원 공간에 합류하셨습니다!\\n목록을 새로고침합니다.");
      window.location.reload();
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) handleJoinUrl(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const loadSettings = async () => {
    if (!session) return;
    const { data } = await supabase.from('users_settings').select('settings').eq('id', session.user.id).single();
    if (data?.settings) {
      if (data.settings.editorSettings) {
        setSettingsState(prev => ({ ...prev, ...data.settings.editorSettings }));
      } else if (data.settings.tags) {
        setSettingsState(prev => ({ ...prev, tags: data.settings.tags }));
      }
      if (typeof data.settings.darkMode === "boolean") {
        setDarkMode(data.settings.darkMode);
      }
    }
  };

  useEffect(() => {
    if (session) {
      loadSettings();
      loadWorkspaces();
      refreshFolder(); // Workspace changed or session initialized
    }
  }, [session, currentWorkspace]);

  const startDrag = (rowIdx, colIdx) => {
    setSelection({ start: { r: rowIdx, c: colIdx }, end: { r: rowIdx, c: colIdx } });
    setIsDragging(true);
  };
  const onDragEnter = (rowIdx, colIdx) => {
    if (isDragging && selection) {
      if (selection.start.r !== rowIdx || selection.start.c !== colIdx) {
        window.getSelection().removeAllRanges(); // 드래그 중 브라우저 텍스트 선택 해제
      }
      setSelection(s => s ? { ...s, end: { r: rowIdx, c: colIdx } } : s);
    }
  };
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    const handleCopy = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (!selection) return;
        const isMultiCell = selection.start.r !== selection.end.r || selection.start.c !== selection.end.c;
        if (!isMultiCell) return; // 단일 셀인 경우 브라우저 기본 동작 유지
        
        e.preventDefault();
        const sr = Math.min(selection.start.r, selection.end.r);
        const er = Math.max(selection.start.r, selection.end.r);
        const sc = Math.min(selection.start.c, selection.end.c);
        const ec = Math.max(selection.start.c, selection.end.c);
        if (unit && unit.rows) {
          let tsv = "";
          for (let r = sr; r <= er; r++) {
            if (!unit.rows[r]) continue;
            const rData = [];
            for (let c = sc; c <= ec; c++) {
              const side = c === 0 ? "l" : "r";
              rData.push(unit.rows[r][side].text || "");
            }
            tsv += rData.join("\t") + "\n";
          }
          navigator.clipboard.writeText(tsv.replace(/\n$/, ""));
          showToast("선택 범위 복사 완료", "info", 1500);
        }
      }
    };
    window.addEventListener("keydown", handleCopy);
    return () => window.removeEventListener("keydown", handleCopy);
  }, [selection, unit]);

  const handleMultiPaste = (startRowIdx, startColIdx, tsvText) => {
    const lines = tsvText.split(/\r?\n/).filter(l => l.trim() !== "" || tsvText.includes("\n"));
    if (lines.length === 0) return;
    updateUnit((u) => {
      const rs = u.rows.map(r => ({...r, l:{...r.l}, r:{...r.r}}));
      lines.forEach((line, rOffset) => {
        const rIndex = startRowIdx + rOffset;
        if (rIndex >= rs.length) return;
        const cells = line.split("\t");
        cells.forEach((val, cOffset) => {
          const cIndex = startColIdx + cOffset;
          if (cIndex === 0) rs[rIndex].l.text = val;
          else if (cIndex === 1) rs[rIndex].r.text = val;
        });
      });
      return { ...u, rows: rs };
    });
  };

  const confirmInsert = () => {
    if (!insertPending) return;
    executeInsert(insertPending.rowId, insertPending.shift);
  };
  const executeInsert = (rowId, shift) => {
    updateUnit((u) => {
      const rs = u.rows.map(r => ({ ...r, l: { ...r.l }, r: { ...r.r } }));
      const idx = rs.findIndex((r) => r.id === rowId);
      if (idx === -1) return u;
      const targetIdx = shift ? idx : idx + 1;
      rs.pop();
      const newR = emptyRow();
      rs.splice(targetIdx, 0, newR);
      setTimeout(() => { setFocusedRowId(newR.id); setFocusedSide("l"); }, 50);
      return { ...u, rows: rs };
    });
    setInsertPending(null);
  };
  const handleInsertRow = (rowId, shift) => {
    if (!unit) return;
    const lastRow = unit.rows[unit.rows.length - 1];
    if (lastRow && (lastRow.l.text || lastRow.r.text)) {
      setInsertPending({ rowId, shift });
    } else {
      executeInsert(rowId, shift);
    }
  };

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
      supabase.from('users_settings').upsert({ id: session?.user?.id, settings: { ...settings, editorSettings: next } });
      return next;
    });
  };

  const toggleDarkMode = () => {
    setDarkMode((v) => {
      const next = !v;
      supabase.from('users_settings').upsert({ id: session?.user?.id, settings: { ...settings, darkMode: next } });
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
      if (c.ans !== undefined) { if (c.vis === undefined) c.vis = !c.ans; delete c.ans; }
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
          parts.push("@" + tag);
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
      // bold → ## 소제목으로 변환
      if (c.bold) {
        if (c.text && !c.hdr) c.text = "## " + c.text;
        delete c.bold;
      } else {
        delete c.bold;
      }
      // hdr → # 헤더 변환
      if (c.hdr) {
        if (c.text) c.text = "# " + c.text;
        delete c.hdr;
      } else {
        delete c.hdr;
      }
      // vis → ! 프리픽스 변환 (vis=true이고 텍스트가 있으면 ! 추가)
      if (c.vis !== undefined) {
        if (c.vis && c.text && !c.text.startsWith("# ")) {
          c.text = "! " + c.text;
        }
        delete c.vis;
      }
      // *보임* → ! 프리픽스 변환 (줄 전체가 *...*로 감싸진 경우)
      if (c.text && /^\*[^*]+\*$/.test(c.text)) {
        c.text = "! " + c.text.slice(1, -1);
      }
      // 구 문법 → 새 문법 변환 (== == → # , <소제목> → ## , #태그 → @태그)
      if (c.text) {
        const hm = c.text.match(/^==\s*(.+?)\s*==$/);
        if (hm) c.text = "# " + hm[1];
        else if (c.text.match(/^<[^<=>-].*[^=>-]>$/)) c.text = "## " + c.text.slice(1, -1);
        // #태그 → @태그 (등록된 태그만)
        const allT = DEFAULT_TAGS.map((t) => t.v).filter(Boolean);
        allT.sort((a, b) => b.length - a.length);
        for (const tn of allT) {
          c.text = c.text.replace(new RegExp("#" + tn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)", "g"), "@" + tn);
        }
      }
    }); });
    return p;
  };

  
  const inlineImages = async (html) => {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    const promises = []; let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src.startsWith("data:")) continue;
      promises.push(
        fetch(src).then((r) => r.blob()).then((blob) => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ src, dataUrl: reader.result });
          reader.readAsDataURL(blob);
        })).catch(() => null)
      );
    }
    const results = (await Promise.all(promises)).filter(Boolean);
    let out = html;
    results.forEach(({ src, dataUrl }) => { out = out.split(src).join(dataUrl); });
    return out;
  };

  const togglePrintSelected = (filePath) => setPrintSelected((s) => { const n = new Set(s); n.has(filePath) ? n.delete(filePath) : n.add(filePath); return n; });
  const toggleAllPrintSelected = () => {
    const allPaths = fileList.map((f) => f.path);
    setPrintSelected((s) => s.size === allPaths.length ? new Set() : new Set(allPaths));
  };
  const togglePrintCheck = (key) => setPrintChecked((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // 폴더 리프레시 (Supabase)
  const refreshFolder = async () => {
    if (!session) return;
    const { data: docs, error } = await (currentWorkspace ? supabase.from('documents').select('id, group_path, title').eq('workspace_id', currentWorkspace.id) : supabase.from('documents').select('id, group_path, title').is('workspace_id', null).eq('user_id', session.user.id)).order('created_at', { ascending: false });
    if (error) return console.error(error);
    const uniqueGroups = [...new Set(docs.map(d => d.group_path || "미분류"))];
    const grps = uniqueGroups.filter(g => g !== "미분류").map(name => ({ name, path: name }));
    const flist = docs.map(d => ({ id: d.id, name: d.title + ".btm", path: d.id, group: d.group_path || "미분류" }));
    setGroups(grps);
    setFileList(flist);
    if (!currentFile && flist.length > 0) openFile(flist[0].path);
  };

  // 파일 열기
  const openFile = async (id) => {
    if (dirty && currentFile && unit) await saveFile();
    const { data, error } = await supabase.from('documents').select('content').eq('id', id).single();
    if (error) { showToast('파일 열기 실패'); return; }
    let d = data.content;
    if (d.units && !d.rows) d = { ...d.units[0], settings: d.settings || {} };
    d = migrateUnit(d);
    if (!d.rows) return;
    setUnit(d);
    setCurrentFile(id);
    setDirty(false);
    historyRef.current = [];
    redoRef.current = [];
    if (editorScrollRef.current) editorScrollRef.current.scrollTop = 0;
  };

  // 파일 저장
  const saveFile = async () => {
    if (!currentFile || !unit || !session) return;
    const { error } = await supabase.from('documents').update({ content: unit, title: unit.title }).eq('id', currentFile);
    if (error) { showToast(`저장 실패: ${error.message}`); return; }
    setDirty(false);
    refreshFolder();
  };

  // 출력 모달 열기
  const openPrintModal = async () => {
    if (printSelected.size === 0) return;
    if (dirty && currentFile && unit) await saveFile();
    const results = await Promise.all(
      fileList.filter((f) => printSelected.has(f.path)).map(async (f) => {
        try {
          const { data, error } = await supabase.from('documents').select('content').eq('id', f.path).single();
          if (error) return null;
          let d = data.content;
          if (d.units && !d.rows) d = { ...d.units[0], settings: d.settings || {} };
          d = migrateUnit(d);
          return d.rows ? { filePath: f.path, fileName: f.name.replace(/\.(btm|json)$/, ""), group: f.group, unit: d } : null;
        } catch { return null; }
      })
    );
    setAllUnits(results.filter(Boolean));
    const checked = new Set();
    results.filter(Boolean).forEach((u) => {
      if (printMode === "answer" || printMode === "both") checked.add(`${u.filePath}::answer`);
      if (printMode === "blank" || printMode === "both") checked.add(`${u.filePath}::blank`);
    });
    setPrintChecked(checked);
    setPrintModalOpen(true);
  };

  // 인쇄 실행 (웹 출력)
  const executePrint = async () => {
    if (printChecked.size === 0) return;
    setPrinting(true);
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
    
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css">
      <style>@page{size:A4;margin:0}body{margin:0;font-family:'Pretendard','Malgun Gothic',sans-serif}
      div:last-child{page-break-after:auto!important}
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head><body>${pagesHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setPrinting(false);
      printWindow.close();
    }, 500);
  };

  // 새 단원 생성
  const addNewUnit = async (groupName, unitName) => {
    if (!session) return;
    if (dirty && currentFile && unit) await saveFile();
    const existing = new Set(fileList.map((f) => f.name));
    let name = unitName || "새 단원"; let n = 1;
    while (existing.has(`${name}.btm`)) { name = `${unitName || "새 단원"} (${n++})`; }
    const newUnit = { title: name, rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) };
    const { data, error } = await supabase.from('documents').insert([{ 
      user_id: session.user.id, workspace_id: currentWorkspace ? currentWorkspace.id : null, 
      group_path: groupName || '미분류', 
      title: name, 
      content: newUnit 
    }]).select().single();
    if (error) { showToast("생성 실패"); return; }
    await refreshFolder();
    setUnit(newUnit);
    setCurrentFile(data.id);
    setDirty(false);
  };

  // 파일 삭제
  const deleteFile = async (id) => {
    if (!confirm("삭제할까요?")) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) { showToast("삭제 실패"); return; }
    if (currentFile === id) { setUnit(null); setCurrentFile(null); setDirty(false); }
    await refreshFolder();
  };

  // 파일 복제
  const duplicateFile = async (id) => {
    const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
    if (error || !data) return showToast("복제 실패");
    let name = `${data.title} (복사)`; let n = 1;
    const existing = new Set(fileList.map((f) => f.name));
    while (existing.has(`${name}.btm`)) { name = `${data.title} (복사 ${n++})`; }
    let dupData = data.content;
    if (dupData) dupData.title = name;
    
    const { data: newData, error: iErr } = await supabase.from('documents').insert([{
      user_id: session.user.id, workspace_id: currentWorkspace ? currentWorkspace.id : null,
      group_path: data.group_path,
      title: name,
      content: dupData || {}
    }]).select().single();
    if (iErr) return showToast("복제 저장 실패");
    await refreshFolder();
    openFile(newData.id);
  };

  // 그룹 이동
  const moveFileToGroup = async (id, groupName) => {
    const { error } = await supabase.from('documents').update({ group_path: groupName || '미분류' }).eq('id', id);
    if (error) return showToast("이동 실패");
    await refreshFolder();
  };

  // 파일명 연동 변경
  const renameActiveFile = async (newTitle) => {
    if (!currentFile || !newTitle.trim()) return;
    const { error } = await supabase.from('documents').update({ title: newTitle.trim() }).eq('id', currentFile);
    if (error) return showToast("변경 실패");
    await refreshFolder();
  };

  // 그룹 추가 (빈 폴더 개념이 없으므로 가짜 그룹은 불가능, 새 문서 추가 모달에서 지정)
  const addGroup = async () => {
    // Web 환경에서는 '폴더생성' 자체가 불가능 (그룹명은 문서를 만들때 지정)
    setNewGrp(""); setAddGroupOpen(false);
    showToast("새 문서를 만들 때 그룹을 지정해 주세요", "info", 2000);
  };

  // 그룹 삭제 (안에 든 파일들의 그룹명을 '미분류'로)
  const deleteGroup = async (groupPath) => {
    if (!confirm("그룹을 삭제할까요? (파일은 미분류로 이동됩니다)")) return;
    const { error } = await supabase.from('documents').update({ group_path: '미분류' }).eq('group_path', groupPath).eq('user_id', session.user.id);
    if (error) { showToast("그룹 삭제 실패"); return; }
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
  const BS = { padding: "4px 9px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 500, color: "#555" };

  const fontFamily = `'Pretendard','Malgun Gothic',sans-serif`;



  const renameGroup = async (oldPath, oldName, newName) => {
    if (!newName.trim() || newName.trim() === oldName) return;
    const { error } = await supabase.from('documents').update({ group_path: newName.trim() }).eq('group_path', oldName).eq('user_id', session.user.id);
    if (error) { showToast(`그룹 이름 변경 실패`); return; }
    await refreshFolder();
  };

  const dk = darkMode;
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
            style={{ flex: 1, fontSize: 14, fontWeight: 700, border: "1px solid #f5a855", outline: "none", background: dk ? "rgba(255,255,255,0.05)" : "#fff", borderRadius: 3, padding: "1px 6px", color: dk ? "#ffffff" : "#334155", minWidth: 0 }} />
        ) : (
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: dk ? "#f8fafc" : "#334155" }}>{g.name}</span>
        )}
        {!editing && <span style={{ fontSize: 10, color: dk ? "#888" : "#aaa", background: dk ? "rgba(255,255,255,0.1)" : "#edeef0", borderRadius: 8, padding: "1px 6px", fontWeight: 600, marginRight: 4 }}>{count}</span>}
        {!editing && (hover || menuOpen) && <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#aaa", padding: "0 2px", lineHeight: 1 }}>⋯</button>
          {menuOpen && <div ref={menuRef} style={{ position: "absolute", right: 0, top: "100%", marginTop: 2, background: dk ? "rgba(255,255,255,0.05)" : "#fff", borderRadius: 8, boxShadow: dk ? "0 8px 30px rgba(0,0,0,.4)" : "0 8px 30px rgba(0,0,0,.15)", padding: 4, zIndex: 100, minWidth: 120, border: dk ? "1px solid #404155" : "none" }}>
            <MItem onClick={startRename} darkMode={dk}>✎ 이름 변경</MItem>
            <MItem onClick={() => { onDelete(); setMenuOpen(false); }} darkMode={dk}>🗑 그룹 삭제</MItem>
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
        const { error } = await supabase.from('documents').update({ title: newTitle }).eq('id', f.path);
        if (error) { showToast(`이름 변경 실패`); return; }
        await refreshFolder();
      }
    };
    const toggleMenu = (e) => { e.stopPropagation(); setMenuOpen((v) => !v); };
    const menuPopup = menuOpen && (
        <div ref={menuRef} style={{ position: "absolute", right: 0, top: "100%", marginTop: 2, background: dk ? "rgba(255,255,255,0.05)" : "#fff", borderRadius: 8, boxShadow: dk ? "0 8px 30px rgba(0,0,0,.4)" : "0 8px 30px rgba(0,0,0,.15)", padding: 4, zIndex: 100, minWidth: 130, border: dk ? "1px solid #404155" : "none" }}>
          <MItem onClick={() => { startEdit(); setMenuOpen(false); }} darkMode={dk}>✎ 이름 변경</MItem>
          <MItem onClick={() => { duplicateFile(f.path); setMenuOpen(false); }} darkMode={dk}>📋 복제</MItem>
          <MItem onClick={() => { deleteFile(f.path); setMenuOpen(false); }} darkMode={dk}>🗑 삭제</MItem>
          {groups.length > 0 && <>
            <div style={{ height: 1, background: dk ? "#404155" : "#eee", margin: "3px 0" }} />
            <div style={{ padding: "3px 8px", fontSize: 11, color: dk ? "#888" : "#aaa", fontWeight: 600 }}>그룹 이동</div>
            {f.group && <MItem onClick={() => { moveFileToGroup(f.path, null); setMenuOpen(false); }} darkMode={dk}>미분류</MItem>}
            {groups.filter((g) => g.name !== f.group).map((g) => <MItem key={g.name} onClick={() => { moveFileToGroup(f.path, g.name); setMenuOpen(false); }} darkMode={dk}>{g.name}</MItem>)}
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
        background: dk ? "#3a2a1a" : "#fff7f0", borderLeft: "3px solid #ec6619",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>📄</span>
          {editing ? (
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
              autoFocus onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, fontSize: 13, fontWeight: 700, border: "1px solid #f5a855", outline: "none", background: dk ? "rgba(255,255,255,0.05)" : "#fff", borderRadius: 3, padding: "2px 6px", color: dk ? "#ffffff" : "#1f2937", minWidth: 0 }} />
          ) : (
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: dk ? "#ffffff" : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit?.title || displayName}</span>
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
              style={{ width: "100%", fontSize: 13, fontWeight: 600, border: "1px solid #f5a855", outline: "none", background: dk ? "rgba(255,255,255,0.05)" : "#fff", borderRadius: 3, padding: "2px 6px", color: dk ? "#ffffff" : "#1f2937", minWidth: 0 }} />
          ) : (
            <div style={{ fontSize: 13, fontWeight: 500, color: dk ? "#9a9aae" : "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
          )}
        </div>
        {dotsArea}
      </div>
    );
  };

  const handleSignup = async (e, email, pass) => { 
    e.preventDefault(); 
    const { error } = await supabase.auth.signUp({email, password: pass}); 
    if (error) alert(error.message); 
    else alert("가입 승인 메일을 확인해주세요 (설정에 따라 즉시 로그인될 수 있습니다)"); 
  };
  
  const handleLogin = async (e, email, pass) => { 
    e.preventDefault(); 
    const { error } = await supabase.auth.signInWithPassword({email, password: pass}); 
    if (error) alert(error.message); 
  };
  
  if (!session) {
    let _email="", _pass="", _passConfirm="";
    return (
      <div style={{ 
        position: "relative",
        height: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        overflow: "hidden",
        fontFamily: "'Pretendard', sans-serif"
      }}>
        {/* Animated background elements */}
        <div style={{ position: "absolute", width: "60vw", height: "60vw", minWidth: 400, background: "radial-gradient(circle, rgba(236,102,25,0.12) 0%, rgba(0,0,0,0) 65%)", top: "-15%", left: "-10%", borderRadius: "50%", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", width: "50vw", height: "50vw", minWidth: 400, background: "radial-gradient(circle, rgba(126,203,161,0.08) 0%, rgba(0,0,0,0) 65%)", bottom: "-10%", right: "-5%", borderRadius: "50%", filter: "blur(60px)" }} />
        
        <div style={{ 
          position: "relative",
          background: "rgba(30, 41, 59, 0.4)", 
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "48px 40px", 
          borderRadius: "28px", 
          width: "380px", 
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          textAlign: "center",
          zIndex: 10
        }}>
          <img src={logoImg} alt="Logo" style={{ width: 64, marginBottom: 20, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }} />
          <h2 style={{ color:"#fff", fontSize: "26px", fontWeight:800, margin: "0 0 10px 0", letterSpacing: "-0.02em" }}>Blank Test Maker</h2>
          <p style={{marginBottom: 36, color:"#94a3b8", fontSize: "14px", fontWeight: 500}}>선생님만의 시험지 데이터를 안전하게 관리하세요</p>
          
          <form onSubmit={e=>e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <input type="email" placeholder="이메일 입력 (예: admin@academy.com)" onChange={e=>_email=e.target.value} 
                style={{ width: "100%", padding: "16px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", color: "#f8fafc", fontSize: "15px", outline: "none", transition: "all 0.2s", boxSizing: "border-box" }} 
                onFocus={e => { e.target.style.borderColor = "#ec6619"; e.target.style.background = "rgba(15, 23, 42, 0.8)"; }} 
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(15, 23, 42, 0.6)"; }}
              />
            </div>
            <div style={{ position: "relative" }}>
              <input type="password" placeholder="비밀번호 입력" onChange={e=>_pass=e.target.value} 
                style={{ width: "100%", padding: "16px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", color: "#f8fafc", fontSize: "15px", outline: "none", transition: "all 0.2s", boxSizing: "border-box" }} 
                onFocus={e => { e.target.style.borderColor = "#ec6619"; e.target.style.background = "rgba(15, 23, 42, 0.8)"; }} 
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(15, 23, 42, 0.6)"; }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
               <button onClick={e => handleLogin(e, _email, _pass)} 
                 style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", color: "#fff", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: 700, fontSize: "16px", boxShadow: "0 4px 20px rgba(234, 88, 12, 0.35)", transition: "transform 0.1s, box-shadow 0.2s" }}
                 onMouseEnter={e => e.target.style.boxShadow = "0 6px 24px rgba(234, 88, 12, 0.45)"}
                 onMouseLeave={e => { e.target.style.boxShadow = "0 4px 20px rgba(234, 88, 12, 0.35)"; e.target.style.transform = "scale(1)"; }}
                 onMouseDown={e => e.target.style.transform = "scale(0.97)"} 
                 onMouseUp={e => e.target.style.transform = "scale(1)"} 
               >로그인</button>
               <button onClick={(e) => { e.preventDefault(); setShowSignupModal(true); }} 
                 style={{ width: "100%", padding: "16px", background: "rgba(255,255,255,0.03)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", cursor: "pointer", fontWeight: 600, fontSize: "15px", transition: "all 0.2s" }}
                 onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.color = "#f8fafc"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; }} 
                 onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.03)"; e.target.style.color = "#94a3b8"; e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
               >새 계정으로 시작하기</button>
            </div>
          </form>
        </div>

        {/* 회원가입 모달 */}
        {showSignupModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowSignupModal(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#1e293b", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "24px", padding: "40px", width: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)", position: "relative" }}>
              <button onClick={() => setShowSignupModal(false)} style={{ position: "absolute", top: 20, right: 24, border: "none", background: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
              <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: 800, margin: "0 0 8px 0" }}>반갑습니다! 👋</h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: 32 }}>사용하실 이메일과 비밀번호를 입력해 주세요.</p>
              
              <form onSubmit={e=>e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <input type="email" placeholder="이메일 입력" onChange={e=>_email=e.target.value} 
                    style={{ width: "100%", padding: "14px 16px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#f8fafc", fontSize: "15px", outline: "none", boxSizing: "border-box" }} 
                    onFocus={e => e.target.style.borderColor = "#ec6619"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                <div>
                  <input type="password" placeholder="비밀번호 입력 (6자리 이상)" onChange={e=>_pass=e.target.value} 
                    style={{ width: "100%", padding: "14px 16px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#f8fafc", fontSize: "15px", outline: "none", boxSizing: "border-box" }} 
                    onFocus={e => e.target.style.borderColor = "#ec6619"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                <div>
                  <input type="password" placeholder="비밀번호 확인" onChange={e=>_passConfirm=e.target.value} 
                    style={{ width: "100%", padding: "14px 16px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#f8fafc", fontSize: "15px", outline: "none", boxSizing: "border-box" }} 
                    onFocus={e => e.target.style.borderColor = "#ec6619"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                <button onClick={e => {
                  if (_pass !== _passConfirm) { alert("비밀번호가 서로 일치하지 않습니다."); return; }
                  handleSignup(e, _email, _pass);
                }} 
                  style={{ width: "100%", padding: "16px", background: "#f97316", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontSize: "16px", marginTop: 12 }}
                >계정 생성 완료</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleImportLocalFiles = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const title = file.name.replace(/\.(btm|json)$/, "");
        
        let cData = data;
        if (cData.units && !cData.rows) cData = { ...cData.units[0], settings: cData.settings || {} };
        
        await supabase.from('documents').insert([{
           user_id: session.user.id, workspace_id: currentWorkspace ? currentWorkspace.id : null,
           group_path: "로컬 업로드",
           title: cData.title || title,
           content: cData
        }]);
        successCount++;
      } catch (err) {
        console.error("Failed to import", file.name, err);
      }
    }
    alert(`${successCount}개의 내 PC 파일이 클라우드에 성공적으로 백업되었습니다! 목록 화면에서 언제든 확인하세요.`);
    await refreshFolder();
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", fontFamily, fontSize: 15, background: dk ? "#191919" : "#f7f7f5" }}>
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
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${dk ? "#404155" : "#cbd5e1"};border-radius:3px}
        ::-webkit-scrollbar-track{background:${dk ? "rgba(30,41,59,0.7)" : "transparent"}}
      `}</style>

      {/* ═══ 헤더 ═══ */}
      <div className="no-print" style={{ background: dk ? "rgba(30,41,59,0.7)" : "#fff", backdropFilter: dk ? "blur(12px)" : "none", WebkitBackdropFilter: dk ? "blur(12px)" : "none", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, padding: "0 14px", height: 42, display: "flex", alignItems: "center", gap: 8, flexShrink: 0, zIndex: 10 }}>
        <button onClick={() => setSidebarOpen((v) => !v)} style={{ border: "none", background: sidebarOpen ? (dk ? "rgba(255,255,255,0.05)" : "#f3f4f6") : "none", cursor: "pointer", fontSize: 17, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: sidebarOpen ? "#ec6619" : (dk ? "#888" : "#888"), borderRadius: 5, lineHeight: 1 }} title="파일 목록">☰</button>
        <select 
          value={currentWorkspace ? currentWorkspace.id : "private"} 
          onChange={(e) => {
            const val = e.target.value;
            if (val === "private") setCurrentWorkspace(null);
            else if (val === "new") setShowWorkspaceModal(true);
            else setCurrentWorkspace(myWorkspaces.find(w => w.id === val));
          }}
          style={{ appearance: "none", background: dk ? "rgba(255,255,255,0.05)" : "#f1f5f9", padding: "4px 24px 4px 10px", borderRadius: 6, border: `1px solid ${dk ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, color: dk ? "#f8fafc" : "#0f172a", fontSize: 13, fontWeight: 700, outline: "none", cursor: "pointer", backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='${dk?'%2394a3b8':'%2364748b'}' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center", backgroundSize: 14 }}
        >
          <option value="private">🏠 전체 테스트(개인)</option>
          {myWorkspaces.map(w => <option key={w.id} value={w.id}>🏢 {w.name}</option>)}
          <option value="new">+ 학원(채널) 참가/생성</option>
        </select>
        {currentWorkspace && (
          <button onClick={() => {
             navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?join=${currentWorkspace.id}`);
             alert("초대 링크가 복사되었습니다! 카톡으로 동료 선생님들께 전달해 주세요.");
          }} style={{ padding: "4px 10px", borderRadius: 4, background: dk ? "rgba(74, 222, 128, 0.15)" : "#dcfce7", color: dk ? "#4ade80" : "#166534", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 4 }}>
            🔗 초대 복사
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={toggleDarkMode} style={{ ...BS, height: 28, display: "flex", alignItems: "center", gap: 4, background: dk ? "rgba(255,255,255,0.05)" : "#fff", color: dk ? "#f8fafc" : "#555", borderColor: dk ? "#404155" : "#cbd5e1" }}>{dk ? "☀️ 라이트" : "🌙 다크"}</button>
        <button onClick={() => setSettingsOpen(true)} style={{ ...BS, height: 28, display: "flex", alignItems: "center", gap: 4, background: dk ? "rgba(255,255,255,0.05)" : "#fff", color: dk ? "#f8fafc" : "#555", borderColor: dk ? "#404155" : "#cbd5e1" }}>⚙ 설정</button>
        <button onClick={() => supabase.auth.signOut()} style={{ ...BS, height: 28, display: "flex", alignItems: "center", gap: 4, background: "#ef4444", color: "#fff", borderColor: "#ef4444", marginLeft: 6 }}>🚪 로그아웃</button>
      </div>

      {/* ═══ 메인 영역 ═══ */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 세로 바 (사이드바 닫혀있을 때) */}
        {!sidebarOpen && (
          <div onClick={() => setSidebarOpen(true)} style={{ width: 6, flexShrink: 0, background: dk ? "rgba(255,255,255,0.08)" : "#e2e8f0", cursor: "pointer", transition: "background .15s, width .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ec6619"; e.currentTarget.style.width = "8px"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"; e.currentTarget.style.width = "6px"; }} />
        )}
        {/* 통합 사이드바 */}
        <div className="no-print" style={{ width: sidebarOpen ? 280 : 0, minWidth: 0, background: dk ? "rgba(30,41,59,0.6)" : "#fff", backdropFilter: dk ? "blur(12px)" : "none", WebkitBackdropFilter: dk ? "blur(12px)" : "none", borderRight: sidebarOpen ? `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}` : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width .2s ease", flexShrink: 0, zIndex: 5 }}>
         <div style={{ minWidth: 280, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ padding: "0 12px", height: 42, display: "flex", alignItems: "center", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, flexShrink: 0 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: dk ? "#f8fafc" : "#334155" }}>파일 목록</span>
            <button onClick={toggleAllPrintSelected} style={{ border: "none", background: "none", fontSize: 10, color: "#888", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>{printSelected.size === fileList.length && fileList.length > 0 ? "전체 해제" : "전체 선택"}</button>
            <button onClick={() => { setAddUnitOpen(true); setNewUnitName(""); setNewUnitGroup(""); }} style={{ padding: "4px 12px", borderRadius: 5, border: "none", background: "#ec6619", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 4 }}>추가</button>
          </div>
          {addUnitOpen && (
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#f0f0f0"}`, background: dk ? "rgba(15,23,42,0.6)" : "#fafafa" }}>
              <input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newUnitName.trim()) { addNewUnit(newUnitGroup || null, newUnitName.trim()); setAddUnitOpen(false); } if (e.key === "Escape") setAddUnitOpen(false); }}
                placeholder="단원 이름" autoFocus
                style={{ width: "100%", padding: "5px 8px", border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, fontSize: 13, outline: "none", marginBottom: 6, boxSizing: "border-box", background: dk ? "rgba(255,255,255,0.05)" : "#fff", color: dk ? "#ffffff" : "inherit" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select value={newUnitGroup} onChange={(e) => setNewUnitGroup(e.target.value)}
                  style={{ flex: 1, padding: "4px 6px", border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, fontSize: 12, outline: "none", color: newUnitGroup ? (dk ? "#f8fafc" : "#334155") : "#aaa", background: dk ? "rgba(255,255,255,0.05)" : "#fff" }}>
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
            <div style={{ display: "flex", gap: 3, padding: "8px 12px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#f0f0f0"}` }}>
              <input value={newGrp} onChange={(e) => setNewGrp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} placeholder="그룹 이름" autoFocus style={{ flex: 1, padding: "4px 8px", border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, fontSize: 13, outline: "none", background: dk ? "rgba(255,255,255,0.05)" : "#fff", color: dk ? "#ffffff" : "inherit" }} />
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
                          style={{ flex: 1, padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 3, fontSize: 12, outline: "none", minWidth: 0 }} />
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
                {groups.length > 0 && <div style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: dk ? "#94a3b8" : "#bbb", borderRadius: 5, background: dk ? "rgba(15,23,42,0.6)" : "#f5f6f7", marginBottom: 2 }}>미분류</div>}
                {ungroupedFiles.map((f) => (
                  <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <input type="checkbox" checked={printSelected.has(f.path)} onChange={() => togglePrintSelected(f.path)}
                      style={{ accentColor: "#ec6619", width: 14, height: 14, flexShrink: 0, cursor: "pointer", margin: "0 4px 0 0" }} />
                    <div style={{ flex: 1, minWidth: 0 }}><FileItem f={f} /></div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAddGroupOpen(true)} style={{ width: "100%", padding: "6px 0", border: `1px dashed ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 5, background: "none", fontSize: 12, color: dk ? "#94a3b8" : "#aaa", cursor: "pointer", marginTop: 4 }}>새 그룹</button>
          </div>
          {/* 하단: 출력 모드 + 출력 버튼 */}
          <div style={{ borderTop: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, padding: "8px 12px", flexShrink: 0, background: dk ? "rgba(15,23,42,0.6)" : "#fafafa" }}>
            <div style={{ display: "flex", gap: 2, background: dk ? "#1a1b2e" : "#e8e8e8", borderRadius: 5, padding: 2, marginBottom: 8 }}>
              {[["answer", "A 답지"], ["blank", "W 시험지"], ["both", "A+W 둘 다"]].map(([mode, label]) => (
                <button key={mode} onClick={() => setPrintMode(mode)} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: printMode === mode ? (dk ? "rgba(255,255,255,0.05)" : "#fff") : "transparent", color: printMode === mode ? (mode === "answer" ? (dk ? "#7ecba1" : "#00391e") : mode === "blank" ? "#ec6619" : dk ? "#f8fafc" : "#333") : (dk ? "#94a3b8" : "#999"), boxShadow: printMode === mode ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{label}</button>
              ))}
            </div>
            <button onClick={openPrintModal} disabled={printing || printSelected.size === 0}
              style={{ width: "100%", padding: "7px 0", borderRadius: 6, border: "none", background: (printing || printSelected.size === 0) ? "#ccc" : "#ec6619", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (printing || printSelected.size === 0) ? "default" : "pointer" }}>
              {printing ? "처리 중..." : `🖨 선택 출력 (${printSelected.size})`}
            </button>
          </div>
         </div>
        </div>

        {/* 편집 메인 — A4 페이퍼 캔버스 뷰 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          <div ref={editorScrollRef} style={{ flex: 1, overflowY: "auto", background: dk ? "#191919" : "#f7f7f5", display: "flex", justifyContent: "center", padding: "40px 20px" }}>
            {unit ? (
              <div className="a4-canvas" style={{ width: "210mm", minHeight: "297mm", background: dk ? "#252525" : "#fff", boxShadow: "0 10px 40px rgba(0,0,0,0.05)", borderRadius: 4, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                {/* A4 캔버스 내부 헤더 */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20mm 20mm 10mm 20mm", borderBottom: `1px dashed ${dk ? "rgba(255,255,255,0.1)" : "#eee"}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ec6619", flexShrink: 0 }}>단원명</span>
                  <input value={unit.title} onChange={(e) => updateUnit({ title: e.target.value })} placeholder="문서 제목(단원명)을 입력하세요"
                    style={{ flex: 1, fontSize: 24, fontWeight: 800, border: "none", outline: "none", background: "transparent", color: dk ? "#ffffff" : "#111" }}
                  />
                  <div style={{ display: "flex", gap: 1, background: dk ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 6, padding: 2, flexShrink: 0 }}>
                    <button onClick={() => setPreviewMode("answer")} style={{ padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: previewMode === "answer" ? (dk ? "#334155" : "#fff") : "transparent", color: previewMode === "answer" ? (dk ? "#7ecba1" : "#16a34a") : (dk ? "#94a3b8" : "#94a3b8") }}>A (해설지)</button>
                    <button onClick={() => setPreviewMode("worksheet")} style={{ padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: previewMode === "worksheet" ? (dk ? "#334155" : "#fff") : "transparent", color: previewMode === "worksheet" ? "#ec6619" : (dk ? "#94a3b8" : "#94a3b8") }}>W (문제지)</button>
                  </div>
                </div>

                {/* 문법 가이드 영역 */}
                <div style={{ padding: "10px 20mm", margin: "10px 0", display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
                  {[
                    ["# ", "헤더"],  ["## ", "소제목"], ["@태그", "컬러 뱃지"], ["[라벨]", "회색 뱃지"],
                    ["! ", "항상 표시"], ["일반 문장", "자동 숨김 (W)"], ["Alt+↑↓", "상하 이동"],
                  ].map(([syntax, desc]) => (
                    <span key={syntax} style={{ fontSize: 11, color: dk ? "#94a3b8" : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                      <kbd style={{ padding: "2px 6px", borderRadius: 4, background: dk ? "rgba(255,255,255,0.05)" : "#f8fafc", border: `1px solid ${dk ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, color: dk ? "#cbd5e1" : "#475569", fontSize: 11, fontFamily: "inherit", fontWeight: 700 }}>{syntax}</kbd>
                      {desc}
                    </span>
                  ))}
                </div>

                {/* 실제 입력 및 출력 영역 격자 (A4 Full Width) */}
                <div style={{ padding: "0 20mm 20mm 20mm", flex: 1 }}>
                  <div style={{ border: `2px solid ${dk ? "#2e5e3e" : "#00391e"}`, borderRadius: 4, overflow: "hidden", width: "100%" }}>
                  {unit.rows.map((row, i) => {
                    const nextRow = unit.rows[i + 1];
                    const isLast = i >= unit.rows.length - 1;
                    const lSegs = parseInlineMarkup(row.l.text, settings.tags);
                    const rSegs = parseInlineMarkup(row.r.text, settings.tags);
                    const lHdr = lSegs.length === 1 && lSegs[0]?.type === "header";
                    const rHdr = rSegs.length === 1 && rSegs[0]?.type === "header";
                    const nxtLSegs = nextRow ? parseInlineMarkup(nextRow.l.text, settings.tags) : [];
                    const nxtRSegs = nextRow ? parseInlineMarkup(nextRow.r.text, settings.tags) : [];
                    const nxtLHdr = nxtLSegs.length === 1 && nxtLSegs[0]?.type === "header";
                    const nxtRHdr = nxtRSegs.length === 1 && nxtRSegs[0]?.type === "header";
                    const lBtm = isLast ? "none" : ((lHdr && !nxtLHdr) || (!lHdr && nxtLHdr)) ? `2px solid ${dk ? "#2e5e3e" : "#00391e"}` : `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`;
                    const rBtm = isLast ? "none" : ((rHdr && !nxtRHdr) || (!rHdr && nxtRHdr)) ? `2px solid ${dk ? "#2e5e3e" : "#00391e"}` : `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`;
                    return (
                      <div key={row.id} data-row data-rowid={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                        <div style={{ borderBottom: lBtm, overflow: "hidden" }}>
                          <EditorCell side="l" cell={row.l} upd={(f, v) => updateCellField(row.id, "l", f, v)} onUp={() => moveCellContent(row.id, "l", -1)} onDown={() => moveCellContent(row.id, "l", 1)}
                            onInsert={(shift) => handleInsertRow(row.id, shift)}
                            onMouseDown={() => startDrag(i, 0)} onMouseEnter={() => onDragEnter(i, 0)} onMultiPaste={(text) => handleMultiPaste(i, 0, text)}
                            isSelected={selection && i >= Math.min(selection.start.r, selection.end.r) && i <= Math.max(selection.start.r, selection.end.r) && 0 >= Math.min(selection.start.c, selection.end.c) && 0 <= Math.max(selection.start.c, selection.end.c)}
                            first={i === 0} last={isLast} tags={settings.tags} idx={i} rows={unit.rows} isFocused={focusedRowId === row.id && focusedSide === "l"} onCellFocus={() => { setFocusedRowId(row.id); setFocusedSide("l"); setSelection(null); setIsDragging(false); }} isBlank={previewMode === "worksheet"} darkMode={dk} />
                        </div>
                        <div style={{ borderLeft: `2px solid ${dk ? "#2e5e3e" : "#00391e"}`, borderBottom: rBtm, overflow: "hidden" }}>
                          <EditorCell side="r" cell={row.r} upd={(f, v) => updateCellField(row.id, "r", f, v)} onUp={() => moveCellContent(row.id, "r", -1)} onDown={() => moveCellContent(row.id, "r", 1)}
                            onInsert={(shift) => handleInsertRow(row.id, shift)}
                            onMouseDown={() => startDrag(i, 1)} onMouseEnter={() => onDragEnter(i, 1)} onMultiPaste={(text) => handleMultiPaste(i, 1, text)}
                            isSelected={selection && i >= Math.min(selection.start.r, selection.end.r) && i <= Math.max(selection.start.r, selection.end.r) && 1 >= Math.min(selection.start.c, selection.end.c) && 1 <= Math.max(selection.start.c, selection.end.c)}
                            first={i === 0} last={isLast} tags={settings.tags} idx={i} rows={unit.rows} isFocused={focusedRowId === row.id && focusedSide === "r"} onCellFocus={() => { setFocusedRowId(row.id); setFocusedSide("r"); setSelection(null); setIsDragging(false); }} isBlank={previewMode === "worksheet"} darkMode={dk} />
                        </div>
                      </div>
                    );
                  })
                  }
                  </div>
                </div>
              </div>
              ) : (
                <div style={{ textAlign: "center", padding: "80px 40px", color: dk ? "#4a4a5e" : "#ccc" }}>
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
          <div onClick={(e) => e.stopPropagation()} style={{ background: dk ? "rgba(30,41,59,0.7)" : "#fff", borderRadius: 10, width: "90vw", maxWidth: 1100, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)", border: dk ? "1px solid #2e2f42" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: dk ? "#f8fafc" : "#334155" }}>출력 미리보기</span>
              <span style={{ fontSize: 12, color: "#999" }}>{printChecked.size}페이지</span>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <button onClick={() => setPrintZoom(z => Math.max(30, z - 10))} style={{ width: 24, height: 24, border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, background: dk ? "rgba(255,255,255,0.05)" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: dk ? "#f8fafc" : "#666", lineHeight: 1 }}>−</button>
                <span style={{ fontSize: 11, color: "#999", fontWeight: 600, minWidth: 34, textAlign: "center" }}>{printZoom}%</span>
                <button onClick={() => setPrintZoom(z => Math.min(200, z + 10))} style={{ width: 24, height: 24, border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, background: dk ? "rgba(255,255,255,0.05)" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: dk ? "#f8fafc" : "#666", lineHeight: 1 }}>+</button>
              </div>
              <button onClick={executePrint} disabled={printing || printChecked.size === 0} style={{ padding: "5px 18px", borderRadius: 6, border: "none", background: (printing || printChecked.size === 0) ? "#ccc" : "#ec6619", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (printing || printChecked.size === 0) ? "default" : "pointer", marginLeft: 8 }}>
                {printing ? "처리 중..." : "🖨 출력"}
              </button>
              <button onClick={() => setPrintModalOpen(false)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#999", padding: "2px 6px", marginLeft: 4 }}>✕</button>
            </div>
            <div onWheel={(e) => { if (!e.ctrlKey) return; e.preventDefault(); setPrintZoom(z => Math.max(30, Math.min(200, z + (e.deltaY < 0 ? 10 : -10)))); }} style={{ flex: 1, overflow: "auto", background: dk ? "#0f172a" : "#e8e8e8", padding: "16px" }}>
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
                  const rawHtml2 = `<!DOCTYPE html><html><head><meta charset="utf-8">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css">
                    <style>@page{size:A4;margin:0}body{margin:0;font-family:'Pretendard','Malgun Gothic',sans-serif}div:last-child{page-break-after:auto!important}</style>
                    </head><body>${body}</body></html>`;
                  const html = await inlineImages(rawHtml2);
                  
                  const printWindow = window.open("", "_blank");
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => { printWindow.print(); setPrinting(false); printWindow.close(); }, 500);

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
          <div onClick={(e) => e.stopPropagation()} style={{ background: dk ? "rgba(30,41,59,0.7)" : "#fff", borderRadius: 10, padding: 20, width: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)", border: dk ? "1px solid #2e2f42" : "none" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 700, color: dk ? "#ffffff" : "inherit" }}>설정</h3>
            {/* ── 태그 관리 ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: dk ? "#f8fafc" : "#334155", display: "block", marginBottom: 5 }}>태그 관리</label>
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
                        const replaceTag = (text) => text.replace(new RegExp("@" + oldV.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)", "g"), "@" + nv);
                        updateUnit((u) => ({
                          ...u, rows: u.rows.map((r) => ({
                            ...r,
                            l: { ...r.l, text: replaceTag(r.l.text) },
                            r: { ...r.r, text: replaceTag(r.r.text) },
                          }))
                        }));
                      }
                    }} placeholder="태그 이름" style={{ flex: 1, padding: "4px 7px", border: `1px solid ${dk ? "#404155" : "#e2e8f0"}`, borderRadius: 4, fontSize: 14, outline: "none", background: dk ? "rgba(255,255,255,0.05)" : "#fff", color: dk ? "#ffffff" : "inherit" }} />
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
              }} style={{ marginTop: 5, padding: "4px 10px", borderRadius: 4, border: `1px dashed ${dk ? "#404155" : "#ccc"}`, background: "none", fontSize: 13, cursor: "pointer", color: dk ? "#94a3b8" : "#888" }}>+ 태그 추가</button>
            </div>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}` }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: dk ? "#f8fafc" : "#334155", display: "block", marginBottom: 5 }}>데이터 관리</label>
              <span style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 14 }}>기존에 작업하신 `.btm` 파일들을 업로드하면 클라우드에 백업됩니다.</span>
              <label style={{ display: "inline-flex", padding: "8px 14px", borderRadius: 6, border: `1px solid ${dk ? "#404155" : "#ccc"}`, background: dk ? "rgba(255,255,255,0.05)" : "#f9fafb", color: dk ? "#ffffff" : "#333", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                📂 이전 파일 불러오기 (.btm)
                <input type="file" multiple accept=".btm,.json" style={{ display: "none" }} onChange={async (e) => { setSettingsOpen(false); await handleImportLocalFiles(e); }} />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setSettingsOpen(false)} style={{ padding: "7px 18px", borderRadius: 5, border: "none", background: "#ec6619", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {insertPending && (
        <OverflowModal onConfirm={confirmInsert} onCancel={() => setInsertPending(null)} darkMode={dk} />
      )}
      {/* 워크스페이스 모달 */}
      {showWorkspaceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setShowWorkspaceModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: dk ? "#1e293b" : "#fff", border: `1px solid ${dk ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, borderRadius: "24px", padding: "32px", width: "400px", boxShadow: "0 20px 40px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setWorkspaceMode("join")} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: workspaceMode === "join" ? "#ec6619" : (dk ? "rgba(255,255,255,0.1)" : "#f1f5f9"), color: workspaceMode === "join" ? "#fff" : (dk ? "#94a3b8" : "#64748b"), fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>팀 참가하기</button>
              <button onClick={() => setWorkspaceMode("create")} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: workspaceMode === "create" ? "#ec6619" : (dk ? "rgba(255,255,255,0.1)" : "#f1f5f9"), color: workspaceMode === "create" ? "#fff" : (dk ? "#94a3b8" : "#64748b"), fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>새 학원 생성</button>
            </div>
            
            <form onSubmit={handleWorkspaceAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {workspaceMode === "join" ? (
                <>
                  <p style={{ margin: 0, fontSize: 13, color: dk ? "#cbd5e1" : "#475569" }}>원장님이나 동료 강사님이 공유해준 '초대 코드(ID)'를 붙여넣어 워크스페이스에 참여하세요!</p>
                  <input value={wsInput} onChange={e=>setWsInput(e.target.value)} placeholder="초대 코드 입력" style={{ width: "100%", padding: "14px", background: dk ? "rgba(15,23,42,0.6)" : "#f8fafc", border: `1px solid ${dk ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`, borderRadius: "10px", color: dk ? "#fff" : "#000", outline: "none", boxSizing: "border-box" }} />
                  <button type="submit" style={{ padding: "14px", background: "#10b981", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>초대 코드로 참가</button>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 13, color: dk ? "#cbd5e1" : "#475569" }}>선생님들의 공용 공간이 될 우리 학원의 이름을 정해주세요. 생성 즉시 팀원들에게 뿌릴 공유 코드가 발급됩니다.</p>
                  <input value={wsInput} onChange={e=>setWsInput(e.target.value)} placeholder="학원 이름 (예: 깊은생각 대치본원)" style={{ width: "100%", padding: "14px", background: dk ? "rgba(15,23,42,0.6)" : "#f8fafc", border: `1px solid ${dk ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`, borderRadius: "10px", color: dk ? "#fff" : "#000", outline: "none", boxSizing: "border-box" }} />
                  <button type="submit" style={{ padding: "14px", background: "#ec6619", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>워크스페이스 채널 오픈</button>
                </>
              )}
            </form>
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
