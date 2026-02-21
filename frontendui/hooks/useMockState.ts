import { useState } from "react"
import { OracleState } from "@/types/oracle"
import { mockExplorationState } from "@/mock/mockState"

export function useMockState(initial?: OracleState) {
  const [state, setState] = useState<OracleState>(initial ?? mockExplorationState)
  return { state, setState }
}
