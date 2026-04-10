import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function TagDropdown({ tags, filter, anchorEl, onSelect, onClose, focusIdx, darkMode }) {
  const dk = !!darkMode;
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!anchorEl || !tags.length) return null;
  const rect = anchorEl.getBoundingClientRect();

  return createPortal(
    <div
      style={{
        position: "fixed", top: rect.bottom + 4, left: rect.left,
        background: dk ? "#1e293b" : "#fff",
        border: `1px solid ${dk ? "#334155" : "#e2e8f0"}`,
        borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        zIndex: 9999, padding: "4px", minWidth: "120px",
      }}
    >
      <div style={{ fontSize: "10px", color: dk ? "#94a3b8" : "#94a3b8", padding: "4px 8px", borderBottom: `1px solid ${dk ? "#334155" : "#f1f5f9"}`, marginBottom: "4px" }}>
        태그 선택 (Enter)
      </div>
      {tags.map((t, i) => {
        const isFocused = i === focusIdx;
        return (
          <div
            key={t.v}
            onClick={() => onSelect(t.v)}
            style={{
              padding: "6px 8px", cursor: "pointer", borderRadius: "4px",
              background: isFocused ? (dk ? "#334155" : "#f1f5f9") : "transparent",
              display: "flex", alignItems: "center", gap: "6px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = dk ? "#334155" : "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isFocused ? (dk ? "#334155" : "#f1f5f9") : "transparent"; }}
          >
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: t.c }}></span>
            <span style={{ fontSize: "12px", color: dk ? "#f8fafc" : "#334155", fontWeight: isFocused ? "600" : "400" }}>{t.v}</span>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
