import React from "react";

export default function USFlagIcon({ size = 20 }: { size?: number }) {
  const w = size;
  const h = Math.round(size * 0.62);
  return (
    <svg width={w} height={h} viewBox="0 0 30 18" style={{ opacity: 0.35, flexShrink: 0 }}>
      <rect width="30" height="18" fill="#7a2530" />
      {[1.8, 4.2, 6.6, 9, 11.4, 13.8, 16.2].map((y, i) => (
        <rect key={i} x="0" y={y} width="30" height="1.4" fill="#dfe6f2" />
      ))}
      <rect width="13" height="9.4" fill="#22345c" />
    </svg>
  );
}
