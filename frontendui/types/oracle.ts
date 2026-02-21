export type Phase = "entry" | "interrogation" | "ignition" | "exploration"

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
  category: NodeCategory
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

export interface Branch {
  branchId: string
  forkIndex: number
  label: string
  explorationHistory: HistoryEntry[]
  mapSnapshot: MapState
}

export interface OracleState {
  sessionId: string
  phase: Phase
  problem: string
  constraints: Constraint[]
  dimensionCoverage: Record<Dimension, boolean>
  mapState: MapState
  explorationHistory: HistoryEntry[]
  branches: Branch[]
  activeBranchId: string
}
