export type Phase = "entry" | "interrogation" | "ignition" | "exploration" | "map_generation"

export type Dimension =
  | "resources"
  | "timeline"
  | "riskTolerance"
  | "market"
  | "founderContext"

export type ConstraintType = "eliminator" | "shaper" | "anchor"

export type NodeCategory = "financial" | "strategic" | "operational" | "tactical"

export interface Constraint {
  id: string
  dimension: Dimension
  type: ConstraintType
  value: string
  answeredAt: string
  timelineIndex: number
}

export interface OracleNode {
  id: string
  label: string
  depth: number
  parentId: string | null
  conflictFlag: boolean
  conflictReason: string
  category?: NodeCategory
  dimension?: string
  x: number
  y: number
}

export interface OracleEdge {
  sourceId: string
  targetId: string
}

export interface MapState {
  nodes: OracleNode[]
  edges: OracleEdge[]
  activeNodeId: string | null
}

export interface HistoryEntry {
  index: number
  timestamp: string
  type: "answer" | "nodeClick"
  nodeId: string | null
  answer: string | null
  mapSnapshot: MapState
}

// Alias matching backend naming
export type ExplorationEntry = HistoryEntry

export interface Branch {
  branchId: string
  forkIndex: number
  label: string
  explorationHistory: HistoryEntry[]
  mapSnapshot: MapState
}

export interface DimensionCoverage {
  resources: boolean
  timeline: boolean
  riskTolerance: boolean
  market: boolean
  founderContext: boolean
}

export interface OracleState {
  sessionId: string
  phase: Phase
  problem: string
  constraints: Constraint[]
  dimensionCoverage: DimensionCoverage

  // Interrogation — live from backend
  currentQuestion: string
  currentTargetDimension: string
  isLastQuestion: boolean

  // Map
  mapState: MapState

  // Exploration history + branching
  explorationHistory: HistoryEntry[]
  branches: Branch[]
  activeBranchId: string

  // Fork context (set before calling fork_regenerator)
  forkIndex: number
  forkNewAnswer: string
  forkOriginalAnswer: string
  forkDimension: string

  // Expansion context (set before calling expander)
  expandNodeId: string

  // CopilotKit message list
  messages?: any[]
}

/** Default empty state used before first backend sync */
export const DEFAULT_ORACLE_STATE: OracleState = {
  sessionId: "",
  phase: "entry",
  problem: "",
  constraints: [],
  dimensionCoverage: {
    resources: false,
    timeline: false,
    riskTolerance: false,
    market: false,
    founderContext: false,
  },
  currentQuestion: "",
  currentTargetDimension: "",
  isLastQuestion: false,
  mapState: { nodes: [], edges: [], activeNodeId: null },
  explorationHistory: [],
  branches: [],
  activeBranchId: "main",
  forkIndex: -1,
  forkNewAnswer: "",
  forkOriginalAnswer: "",
  forkDimension: "",
  expandNodeId: "",
  messages: [],
}
