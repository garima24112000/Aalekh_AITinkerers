import { OracleState, MapState, DimensionCoverage } from "@/types/oracle"

const emptyMap: MapState = {
  nodes: [],
  edges: [],
  activeNodeId: null,
}

const fullMap: MapState = {
  activeNodeId: null,
  edges: [
    { sourceId: "root", targetId: "n1" },
    { sourceId: "root", targetId: "n2" },
    { sourceId: "root", targetId: "n3" },
    { sourceId: "root", targetId: "n4" },
    { sourceId: "root", targetId: "n5" },
    { sourceId: "n2", targetId: "n2a" },
    { sourceId: "n2", targetId: "n2b" },
    { sourceId: "n3", targetId: "n3a" },
    { sourceId: "n3", targetId: "n3b" },
    { sourceId: "n5", targetId: "n5a" },
    { sourceId: "n5", targetId: "n5b" },
    { sourceId: "n5", targetId: "n5c" },
  ],
  nodes: [
    { id: "root", label: "Freelance UX Business", depth: 0, parentId: null, conflictFlag: false, conflictReason: "", category: "strategic", x: 50, y: 48 },
    { id: "n1", label: "Positioning & Niche", depth: 1, parentId: "root", conflictFlag: false, conflictReason: "", category: "strategic", x: 50, y: 18 },
    { id: "n2", label: "Pricing Strategy", depth: 1, parentId: "root", conflictFlag: false, conflictReason: "", category: "financial", x: 78, y: 28 },
    { id: "n3", label: "Network Activation", depth: 1, parentId: "root", conflictFlag: false, conflictReason: "", category: "operational", x: 82, y: 62 },
    { id: "n4", label: "Portfolio & Credibility", depth: 1, parentId: "root", conflictFlag: false, conflictReason: "", category: "tactical", x: 50, y: 80 },
    { id: "n5", label: "Productized Services", depth: 1, parentId: "root", conflictFlag: true, conflictReason: "Productized services take 3–6 months to generate consistent revenue — conflicts with your 3-month runway.", category: "strategic", x: 20, y: 62 },
    { id: "n2a", label: "Day rate vs retainer", depth: 2, parentId: "n2", conflictFlag: false, conflictReason: "", category: "financial", x: 92, y: 18 },
    { id: "n2b", label: "Value-based pricing", depth: 2, parentId: "n2", conflictFlag: false, conflictReason: "", category: "financial", x: 95, y: 38 },
    { id: "n3a", label: "Reactivate top 20 contacts", depth: 2, parentId: "n3", conflictFlag: false, conflictReason: "", category: "tactical", x: 95, y: 58 },
    { id: "n3b", label: "LinkedIn availability post", depth: 2, parentId: "n3", conflictFlag: false, conflictReason: "", category: "tactical", x: 92, y: 74 },
    { id: "n5a", label: "UX audit package", depth: 2, parentId: "n5", conflictFlag: true, conflictReason: "Requires marketing runway you don't have yet.", category: "strategic", x: 8, y: 52 },
    { id: "n5b", label: "Sprint-based offering", depth: 2, parentId: "n5", conflictFlag: false, conflictReason: "", category: "operational", x: 5, y: 66 },
    { id: "n5c", label: "Workshop facilitation", depth: 2, parentId: "n5", conflictFlag: false, conflictReason: "", category: "tactical", x: 10, y: 78 },
  ],
}

const baseConstraints = [
  { id: "c1", dimension: "resources" as const, type: "anchor" as const, value: "3 months runway", answeredAt: new Date().toISOString(), timelineIndex: 0 },
  { id: "c2", dimension: "market" as const, type: "shaper" as const, value: "High-touch, low volume clients", answeredAt: new Date().toISOString(), timelineIndex: 1 },
  { id: "c3", dimension: "riskTolerance" as const, type: "eliminator" as const, value: "Stability over creativity", answeredAt: new Date().toISOString(), timelineIndex: 2 },
  { id: "c4", dimension: "founderContext" as const, type: "shaper" as const, value: "Warm network from 6 years in tech", answeredAt: new Date().toISOString(), timelineIndex: 3 },
  { id: "c5", dimension: "timeline" as const, type: "anchor" as const, value: "$8k/month target", answeredAt: new Date().toISOString(), timelineIndex: 4 },
]

export const mockInterrogationState: OracleState = {
  sessionId: "mock-session",
  phase: "interrogation",
  problem: "I want to go freelance as a UX designer and build a sustainable business.",
  constraints: baseConstraints.slice(0, 2),
  dimensionCoverage: { resources: true, timeline: false, riskTolerance: false, market: true, founderContext: false },
  currentQuestion: "",
  currentTargetDimension: "",
  isLastQuestion: false,
  mapState: emptyMap,
  explorationHistory: [],
  branches: [],
  activeBranchId: "main",
  forkIndex: -1,
  forkNewAnswer: "",
  forkOriginalAnswer: "",
  forkDimension: "",
  expandNodeId: "",
}

export const mockIgnitionState: OracleState = {
  ...mockInterrogationState,
  phase: "ignition",
  constraints: baseConstraints,
  dimensionCoverage: { resources: true, timeline: true, riskTolerance: true, market: true, founderContext: true },
}

export const mockExplorationState: OracleState = {
  ...mockIgnitionState,
  phase: "exploration",
  mapState: { ...fullMap, activeNodeId: "n3" },
  explorationHistory: [
    { index: 0, timestamp: new Date().toISOString(), type: "answer", nodeId: null, answer: "3 months runway", mapSnapshot: emptyMap },
    { index: 1, timestamp: new Date().toISOString(), type: "answer", nodeId: null, answer: "High-touch clients", mapSnapshot: emptyMap },
    { index: 2, timestamp: new Date().toISOString(), type: "answer", nodeId: null, answer: "Stability over creativity", mapSnapshot: emptyMap },
    { index: 3, timestamp: new Date().toISOString(), type: "answer", nodeId: null, answer: "Warm network", mapSnapshot: emptyMap },
    { index: 4, timestamp: new Date().toISOString(), type: "answer", nodeId: null, answer: "$8k/month", mapSnapshot: emptyMap },
    { index: 5, timestamp: new Date().toISOString(), type: "nodeClick", nodeId: "n3", answer: null, mapSnapshot: fullMap },
  ],
  expandNodeId: "",
}

export const mockForkState: OracleState = {
  ...mockExplorationState,
  branches: [{
    branchId: "branch-1",
    forkIndex: 2,
    label: "Fork at Q3",
    explorationHistory: [],
    mapSnapshot: { ...fullMap, nodes: fullMap.nodes.map(n => n.id === "n5" ? { ...n, conflictFlag: false } : n) },
  }],
  activeBranchId: "main",
  forkIndex: -1,
  forkNewAnswer: "",
  forkOriginalAnswer: "",
  forkDimension: "",
}
