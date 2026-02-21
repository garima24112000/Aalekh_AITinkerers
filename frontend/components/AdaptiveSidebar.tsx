"use client"
import React from "react"
import { OracleNode, NodeCategory } from "@/types/oracle"
import { useState, useEffect } from "react"

interface Props {
  activeNode: OracleNode | null
}

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  financial: "FINANCIAL",
  strategic: "STRATEGIC",
  operational: "OPERATIONAL",
  tactical: "TACTICAL",
}

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  financial: "var(--accent-amber)",
  strategic: "var(--accent-blue)",
  operational: "rgba(32,212,118,0.8)",
  tactical: "rgba(180,100,240,0.8)",
}

function SliderControl({ label, min, max, defaultValue }: { label: string; min: number; max: number; defaultValue: number }) {
  const [val, setVal] = useState(defaultValue)
  const pct = ((val - min) / (max - min)) * 100
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>{val}</span>
      </div>
      <div style={{ position: "relative", height: "2px", background: "rgba(255,255,255,0.08)", borderRadius: "1px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "var(--accent-blue)", borderRadius: "1px", transition: "width 100ms" }} />
      </div>
      <input type="range" min={min} max={max} value={val} onChange={e => setVal(Number(e.target.value))} style={{ width: "100%", opacity: 0, height: "16px", cursor: "pointer", marginTop: "-9px", position: "relative", zIndex: 1 }} />
    </div>
  )
}

function ToggleControl({ label, defaultValue }: { label: string; defaultValue: boolean }) {
  const [on, setOn] = useState(defaultValue)
  return (
    <div onClick={() => setOn(!on)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
      <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ width: "28px", height: "14px", borderRadius: "7px", background: on ? "rgba(61,142,240,0.5)" : "rgba(255,255,255,0.08)", border: `1px solid ${on ? "rgba(61,142,240,0.6)" : "rgba(255,255,255,0.1)"}`, position: "relative", transition: "all 200ms" }}>
        <div style={{ position: "absolute", top: "2px", left: on ? "14px" : "2px", width: "8px", height: "8px", borderRadius: "50%", background: on ? "var(--accent-blue)" : "rgba(255,255,255,0.3)", transition: "left 200ms, background 200ms" }} />
      </div>
    </div>
  )
}

function SelectControl({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.06em", marginBottom: "6px" }}>{label}</p>
      <select style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-mid)", borderRadius: "2px", padding: "6px 8px", color: "rgba(255,255,255,0.7)", fontSize: "11px", fontFamily: "var(--font-mono)", cursor: "pointer" }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ChecklistControl({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
      {items.map((item, i) => (
        <div key={i} onClick={() => setChecked(prev => prev.map((v, j) => j === i ? !v : v))} style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
          <div style={{ width: "12px", height: "12px", flexShrink: 0, marginTop: "1px", border: `1px solid ${checked[i] ? "var(--accent-blue)" : "rgba(255,255,255,0.2)"}`, borderRadius: "1px", background: checked[i] ? "var(--accent-blue-dim)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 150ms" }}>
            {checked[i] && <span style={{ fontSize: "8px", color: "var(--accent-blue)" }}>✓</span>}
          </div>
          <span style={{ fontSize: "11px", color: checked[i] ? "var(--text-tertiary)" : "var(--text-secondary)", textDecoration: checked[i] ? "line-through" : "none", lineHeight: 1.4, transition: "all 150ms" }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

const templates: Record<NodeCategory, () => React.ReactElement> = {
  financial: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <SliderControl label="RISK TOLERANCE" min={0} max={100} defaultValue={30} />
      <ToggleControl label="INVESTOR SCENARIOS" defaultValue={false} />
      <ToggleControl label="CASH FLOW PROJECTION" defaultValue={true} />
      <SelectControl label="PRICING MODEL" options={["Day rate", "Retainer", "Value-based", "Project"]} />
    </div>
  ),
  strategic: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <SelectControl label="TIME HORIZON" options={["3 months", "6 months", "1 year", "3 years"]} />
      <ToggleControl label="COMPETITIVE ANALYSIS" defaultValue={false} />
      <ToggleControl label="MARKET SIZING" defaultValue={true} />
      <SliderControl label="AMBITION LEVEL" min={0} max={100} defaultValue={60} />
    </div>
  ),
  operational: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <SliderControl label="COMPLEXITY" min={0} max={100} defaultValue={50} />
      <SelectControl label="TEAM SIZE" options={["Solo", "2–5", "6–15", "15+"]} />
      <ToggleControl label="TOOLING RECOMMENDATIONS" defaultValue={true} />
      <ToggleControl label="PROCESS TEMPLATES" defaultValue={false} />
    </div>
  ),
  tactical: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <ChecklistControl items={["Define success metric", "Set a 2-week deadline", "Identify one blocker"]} />
      <div style={{ height: "1px", background: "var(--border-dim)" }} />
      <ToggleControl label="SHOW TEMPLATES" defaultValue={false} />
    </div>
  ),
}

export default function AdaptiveSidebar({ activeNode }: Props) {
  const [visible, setVisible] = useState(false)
  const [currentNode, setCurrentNode] = useState(activeNode)

  useEffect(() => {
    if (activeNode) {
      setCurrentNode(activeNode)
      setTimeout(() => setVisible(true), 30)
    } else {
      setVisible(false)
    }
  }, [activeNode?.id])

  if (!activeNode && !visible) return null

  const Template = currentNode ? templates[currentNode.category] : null
  const color = currentNode ? CATEGORY_COLORS[currentNode.category] : "var(--accent-blue)"
  const categoryLabel = currentNode ? CATEGORY_LABELS[currentNode.category] : ""

  return (
    <div style={{ width: visible ? "210px" : "0px", minWidth: visible ? "210px" : "0px", overflow: "hidden", transition: "width 280ms cubic-bezier(0.16,1,0.3,1), min-width 280ms cubic-bezier(0.16,1,0.3,1)", background: "var(--bg-panel)", borderLeft: "1px solid var(--border-dim)", display: "flex", flexDirection: "column" }}>
      <div style={{ width: "210px", height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border-dim)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color, letterSpacing: "0.15em" }}>{categoryLabel}</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.4, fontWeight: 500 }}>{currentNode?.label}</p>
        </div>
        {/* Controls */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {Template && <Template />}
        </div>
        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-dim)", flexShrink: 0 }}>
          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>CONTEXTUAL CONTROLS</span>
        </div>
      </div>
    </div>
  )
}