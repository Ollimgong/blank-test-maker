import React from "react";

export default function RenderSegments({ segments, fontSize = 12, isBlank = false }) {
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
