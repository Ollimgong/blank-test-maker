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
        display: "block", width: "100%", padding: "4px 10px", border: "none", 
        background: hover ? (dk ? "#334155" : "#f3f4f6") : "none", 
        textAlign: "left", fontSize: 13, cursor: "pointer", borderRadius: 3, 
        color: dk ? "#f8fafc" : "#334155" 
      }}
    >
      {children}
    </button>
  );
}
