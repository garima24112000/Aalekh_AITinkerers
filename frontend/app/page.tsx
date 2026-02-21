"use client"
import { useState } from "react"
import { OracleState } from "@/types/oracle"
import { mockInterrogationState } from "@/mock/mockState"
import InterrogationPanel from "@/components/InterrogationPanel"
import ConstraintBlock from "@/components/ConstraintBlock"
import AdaptiveSidebar from "@/components/AdaptiveSidebar"

interface ConstraintBlockData {
  label: string
  x: number
  y: number
  id: string
}

export default function Home() {
  const [phase, setPhase] = useState<"entry" | "interrogation" | "ignition" | "exploration">("entry")
  const [problem, setProblem] = useState("")
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [constraintBlocks, setConstraintBlocks] = useState<ConstraintBlockData[]>([])
  const [state, setState] = useState<OracleState>(mockInterrogationState)

  // This will be replaced by useCoAgent from Phase 1
  const activeNode = state.mapState.nodes.find(n => n.id === state.mapState.activeNodeId) ?? null

  const handleProblemSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && problem.trim()) {
      setState(prev => ({ ...prev, problem: problem.trim(), phase: "interrogation" }))
      setPhase("interrogation")
    }
  }

  const handleAnswerSubmit = (answer: string, dimension: string, block: { label: string; x: number; y: number }) => {
    setConstraintBlocks(prev => [...prev, { ...block, id: `block-${Date.now()}` }])
    setState(prev => ({
      ...prev,
      constraints: [...prev.constraints, {
        id: `c${prev.constraints.length + 1}`,
        dimension: dimension as any,
        type: "shaper",
        value: answer,
        answeredAt: new Date().toISOString(),
        timelineIndex: prev.constraints.length,
      }],
    }))
  }

  const handleConfirmIgnition = () => {
    setPhase("exploration")
    setState(prev => ({ ...prev, phase: "exploration" }))
    setTimeout(() => setPanelCollapsed(true), 800)
    // Phase 1 will trigger map_generator here
  }

  if (phase === "entry") {
    return (
      <main style={{
        width: "100vw", height: "100vh",
        background: "#080810",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "24px",
      }}>
        <h1 style={{
          fontSize: "32px", fontWeight: 300,
          letterSpacing: "0.3em", color: "rgba(255,255,255,0.9)",
          textTransform: "uppercase",
        }}>
          ORACLE
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
          Map your solution space
        </p>
        <input
          autoFocus
          value={problem}
          onChange={e => setProblem(e.target.value)}
          onKeyDown={handleProblemSubmit}
          placeholder="Describe the problem you're trying to solve…"
          style={{
            width: "480px", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px",
            padding: "14px 18px", color: "white", fontSize: "14px",
            outline: "none", textAlign: "center",
          }}
        />
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>↵ Enter to begin</p>
      </main>
    )
  }

  return (
    <main style={{
      width: "100vw", height: "100vh",
      background: "#080810",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        height: "40px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", padding: "0 20px",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "13px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
          Oracle
        </span>
        <span style={{
          marginLeft: "12px", fontSize: "10px", letterSpacing: "0.1em",
          color: "rgba(74,158,255,0.6)", textTransform: "uppercase",
          background: "rgba(74,158,255,0.1)", padding: "2px 8px", borderRadius: "10px",
        }}>
          {phase}
        </span>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left panel — InterrogationPanel */}
        <div
          onClick={() => phase === "exploration" && panelCollapsed && setPanelCollapsed(false)}
          style={{ display: "flex", flexShrink: 0 }}
        >
          <InterrogationPanel
            state={state}
            onAnswerSubmit={handleAnswerSubmit}
            onConfirmIgnition={handleConfirmIgnition}
            collapsed={panelCollapsed}
          />
        </div>

        {/* Center — Map canvas (Person 4 owns this, we just scaffold the container) */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

          {/* Fog overlay — phase-driven */}
          {phase === "interrogation" && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none",
              background: "radial-gradient(ellipse at center, rgba(8,8,16,0.3) 0%, rgba(8,8,16,0.85) 100%)",
              transition: "opacity 600ms",
            }} />
          )}

          {/* Constraint blocks */}
          {constraintBlocks.map(block => (
            <ConstraintBlock key={block.id} label={block.label} x={block.x} y={block.y} />
          ))}

          {/* Placeholder for Person 4's MapCanvas */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {phase === "interrogation" && (
              <p style={{ color: "rgba(255,255,255,0.1)", fontSize: "12px", letterSpacing: "0.1em" }}>
                Map forming…
              </p>
            )}
            {phase === "exploration" && (
              <p style={{ color: "rgba(255,255,255,0.1)", fontSize: "12px", letterSpacing: "0.1em" }}>
                {"← Person 4's MapCanvas renders here"}
              </p>
            )}
          </div>
        </div>

        {/* Right — Adaptive Sidebar */}
        <AdaptiveSidebar activeNode={activeNode} />
      </div>

      {/* Bottom — Timeline scrubber placeholder for Person 4 */}
      {phase === "exploration" && (
        <div style={{
          height: "80px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
          display: "flex", alignItems: "center", padding: "0 60px",
          flexShrink: 0,
          animation: "slideUp 300ms ease-out",
        }}>
          <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "11px", letterSpacing: "0.1em" }}>
            {"← Person 4's Timeline Scrubber renders here"}
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #1a1a2e; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </main>
  )
}
