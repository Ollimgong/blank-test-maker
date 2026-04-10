import React from "react";
import logoImg from "../../assets/logo.png";
import { parseInlineMarkup, getGhostSegments } from "../../utils/btmParser.js";
import RenderSegments from "./RenderSegments.jsx";

const ROW_H = 27; // fixed row height (px) — notebook-ruled feel
const CELL_STYLE = {
  height: ROW_H, maxHeight: ROW_H, overflow: "hidden",
  display: "flex", alignItems: "center", gap: 4,
  background: "#fff",
};

export default function Preview({ unit, isBlank, fontFamily, tags, printId }) {
  if (!unit) return <div style={{ padding: 40, color: "#bbb", textAlign: "center", fontSize: 13 }}>단원을 선택하세요</div>;
  return (
    <div id={printId || "print-wrapper"}>
      <div id={printId ? undefined : "print-area"} style={{
        padding: "20mm", width: "210mm", minHeight: "297mm", boxSizing: "border-box",
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
