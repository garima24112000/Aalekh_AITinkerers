"use client"
import { useEffect, useState } from "react"

interface Props {
  label: string
  x: number
  y: number
}

export default function ConstraintBlock({ label, x, y }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        opacity: visible ? 0.7 : 0,
        translate: visible ? "0 0" : "0 20px",
        transition: "opacity 400ms ease-out, translate 400ms ease-out",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "20px",
        padding: "4px 10px",
        fontSize: "11px",
        fontFamily: "monospace",
        color: "rgba(255,255,255,0.6)",
        whiteSpace: "nowrap",
      }}>
        {label}
      </div>
    </div>
  )
}
