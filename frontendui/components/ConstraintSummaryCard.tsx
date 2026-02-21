"use client"
import { Constraint } from "@/types/oracle"

interface Props {
  constraints: Constraint[]
  problem: string
  onConfirm: () => void
}

export default function ConstraintSummaryCard({ constraints, problem, onConfirm }: Props) {
  const summary = constraints.map(c => c.value).join(". ")

  return (
    <div style={{
      background: "rgba(10,10,20,0.95)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "12px",
      padding: "24px",
      margin: "16px",
      animation: "slideUp 300ms ease-out",
    }}>
      <p style={{ fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "12px", textTransform: "uppercase" }}>
        Here is what I understood
      </p>
      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: "20px" }}>
        {summary}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={onConfirm}
          style={{
            background: "rgba(74,158,255,0.15)",
            border: "1px solid rgba(74,158,255,0.4)",
            borderRadius: "8px",
            padding: "10px",
            color: "#4A9EFF",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 150ms",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,158,255,0.25)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(74,158,255,0.15)")}
        >
          Confirm — reveal the map
        </button>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          ↵ Enter to confirm
        </p>
      </div>
    </div>
  )
}
