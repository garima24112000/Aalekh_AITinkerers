"use client"
import { useState, useEffect, useRef, KeyboardEvent } from "react"
import { OracleState, Constraint } from "@/types/oracle"
import ConstraintSummaryCard from "./ConstraintSummaryCard"

const MOCK_QUESTIONS = [
  { q: "Are you leaving a full-time job to do this, or is this already your primary income?", dimension: "resources" as const },
  { q: "Do you want to work with many small clients or go deep with a few larger ones?", dimension: "market" as const },
  { q: "What's more important to you right now — income stability or creative freedom?", dimension: "riskTolerance" as const },
  { q: "Do you have an existing network you can sell to, or are you starting cold?", dimension: "founderContext" as const },
  { q: "What's your target monthly income to feel safe — roughly?", dimension: "timeline" as const },
]

interface QAPair {
  question: string
  answer: string
}

interface Props {
  state: OracleState
  onAnswerSubmit: (answer: string, dimension: string, constraintBlock: { label: string; x: number; y: number }) => void
  onConfirmIgnition: () => void
  collapsed: boolean
}

export default function InterrogationPanel({ state, onAnswerSubmit, onConfirmIgnition, collapsed }: Props) {
  const [history, setHistory] = useState<QAPair[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(MOCK_QUESTIONS[0].q)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [input, setInput] = useState("")
  const [displayedWords, setDisplayedWords] = useState<string[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Typewriter effect
  useEffect(() => {
    const words = currentQuestion.split(" ")
    if (words.length > 12) {
      setDisplayedWords(words)
      return
    }
    setDisplayedWords([])
    let i = 0
    const interval = setInterval(() => {
      if (i < words.length) {
        setDisplayedWords(prev => [...prev, words[i]])
        i++
      } else {
        clearInterval(interval)
      }
    }, 60)
    return () => clearInterval(interval)
  }, [currentQuestion])

  useEffect(() => {
    if (state.phase === "ignition") setShowSummary(true)
  }, [state.phase])

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentQuestion])

  const handleSubmit = () => {
    if (!input.trim()) return
    const answer = input.trim()
    const dim = MOCK_QUESTIONS[questionIndex]?.dimension ?? "resources"

    setHistory(prev => [...prev, { question: currentQuestion, answer }])
    setInput("")

    const block = {
      label: answer.length > 20 ? answer.slice(0, 20) + "…" : answer,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
    }
    onAnswerSubmit(answer, dim, block)

    const next = questionIndex + 1
    if (next < MOCK_QUESTIONS.length) {
      setTimeout(() => {
        setCurrentQuestion(MOCK_QUESTIONS[next].q)
        setQuestionIndex(next)
      }, 400)
    } else {
      setTimeout(() => setShowSummary(true), 400)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (collapsed) {
    return (
      <div style={{
        width: "48px", height: "100%",
        background: "rgba(255,255,255,0.03)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: "18px",
      }}>
        💬
      </div>
    )
  }

  return (
    <div style={{
      width: "30%", height: "100%",
      background: "rgba(255,255,255,0.02)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      transition: "width 400ms ease-in-out",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
          Oracle — Interrogation
        </p>
      </div>

      {/* Q&A History */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {history.map((pair, i) => (
          <div key={i} style={{ opacity: Math.max(0.25, 0.7 - (history.length - 1 - i) * 0.15) }}>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", lineHeight: 1.5 }}>
              {pair.question}
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", paddingLeft: "10px", borderLeft: "2px solid rgba(74,158,255,0.4)" }}>
              {pair.answer}
            </p>
          </div>
        ))}

        {/* Current question */}
        {!showSummary && (
          <div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>
              {displayedWords.join(" ")}
              {displayedWords.length < currentQuestion.split(" ").length && (
                <span style={{ opacity: 0.4 }}>▌</span>
              )}
            </p>
          </div>
        )}

        {/* Constraint summary card */}
        {showSummary && (
          <ConstraintSummaryCard
            constraints={state.constraints.length > 0 ? state.constraints : [
              { id: "c1", dimension: "resources", type: "anchor", value: "3 months runway", answeredAt: "", timelineIndex: 0 },
              { id: "c2", dimension: "market", type: "shaper", value: "High-touch clients", answeredAt: "", timelineIndex: 1 },
              { id: "c3", dimension: "riskTolerance", type: "eliminator", value: "Stability over creativity", answeredAt: "", timelineIndex: 2 },
              { id: "c4", dimension: "founderContext", type: "shaper", value: "Warm network", answeredAt: "", timelineIndex: 3 },
              { id: "c5", dimension: "timeline", type: "anchor", value: "$8k/month target", answeredAt: "", timelineIndex: 4 },
            ]}
            problem={state.problem}
            onConfirm={onConfirmIgnition}
          />
        )}
      </div>

      {/* Input */}
      {!showSummary && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer…"
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
              padding: "10px 12px", color: "white", fontSize: "13px",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "6px" }}>
            ↵ Enter to answer
          </p>
        </div>
      )}
    </div>
  )
}
