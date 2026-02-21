"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useCoAgent } from "@copilotkit/react-core"
import { useCopilotChat } from "@copilotkit/react-core"
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql"
import { OracleState, DEFAULT_ORACLE_STATE } from "@/types/oracle"
import InterrogationPanel from "@/components/InterrogationPanel"
import ConstraintBlock from "@/components/ConstraintBlock"
import AdaptiveSidebar from "@/components/AdaptiveSidebar"
import MapCanvas from "@/components/MapCanvas"
import TimelineScrubber from "@/components/TimelineScrubber"
import StarField from "@/components/StarField"

interface ConstraintBlockData {
  label: string
  x: number
  y: number
  id: string
}

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, animation: "pulseGlow 2s ease-in-out infinite" }} />
      <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", letterSpacing: "0.12em" }}>{label}</span>
    </div>
  )
}

function EntryScreen({ onSubmit }: { onSubmit: (p: string) => void }) {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <StarField />

      {/* Corner brackets */}
      {[{ top: 24, left: 24 }, { top: 24, right: 24 }, { bottom: 24, left: 24 }, { bottom: 24, right: 24 }].map((pos, i) => (
        <div key={i} style={{
          position: "fixed", ...pos as any,
          width: 20, height: 20, zIndex: 2,
          borderTop: i < 2 ? "1px solid rgba(0,200,200,0.3)" : undefined,
          borderBottom: i >= 2 ? "1px solid rgba(0,200,200,0.3)" : undefined,
          borderLeft: i % 2 === 0 ? "1px solid rgba(0,200,200,0.3)" : undefined,
          borderRight: i % 2 === 1 ? "1px solid rgba(0,200,200,0.3)" : undefined,
        }} />
      ))}

      {/* Status pills */}
      <div style={{
        position: "fixed", top: 20,
        display: "flex", alignItems: "center", gap: "16px",
        zIndex: 2, animation: "fadeIn 800ms ease-out",
      }}>
        <StatusPill color="var(--accent-green)" label="SYSTEM ONLINE" />
        <StatusPill color="var(--accent-amber)" label="AWAITING INPUT" />
      </div>

      {/* Main content */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: "32px",
        position: "relative", zIndex: 2,
        animation: "fadeIn 600ms ease-out",
      }}>
        {/* Logo + wordmark */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <img
            src="/aalekh-logo.jpeg"
            alt="Aalekh"
            style={{
              height: "88px",
              width: "auto",
              borderRadius: "10px",
              opacity: 0.95,
              filter: "drop-shadow(0 0 24px rgba(0,200,200,0.35))",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <h1 style={{
              fontSize: "40px",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              letterSpacing: "0.28em",
              color: "var(--text-primary)",
              textTransform: "uppercase",
              textShadow: "0 0 40px rgba(0,200,200,0.3)",
            }}>
              AALEKH
            </h1>
            <p style={{
              fontSize: "10px", fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)", letterSpacing: "0.28em",
              textTransform: "uppercase",
            }}>
              Map Your Solution Space · Powered by Claude
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "480px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, var(--border-mid))" }} />
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>INITIALIZE</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, var(--border-mid))" }} />
        </div>

        {/* Input */}
        <div style={{ width: "480px" }}>
          <div style={{
            position: "relative",
            border: `1px solid ${focused ? "rgba(0,200,200,0.5)" : "var(--border-mid)"}`,
            borderRadius: "2px",
            background: "rgba(4,4,10,0.8)",
            backdropFilter: "blur(12px)",
            transition: "border-color 200ms, box-shadow 200ms",
            boxShadow: focused ? "0 0 0 3px rgba(0,200,200,0.08), 0 0 30px rgba(0,200,200,0.1)" : "none",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
              background: focused ? "var(--accent-blue)" : "transparent",
              transition: "background 200ms", borderRadius: "2px 0 0 2px",
            }} />
            <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 14px 20px", gap: "10px" }}>
              <span style={{
                fontSize: "13px", fontFamily: "var(--font-mono)",
                color: focused ? "var(--accent-blue)" : "var(--text-tertiary)",
                transition: "color 200ms",
              }}>›_</span>
              <input
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && value.trim() && onSubmit(value.trim())}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Describe the problem you're trying to solve…"
                style={{
                  flex: 1, background: "transparent", border: "none",
                  fontSize: "13px", color: "var(--text-primary)", letterSpacing: "0.01em",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", padding: "0 4px" }}>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
              Be specific. The more context, the sharper the map.
            </span>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>↵ BEGIN</span>
          </div>
        </div>
      </div>

      <div style={{
        position: "fixed", bottom: 24,
        fontSize: "10px", fontFamily: "var(--font-mono)",
        color: "var(--text-tertiary)", letterSpacing: "0.12em", zIndex: 2,
      }}>
        AALEKH · BUILT AT ANTHROPIC HACKATHON 2025
      </div>
    </div>
  )
}

function TopBar({ phase, problem, constraintCount }: { phase: string; problem: string; constraintCount: number }) {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => setTime(new Date().toISOString().slice(11, 19))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      height: "38px", flexShrink: 0,
      background: "rgba(4,4,10,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-dim)",
      display: "flex", alignItems: "center",
      padding: "0 16px", gap: "12px",
      position: "relative", zIndex: 10,
    }}>
      {/* Logo + name */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img
          src="/aalekh-logo.jpeg"
          alt="Aalekh"
          style={{ height: "22px", width: "auto", borderRadius: "3px", opacity: 0.9 }}
        />
        <span style={{
          fontSize: "12px", fontFamily: "var(--font-display)",
          fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-primary)",
        }}>
          AALEKH
        </span>
      </div>

      <div style={{ width: "1px", height: "16px", background: "var(--border-dim)" }} />

      {/* Phase badge */}
      <div style={{
        padding: "2px 8px",
        background: "rgba(0,200,200,0.08)",
        border: "1px solid rgba(0,200,200,0.2)",
        borderRadius: "2px",
      }}>
        <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--accent-blue)", letterSpacing: "0.12em" }}>
          {(phase || "entry").toUpperCase()}
        </span>
      </div>

      {/* Problem */}
      <span style={{
        fontSize: "11px", color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)", flex: 1,
        overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap", maxWidth: "400px",
      }}>
        {problem}
      </span>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
          <span style={{ color: "var(--accent-amber)" }}>{constraintCount}</span>/5 CONSTRAINTS
        </span>
        <div style={{ width: "1px", height: "16px", background: "var(--border-dim)" }} />
        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
          {time} UTC
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  // ── CopilotKit state sync ────────────────────────────────────────
  const { state: agentState, setState: setAgentState } = useCoAgent<OracleState>({
    name: "oracle_agent",
    initialState: DEFAULT_ORACLE_STATE,
  })
  const { appendMessage } = useCopilotChat()

  // Helper to send a user message to the LangGraph agent
  const sendMessage = useCallback((content: string) => {
    appendMessage(
      new TextMessage({
        role: MessageRole.User,
        content,
      })
    )
  }, [appendMessage])

  // Use agent state with fallback to defaults
  const state = agentState ?? DEFAULT_ORACLE_STATE

  // Prevent SSR prerender issues — hooks need a browser environment
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ── Local UI-only state ──────────────────────────────────────────
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [constraintBlocks, setConstraintBlocks] = useState<ConstraintBlockData[]>([])
  const [currentPosition, setCurrentPosition] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [fogLevel, setFogLevel] = useState(0)
  const [warpSpeed, setWarpSpeed] = useState(false)
  const [zoomTarget, setZoomTarget] = useState<{ x: number; y: number } | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [hasEnteredProblem, setHasEnteredProblem] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)

  // Derive phase from backend state
  const phase = state.phase === "map_generation" ? "ignition" : state.phase

  // Keep fog level in sync with constraint count
  useEffect(() => {
    setFogLevel(state.constraints?.length ?? 0)
  }, [state.constraints?.length])

  // Keep currentPosition in sync with exploration history
  useEffect(() => {
    if (state.explorationHistory?.length) {
      setCurrentPosition(state.explorationHistory.length)
    }
  }, [state.explorationHistory?.length])

  // Auto-transition to exploration when map is ready
  useEffect(() => {
    if (state.phase === "exploration" && state.mapState?.nodes?.length > 0) {
      setWarpSpeed(false)
      setPanelCollapsed(true)
    }
  }, [state.phase, state.mapState?.nodes?.length])

  const activeNode = state.mapState?.nodes?.find(n => n.id === state.mapState.activeNodeId) ?? null

  // ── Handlers ─────────────────────────────────────────────────────

  const handleAnswerSubmit = useCallback((answer: string, dimension: string, block: { label: string; x: number; y: number }) => {
    // Add visual constraint block (purely decorative)
    setConstraintBlocks(prev => [...prev, { ...block, id: `block-${Date.now()}` }])
    // Send answer as a message to the LangGraph agent
    // The backend interrogator node processes it: records constraint, generates next question
    sendMessage(answer)
  }, [sendMessage])

  const handleConfirmIgnition = useCallback(() => {
    setWarpSpeed(true)
    setTimeout(() => setFogLevel(5), 400)
    // The backend already transitions to map_generation after the final answer.
    // Sending a confirmation message triggers map_generator if it hasn't run yet.
    sendMessage("Confirm constraints and generate the solution map.")
    // The agent will return with phase="exploration" + mapState with real nodes.
    // The useEffect above handles the UI transition.
    setTimeout(() => {
      setWarpSpeed(false)
    }, 3000)
  }, [sendMessage])

  const handleNodeClick = useCallback(async (nodeId: string) => {
    const node = state.mapState?.nodes?.find(n => n.id === nodeId)
    if (node && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      setZoomTarget({
        x: (node.x / 100) * rect.width,
        y: (node.y / 100) * rect.height,
      })
    }

    setWarpSpeed(true)
    setIsZoomed(true)
    setIsLoading(true)

    // Set expandNodeId + activeNodeId in agent state, then trigger the graph
    setAgentState((prev) => {
      const p = prev ?? DEFAULT_ORACLE_STATE
      return {
        ...p,
        expandNodeId: nodeId,
        mapState: { ...p.mapState, activeNodeId: nodeId },
      }
    })

    // Send a trigger message — backend routes to expander node
    sendMessage(`Expand node: ${nodeId}`)

    // Visual loading completes when state.mapState updates (via useEffect),
    // but set a minimum animation time
    setTimeout(() => {
      setWarpSpeed(false)
      setIsLoading(false)
    }, 1500)
  }, [state.mapState?.nodes, sendMessage, setAgentState])

  const handleRewind = useCallback((eventIndex: number) => {
    setWarpSpeed(true)
    setIsZoomed(false)
    setZoomTarget(null)
    setTimeout(() => {
      setCurrentPosition(eventIndex)
      const event = state.explorationHistory?.[eventIndex]
      if (event?.mapSnapshot) {
        setAgentState((prev) => ({
          ...(prev ?? DEFAULT_ORACLE_STATE),
          mapState: event.mapSnapshot,
        }))
      }
      setWarpSpeed(false)
    }, 600)
  }, [state.explorationHistory, setAgentState])

  const handleFork = useCallback((answerIndex: number) => {
    const constraint = state.constraints?.[answerIndex]
    if (!constraint) return

    const newAnswer = prompt(`Current answer for ${constraint.dimension}: "${constraint.value}"\n\nEnter a new answer to explore an alternate path:`)
    if (!newAnswer?.trim()) return

    // Set fork fields in agent state
    setAgentState((prev) => ({
      ...(prev ?? DEFAULT_ORACLE_STATE),
      forkIndex: answerIndex,
      forkNewAnswer: newAnswer.trim(),
      forkOriginalAnswer: constraint.value,
      forkDimension: constraint.dimension,
    }))

    // Trigger fork_regenerator
    setWarpSpeed(true)
    sendMessage(`Fork at constraint ${answerIndex}: "${newAnswer.trim()}" (was: "${constraint.value}")`)

    setTimeout(() => setWarpSpeed(false), 2000)
  }, [state.constraints, sendMessage, setAgentState])

  const handleSwitchBranch = useCallback((branchId: string) => {
    setAgentState((prev) => ({ ...(prev ?? DEFAULT_ORACLE_STATE), activeBranchId: branchId }))
  }, [setAgentState])

  // ── SSR guard (show nothing until mounted in browser) ────────────
  if (!mounted) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#04040a" }} />
    )
  }

  // ── Entry screen ─────────────────────────────────────────────────

  if (phase === "entry" && !hasEnteredProblem) {
    return (
      <EntryScreen onSubmit={(p) => {
        setHasEnteredProblem(true)
        // Set problem in agent state and start interrogation
        setAgentState((prev) => ({
          ...(prev ?? DEFAULT_ORACLE_STATE),
          problem: p,
          phase: "interrogation" as const,
        }))
        // Send the problem as the first message — triggers interrogator
        sendMessage(p)
      }} />
    )
  }

  const zoomStyle = isZoomed && zoomTarget ? {
    transform: `scale(1.8) translate(${-(zoomTarget.x - (mapRef.current?.clientWidth ?? window.innerWidth) / 2) * 0.3}px, ${-(zoomTarget.y - (mapRef.current?.clientHeight ?? window.innerHeight) / 2) * 0.3}px)`,
    transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
  } : {
    transform: "scale(1) translate(0,0)",
    transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
  }

  return (
    <main style={{
      width: "100vw", height: "100vh",
      background: "var(--bg-void)",
      display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      <StarField warpSpeed={warpSpeed} />

      <TopBar phase={phase} problem={state.problem || ""} constraintCount={state.constraints?.length ?? 0} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, position: "relative", zIndex: 1 }}>

        {/* Left panel */}
        <div
          onClick={() => phase === "exploration" && panelCollapsed && setPanelCollapsed(false)}
          style={{ display: "flex", flexShrink: 0, position: "relative", zIndex: 2 }}
        >
          <InterrogationPanel
            state={state}
            currentQuestion={state.currentQuestion || ""}
            currentTargetDimension={state.currentTargetDimension || ""}
            isLastQuestion={state.isLastQuestion ?? false}
            questionCount={state.constraints?.length ?? 0}
            onAnswerSubmit={handleAnswerSubmit}
            onSendAnswer={(answer: string) => sendMessage(answer)}
            onConfirmIgnition={handleConfirmIgnition}
            collapsed={panelCollapsed}
            onExpandPanel={() => setPanelCollapsed(false)}
          />
        </div>

        {/* Center — Map with 3D zoom */}
        <div
          ref={mapRef}
          style={{ flex: 1, position: "relative", overflow: "hidden", background: "transparent" }}
        >
          {phase === "interrogation" && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
              background: "radial-gradient(ellipse at center, rgba(4,4,10,0.2) 0%, rgba(4,4,10,0.75) 100%)",
              transition: "opacity 600ms",
            }} />
          )}

          {constraintBlocks.map((block, i) => (
            <ConstraintBlock key={block.id} label={block.label} x={block.x} y={block.y} index={i} />
          ))}

          <div style={{
            position: "absolute", inset: 0,
            transformOrigin: zoomTarget ? `${zoomTarget.x}px ${zoomTarget.y}px` : "center center",
            ...zoomStyle,
          }}>
            <MapCanvas
              mapState={state.mapState ?? { nodes: [], edges: [], activeNodeId: null }}
              onNodeClick={handleNodeClick}
              isLoading={isLoading}
              fogLevel={fogLevel}
            />
          </div>
        </div>

        {/* Right — Sidebar */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <AdaptiveSidebar activeNode={activeNode} />
        </div>
      </div>

      {phase === "exploration" && state.explorationHistory?.length > 0 && (
        <div style={{ position: "relative", zIndex: 2 }}>
          <TimelineScrubber
            state={state}
            onRewind={handleRewind}
            onFork={handleFork}
            onSwitchBranch={handleSwitchBranch}
            currentPosition={currentPosition}
          />
        </div>
      )}
    </main>
  )
}