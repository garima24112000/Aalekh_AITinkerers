"use client"
import { OracleNode, NodeCategory } from "@/types/oracle"
import { useState, useEffect } from "react"

interface Props {
  activeNode: OracleNode | null
}

const templates: Record<NodeCategory, () => JSX.Element> = {
  financial: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SliderControl label="Risk Tolerance" min={0} max={100} defaultValue={30} />
      <ToggleControl label="Include investor scenarios" defaultValue={false} />
      <ToggleControl label="Show cash flow projections" defaultValue={true} />
    </div>
  ),
  strategic: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SelectControl label="Time horizon" options={["3 months", "6 months", "1 year", "3 years"]} />
      <ToggleControl label="Include competitive analysis" defaultValue={false} />
      <ToggleControl label="Show market sizing" defaultValue={true} />
    </div>
  ),
  operational: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SliderControl label="Complexity" min={0} max={100} defaultValue={50} />
      <SelectControl label="Team size" options={["Solo", "2–5", "6–15", "15+"]} />
      <ToggleControl label="Include tooling recommendations" defaultValue={true} />
    </div>
  ),
  tactical: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <ChecklistControl items={["Define success metric", "Set a 2-week deadline", "Identify one blocker"]} />
      <ToggleControl label="Show templates" defaultValue={false} />
    </div>
  ),
}

function SliderControl({ label, min, max, defaultValue }: { label: string; min: number; max: number; defaultValue: number }) {
  const [val, setVal] = useState(defaultValue)
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{val}</span>
      </div>
      <input type="range" min={min} max={max} value={val}
        onChange={e => setVal(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#4A9EFF" }} />
    </div>
  )
}

function ToggleControl({ label, defaultValue }: { label: string; defaultValue: boolean }) {
  const [on, setOn] = useState(defaultValue)
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <div onClick={() => setOn(!on)} style={{
        width: "32px", height: "18px", borderRadius: "9px", cursor: "pointer",
        background: on ? "rgba(74,158,255,0.6)" : "rgba(255,255,255,0.1)",
        position: "relative", transition: "background 200ms",
      }}>
        <div style={{
          position: "absolute", top: "3px",
          left: on ? "17px" : "3px",
          width: "12px", height: "12px",
          borderRadius: "50%", background: "white",
          transition: "left 200ms",
        }} />
      </div>
    </div>
  )
}

function SelectControl({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>{label}</p>
      <select style={{
        width: "100%", background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
        padding: "6px 8px", color: "rgba(255,255,255,0.7)", fontSize: "12px",
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ChecklistControl({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map((item, i) => (
        <div key={i} onClick={() => setChecked(prev => prev.map((v, j) => j === i ? !v : v))}
          style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <div style={{
            width: "14px", height: "14px", borderRadius: "3px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: checked[i] ? "rgba(74,158,255,0.5)" : "transparent",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textDecoration: checked[i] ? "line-through" : "none" }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AdaptiveSidebar({ activeNode }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (activeNode) setTimeout(() => setVisible(true), 50)
    else setVisible(false)
  }, [activeNode?.id])

  if (!activeNode) return null

  const Template = templates[activeNode.category]

  return (
    <div style={{
      width: visible ? "200px" : "0px",
      minWidth: visible ? "200px" : "0px",
      overflow: "hidden",
      transition: "width 250ms ease-out, min-width 250ms ease-out",
      background: "rgba(255,255,255,0.02)",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ padding: "20px 16px", width: "200px" }}>
        <p style={{ fontSize: "10px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: "4px" }}>
          Context
        </p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", marginBottom: "20px", lineHeight: 1.4 }}>
          {activeNode.label}
        </p>
        <Template />
      </div>
    </div>
  )
}
