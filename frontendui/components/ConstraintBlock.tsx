"use client"
import { useEffect, useState } from "react"

interface Props {
  index: number
  label: string
  x: number
  y: number
}

const ACCENT_COLORS = [
  { border: "rgba(61,142,240,0.4)", text: "rgba(61,142,240,0.8)", bg: "rgba(61,142,240,0.06)" },
  { border: "rgba(240,160,32,0.4)", text: "rgba(240,160,32,0.8)", bg: "rgba(240,160,32,0.06)" },
  { border: "rgba(32,212,118,0.4)", text: "rgba(32,212,118,0.8)", bg: "rgba(32,212,118,0.06)" },
  { border: "rgba(180,100,240,0.4)", text: "rgba(180,100,240,0.8)", bg: "rgba(180,100,240,0.06)" },
  { border: "rgba(240,80,80,0.35)", text: "rgba(240,80,80,0.7)", bg: "rgba(240,80,80,0.06)" },
]

export default function ConstraintBlock({ label, x, y, index }: Props) {
  const [visible, setVisible] = useState(false)
  const color = ACCENT_COLORS[index % ACCENT_COLORS.length]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
      opacity: visible ? 1 : 0,
      translate: visible ? "0 0" : "0 14px",
      transition: "opacity 500ms cubic-bezier(0.16,1,0.3,1), translate 500ms cubic-bezier(0.16,1,0.3,1)",
      pointerEvents: "none",
      zIndex: 2,
    }}>
      <div style={{ position: "relative", padding: "6px 12px" }}>
        {/* Corner brackets */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderTop: `1px solid ${color.border}`, borderLeft: `1px solid ${color.border}` }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderTop: `1px solid ${color.border}`, borderRight: `1px solid ${color.border}` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 8, height: 8, borderBottom: `1px solid ${color.border}`, borderLeft: `1px solid ${color.border}` }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderBottom: `1px solid ${color.border}`, borderRight: `1px solid ${color.border}` }} />
        <div style={{ background: color.bg, backdropFilter: "blur(4px)", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: color.text, animation: "pulseGlow 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: color.text, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}