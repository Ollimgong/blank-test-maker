import React, { useState } from "react";

export default function MItem({ onClick, children, darkMode }) {
  const [hover, setHover] = useState(false);
  const dk = !!darkMode;
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      onMouseEnter={() => setHover(true)} 
      onMouseLeave={() => setHover(false)} 
      style={{ 
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px", border: "none", 
        background: hover ? (dk ? "#334155" : "#f1f5f9") : "transparent", 
        textAlign: "left", fontSize: 13, cursor: "pointer", borderRadius: 6, 
        color: dk ? "#f8fafc" : "#334155", fontWeight: 600, transition: "background 0.1s ease"
      }}
    >
      {children}
    </button>
  );
}
