import React, { useRef } from "react";
import { MapState } from "@/types/oracle";
import { useCanvasLayout } from "@/hooks/useCanvasLayout";
import OracleNodeComponent from "./OracleNodeComponent";

interface MapCanvasProps {
  mapState: MapState;
  onNodeClick: (nodeId: string) => void;
  isLoading?: boolean;
  fogLevel?: number; // 0-5, 0 = fully foggy, 5 = clear
}

export function MapCanvas({ mapState, onNodeClick, isLoading, fogLevel = 5 }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodePositions, containerWidth, containerHeight } = useCanvasLayout(
    containerRef,
    mapState.nodes
  );

  // Determine which nodes are foggy based on fog level
  const isNodeFoggy = (nodeId: string) => {
    if (fogLevel === 5) return false; // Full clarity
    if (fogLevel === 0) return true; // Fully foggy

    // For partial fog (levels 1-4), some nodes are clearer than others
    const node = mapState.nodes.find((n) => n.id === nodeId);
    if (!node) return true;

    // Depth 0 clears earlier
    if (node.depth === 0 && fogLevel >= 1) return false;
    if (node.depth === 1 && fogLevel >= 3) return false;
    if (node.depth >= 2 && fogLevel >= 4) return false;

    return true;
  };

  return (
    <div
      ref={containerRef}
      data-fog-level={fogLevel}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "transparent",
        transition: "background-color 600ms ease-out",
        overflow: "hidden",
      }}
    >
      {/* SVG Layer for Edges */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {mapState.edges.map((edge, idx) => {
          const sourcePos = nodePositions.get(edge.sourceId);
          const targetPos = nodePositions.get(edge.targetId);

          if (!sourcePos || !targetPos) return null;

          // Check if either node is conflicted
          const sourceNode = mapState.nodes.find((n) => n.id === edge.sourceId);
          const targetNode = mapState.nodes.find((n) => n.id === edge.targetId);
          const isConflicted =
            sourceNode?.conflictFlag || targetNode?.conflictFlag;

          const strokeColor = isConflicted
            ? "rgba(251, 191, 36, 0.15)"
            : "rgba(255, 255, 255, 0.2)";

          return (
            <line
              key={`${edge.sourceId}-${edge.targetId}-${idx}`}
              x1={sourcePos.pixelX}
              y1={sourcePos.pixelY}
              x2={targetPos.pixelX}
              y2={targetPos.pixelY}
              stroke={strokeColor}
              strokeWidth="1"
              style={{
                transition: "all 400ms ease-out",
              }}
            />
          );
        })}
      </svg>

      {/* Node Layer */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
        }}
      >
        {mapState.nodes.map((node) => {
          const position = nodePositions.get(node.id);
          if (!position) return null;

          return (
            <OracleNodeComponent
              key={node.id}
              node={node}
              pixelX={position.pixelX}
              pixelY={position.pixelY}
              isActive={node.id === mapState.activeNodeId}
              isFoggy={isNodeFoggy(node.id)}
              onClick={onNodeClick}
            />
          );
        })}

        {/* Loading indicator for active node */}
        {isLoading && mapState.activeNodeId && (
          <LoadingDots
            nodeId={mapState.activeNodeId}
            nodePositions={nodePositions}
          />
        )}
      </div>
    </div>
  );
}

// Loading dots that appear below active node when expanding
function LoadingDots({
  nodeId,
  nodePositions,
}: {
  nodeId: string;
  nodePositions: Map<string, { id: string; pixelX: number; pixelY: number }>;
}) {
  const position = nodePositions.get(nodeId);
  if (!position) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${position.pixelX}px`,
        top: `${position.pixelY + 45}px`,
        transform: "translateX(-50%)",
        display: "flex",
        gap: "4px",
        zIndex: 200,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "rgba(74, 158, 255, 0.6)",
            animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default MapCanvas;
