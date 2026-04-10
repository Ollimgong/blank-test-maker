import React, { useRef, useState, useEffect } from "react";
import { DEFAULT_TAGS, ROW_H } from "../../utils/constants.js";
import { parseInlineMarkup, getGhostSegments, segmentsToPreviewHTML, textToEditHTML } from "../../utils/btmParser.js";
import { getCaretOffset, setCaretOffset } from "../../utils/btmHelpers.js";
import TagDropdown from "./TagDropdown.jsx";

export function EditorCell({ side, cell, upd, onUp, onDown, onInsert, onMouseDown, onMouseEnter, onMultiPaste, isSelected, first, last, tags, idx, rows, isFocused, onCellFocus, isBlank, darkMode }) {
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

export function EditorSideGroup({ side, label, color, rows, onCellChange, onMove, tags, onMultiPaste, isDragging, selection, startDrag, onDragEnter, focusedRowId, focusedSide, setFocusedRowId, setFocusedSide, handleInsertRow, darkMode }) {
  const dk = !!darkMode;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 4px 4px", position: "sticky", top: 0, zIndex: 5, background: dk ? "#1e293b" : "#fafafa" }}>
        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, background: color, color: "#fff", fontSize: 13, fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: 12, color: dk ? "#888" : "#aaa" }}>{rows.length}행</span>
      </div>
      {rows.map((row, i) => {
        const cSide = side === "l" ? 0 : 1;
        const s_sr = selection ? Math.min(selection.start.r, selection.end.r) : -1;
        const s_er = selection ? Math.max(selection.start.r, selection.end.r) : -1;
        const s_sc = selection ? Math.min(selection.start.c, selection.end.c) : -1;
        const s_ec = selection ? Math.max(selection.start.c, selection.end.c) : -1;
        const isSelected = selection && (i >= s_sr && i <= s_er) && (cSide >= s_sc && cSide <= s_ec);

        return (
          <div key={row.id} data-row style={{ borderRadius: 4, marginBottom: 1, background: dk ? "#334155" : "#e0e0e0" }}>
            <EditorCell 
              side={side} cell={row[side]} 
              upd={(f, v) => onCellChange(row.id, side, f, v)} 
              onUp={() => onMove(row.id, side, -1)} 
              onDown={() => onMove(row.id, side, 1)}
              onInsert={(shift) => handleInsertRow(row.id, shift)}
              onMouseDown={() => startDrag(i, cSide)}
              onMouseEnter={() => { if (isDragging) onDragEnter(i, cSide); }}
              onMultiPaste={(tsv) => onMultiPaste(i, cSide, tsv)}
              isSelected={isSelected}
              first={i === 0} last={i === rows.length - 1} tags={tags} idx={i} rows={rows} 
              isFocused={focusedRowId === row.id && focusedSide === side}
              onCellFocus={() => { setFocusedRowId(row.id); setFocusedSide(side); if (selection && !isDragging) window.getSelection().removeAllRanges(); }}
              darkMode={darkMode}
              isBlank={false}
            />
          </div>
        );
      })}
    </div>
  );
}
