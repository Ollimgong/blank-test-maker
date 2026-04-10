import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function WorkspaceSwitcher({
  currentWorkspace,
  myWorkspaces,
  onSelectWorkspace,
  onNewWorkspace,
  onCopyInvite,
  darkMode
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const dk = !!darkMode;

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Initial avatar letter
  const getAvatar = (name, isPrivate) => {
    if (isPrivate) return "🏠";
    return name ? name.charAt(0).toUpperCase() : "🏢";
  };

  const activeName = currentWorkspace ? currentWorkspace.name : "개인 워크스페이스";

  return (
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, flexShrink: 0 }}>
      {/* Switcher Button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", padding: "6px 8px", borderRadius: 6, border: "none",
          background: open ? (dk ? "rgba(255,255,255,0.08)" : "#f1f5f9") : "transparent",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          transition: "background 0.2s", textAlign: "left"
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = dk ? "rgba(255,255,255,0.05)" : "#f8fafc"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: currentWorkspace ? "linear-gradient(135deg, #ec6619 0%, #f5a855 100%)" : "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, flexShrink: 0,
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
        }}>
          {getAvatar(currentWorkspace?.name, !currentWorkspace)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: dk ? "#f8fafc" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeName}
          </div>
          <div style={{ fontSize: 11, color: dk ? "#94a3b8" : "#64748b", fontWeight: 500, marginTop: -1 }}>
            {currentWorkspace ? "팀 공간" : "내 전용 시스템"}
          </div>
        </div>
        <span style={{ fontSize: 13, color: dk ? "#64748b" : "#94a3b8", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {open && btnRef.current && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: btnRef.current.getBoundingClientRect().bottom + 6,
            left: btnRef.current.getBoundingClientRect().left,
            width: 280,
            background: dk ? "#1e293b" : "#fff",
            border: `1px solid ${dk ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
            borderRadius: 12,
            boxShadow: dk ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.15)",
            zIndex: 9999,
            overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}
        >
          {currentWorkspace && (
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
              <button
                onClick={() => { onCopyInvite(); setOpen(false); }}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 6, border: "none",
                  background: dk ? "rgba(74, 222, 128, 0.15)" : "#dcfce7", color: dk ? "#4ade80" : "#166534",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
              >
                <span>🔗 초대 링크 복사 (강사 초대)</span>
              </button>
            </div>
          )}

          <div style={{ padding: "6px" }}>
            <div style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: dk ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              내 공간
            </div>
            <div
              onClick={() => { onSelectWorkspace(null); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                background: !currentWorkspace ? (dk ? "rgba(255,255,255,0.08)" : "#f8fafc") : "transparent",
              }}
              onMouseEnter={(e) => { if (currentWorkspace) e.currentTarget.style.background = dk ? "rgba(255,255,255,0.05)" : "#f8fafc"; }}
              onMouseLeave={(e) => { if (currentWorkspace) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 4, background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>🏠</div>
              <span style={{ fontSize: 13, fontWeight: !currentWorkspace ? 700 : 500, color: dk ? "#f8fafc" : "#1e293b", flex: 1 }}>개인 워크스페이스</span>
              {!currentWorkspace && <span style={{ fontSize: 14, color: "#10b981" }}>✓</span>}
            </div>
          </div>

          {myWorkspaces.length > 0 && (
            <div style={{ padding: "0 6px 6px 6px" }}>
              <div style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: dk ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                참여 학원 (팀 단위)
              </div>
              {myWorkspaces.map(w => (
                <div
                  key={w.id}
                  onClick={() => { onSelectWorkspace(w); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: currentWorkspace?.id === w.id ? (dk ? "rgba(255,255,255,0.08)" : "#f8fafc") : "transparent",
                  }}
                  onMouseEnter={(e) => { if (currentWorkspace?.id !== w.id) e.currentTarget.style.background = dk ? "rgba(255,255,255,0.05)" : "#f8fafc"; }}
                  onMouseLeave={(e) => { if (currentWorkspace?.id !== w.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: "linear-gradient(135deg, #ec6619 0%, #f5a855 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{w.name.charAt(0)}</div>
                  <span style={{ fontSize: 13, fontWeight: currentWorkspace?.id === w.id ? 700 : 500, color: dk ? "#f8fafc" : "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                  {currentWorkspace?.id === w.id && <span style={{ fontSize: 14, color: "#10b981" }}>✓</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: "6px", borderTop: `1px solid ${dk ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
            <div
              onClick={() => { onNewWorkspace(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                color: dk ? "#94a3b8" : "#64748b"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = dk ? "rgba(255,255,255,0.05)" : "#f8fafc"; e.currentTarget.style.color = dk ? "#f8fafc" : "#1e293b"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = dk ? "#94a3b8" : "#64748b"; }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 4, border: `1px dashed ${dk ? "#64748b" : "#94a3b8"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>+</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>학원(채널) 참가 / 생성</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
