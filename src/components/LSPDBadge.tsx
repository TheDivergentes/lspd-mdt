import React from "react";

export default function LSPDBadge({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="19" fill="#0d1729" stroke="#c9a227" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="#c9a227" strokeWidth="0.6" opacity="0.5" />
      <path d="M20 8 L29 11 V19 C29 26 25 30.5 20 33 C15 30.5 11 26 11 19 V11 Z" fill="#16233b" stroke="#c9a227" strokeWidth="1" />
      <path d="M20 14 L21.8 18 L26 18.3 L22.8 21 L23.9 25.2 L20 22.8 L16.1 25.2 L17.2 21 L14 18.3 L18.2 18 Z" fill="#c9a227" />
    </svg>
  );
}
