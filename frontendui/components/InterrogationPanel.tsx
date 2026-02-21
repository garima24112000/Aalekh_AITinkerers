"use client"
import { useState, useEffect, useRef, KeyboardEvent } from "react"
import { OracleState } from "@/types/oracle"
import ConstraintSummaryCard from "./ConstraintSummaryCard"

const MOCK_QUESTIONS = [
  { q: "Are you leaving a full-time job to do this, or is this already your primary income?", dimension: "resources" as const },
  { q: "Do you want to work with many small clients, or go deep with a few larger ones?", dimension: "market" as const },
  { q: "What's more important right now — income stability or creative freedom?", dimension: "riskTolerance" as const },
  { q: "Do you have an existing network you can sell into, or are you starting cold?", dimension: "founderContext" as const },
  { q: "What's your target monthly income to feel financially safe?", dimension: "timeline" as const },
]

interface QAPair { question: string; answer: string }

interface Props {
  state: OracleState
  onAnswerSubmit: (answer: string, dimension: string, block: { label: string; x: number; y: number }) => void
  onConfirmIgnition: () => void
  collapsed: boolean
  onExpandPanel: () => void
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    const words = text.split(" ")
    if (words.length > 14) { setDisplayed(text); setDone(true); return }
    let i = 0
    const interval = setInterval(() => {
      if (i < words.length) {
        setDisplayed(prev => prev ? prev + " " + words[i] : words[i])
        i++
      } else {
        setDone(true)
        clearInterval(interval)
      }
    }, 55)
    return () => clearInterval(interval)
  }, [text])

  return (
    <span>
      {displayed}
      {!done && <span className="cursor-blink" style={{ color: "var(--accent-blue)", marginLeft: "1px" }}>█</span>}
    </span>
  )
}

export default function InterrogationPanel({ state, onAnswerSubmit, onConfirmIgnition, collapsed, onExpandPanel }: Props) {
  const [history, setHistory] = useState<QAPair[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [currentQ, setCurrentQ] = useState(MOCK_QUESTIONS[0].q)
  const [input, setInput] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  const [questionKey, setQuestionKey] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [currentQ])

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [history])

  const handleSubmit = () => {
    if (!input.trim() || showSummary) return
    const answer = input.trim()
    const dim = MOCK_QUESTIONS[qIndex]?.dimension ?? "resources"

    setHistory(prev => [...prev, { question: currentQ, answer }])
    setInput("")

    const shortLabel = answer.length > 22 ? answer.slice(0, 22) + "…" : answer
    onAnswerSubmit(answer, dim, {
      label: shortLabel,
      x: 32 + Math.random() * 36,
      y: 32 + Math.random() * 36,
    })

    const next = qIndex + 1
    if (next < MOCK_QUESTIONS.length) {
      setTimeout(() => {
        setCurrentQ(MOCK_QUESTIONS[next].q)
        setQIndex(next)
        setQuestionKey(k => k + 1)
      }, 350)
    } else {
      setTimeout(() => setShowSummary(true), 350)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (collapsed) {
    return (
      <div
        onClick={onExpandPanel}
        style={{
          width: "40px", height: "100%",
          background: "var(--bg-panel)",
          borderRight: "1px solid var(--border-dim)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          transition: "background 150ms",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
        onMouseLeave={e => e.currentTarget.style.background = "var(--bg-panel)"}
        title="Expand interrogation panel"
      >
        <span style={{ fontSize: "14px" }}>◈</span>
      </div>
    )
  }

  const coverageCount = Object.values(state.dimensionCoverage).filter(Boolean).length

  return (
    <div style={{
      width: "320px", minWidth: "320px", height: "100%",
      background: "var(--bg-panel)",
      borderRight: "1px solid var(--border-dim)",
      display: "flex", flexDirection: "column",
      animation: "slideInLeft 350ms cubic-bezier(0.16,1,0.3,1)",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", letterSpacing: "0.15em" }}>
            ORACLE // INTERROGATION
          </span>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
            {coverageCount}/5
          </span>
        </div>
        {/* Coverage bar */}
        <div style={{ display: "flex", gap: "3px" }}>
          {(["resources", "market", "riskTolerance", "founderContext", "timeline"] as const).map(dim => (
            <div key={dim} style={{
              flex: 1, height: "3px", borderRadius: "2px",
              background: state.dimensionCoverage[dim] ? "var(--accent-blue)" : "rgba(255,255,255,0.08)",
              transition: "background 400ms",
            }} />
          ))}
        </div>
      </div>

      {/* Q&A History */}
      <div ref={historyRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {history.map((pair, i) => {
          const age = history.length - 1 - i
          const opacity = Math.max(0.2, 0.8 - age * 0.15)
          return (
            <div key={i} style={{ opacity, transition: "opacity 300ms" }}>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", marginBottom: "5px", lineHeight: 1.5 }}>
                {pair.question}
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ width: "2px", alignSelf: "stretch", flexShrink: 0, background: "linear-gradient(to bottom, var(--accent-blue), transparent)", borderRadius: "2px", minHeight: "16px" }} />
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{pair.answer}</p>
              </div>
            </div>
          )
        })}

        {/* Current question */}
        {!showSummary && (
          <div key={questionKey} style={{ animation: "fadeIn 300ms ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-amber)", animation: "pulseGlow 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--accent-amber)", letterSpacing: "0.1em" }}>
                Q{qIndex + 1} OF {MOCK_QUESTIONS.length}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.7 }}>
              <TypewriterText key={questionKey} text={currentQ} />
            </p>
          </div>
        )}

        {/* Summary card */}
        {showSummary && (
          <ConstraintSummaryCard
            constraints={state.constraints.length >= 5 ? state.constraints : [
              { id: "c1", dimension: "resources", type: "anchor", value: "Leaving full-time job · 3 months runway", answeredAt: "", timelineIndex: 0 },
              { id: "c2", dimension: "market", type: "shaper", value: "2–3 high-touch clients preferred", answeredAt: "", timelineIndex: 1 },
              { id: "c3", dimension: "riskTolerance", type: "eliminator", value: "Income stability over creative risk", answeredAt: "", timelineIndex: 2 },
              { id: "c4", dimension: "founderContext", type: "shaper", value: "Warm network from 6 years in tech", answeredAt: "", timelineIndex: 3 },
              { id: "c5", dimension: "timeline", type: "anchor", value: "$8,000/month target", answeredAt: "", timelineIndex: 4 },
            ]}
            problem={state.problem}
            onConfirm={onConfirmIgnition}
          />
        )}
      </div>

      {/* Input */}
      {!showSummary && (
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border-dim)", flexShrink: 0 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-mid)", borderRadius: "2px", padding: "10px 12px", transition: "border-color 200ms" }}
            onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(61,142,240,0.4)"}
            onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border-mid)"}
          >
            <span style={{ color: "var(--accent-blue)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>›</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your answer…"
              style={{ flex: 1, background: "transparent", border: "none", fontSize: "12px", color: "var(--text-primary)" }}
            />
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>↵</span>
          </div>
        </div>
      )}
    </div>
  )
}