import React, { useState, useEffect } from "react";

export default function OverflowModal({ onConfirm, onCancel, darkMode }) {
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
