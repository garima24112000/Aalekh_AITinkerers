"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { useCoAgent } from "@copilotkit/react-core";

export default function Home() {
  const { state } = useCoAgent({ name: "oracle_agent" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-xl font-bold">
            O
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ORACLE</h1>
            <p className="text-xs text-gray-400">AI-Powered Strategic Advisor</p>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left panel — Agent state display */}
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-indigo-400">
                Agent State
              </h2>

              {/* Phase */}
              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider text-gray-500">Phase</span>
                <p className="text-sm font-mono mt-1 text-gray-300">
                  {state?.phase || "waiting..."}
                </p>
              </div>

              {/* Constraints */}
              {state?.constraints && state.constraints.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    Constraints ({state.constraints.length})
                  </span>
                  <div className="mt-2 space-y-2">
                    {state.constraints.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="bg-gray-800/60 rounded-lg p-3 text-sm"
                      >
                        <span className="text-indigo-400 font-medium">
                          {c.dimension}
                        </span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="text-gray-300">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map nodes */}
              {state?.mapState?.nodes && state.mapState.nodes.length > 0 && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    Solution Map ({state.mapState.nodes.length} nodes)
                  </span>
                  <div className="mt-2 space-y-1">
                    {state.mapState.nodes.map((n: any) => (
                      <div
                        key={n.id}
                        className="flex items-center gap-2 text-sm py-1"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            n.isRoot ? "bg-indigo-500" : "bg-gray-600"
                          }`}
                        />
                        <span className="text-gray-300">{n.label}</span>
                        <span className="text-gray-600 text-xs font-mono">
                          [{n.id}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Branches */}
              {state?.branches && state.branches.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    Branches ({state.branches.length})
                  </span>
                  <div className="mt-2 space-y-1">
                    {state.branches.map((b: any, i: number) => (
                      <div
                        key={i}
                        className="bg-gray-800/60 rounded-lg p-2 text-sm text-gray-300"
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — Chat */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden h-[70vh]">
            <CopilotChat
              className="h-full"
              labels={{
                title: "AALEKH Advisor",
                initial: "Hi! I'm AALEKH, your strategic advisor. Tell me about the problem you're trying to solve and I'll help you map out your solution space.",
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
