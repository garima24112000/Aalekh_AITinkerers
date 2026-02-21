import React, { useState, CSSProperties } from "react";
import { OracleNode as NodeType, NodeCategory } from "@/types/oracle";

interface OracleNodeProps {
  node: NodeType;
  pixelX: number;
  pixelY: number;
  isActive: boolean;
  isFoggy: boolean;
  onClick: (nodeId: string) => void;
}

export function OracleNodeComponent({
  node,
  pixelX,
  pixelY,
  isActive,
  isFoggy,
  onClick,
}: OracleNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isLeaf = node.depth >= 4;
  const isConflicted = node.conflictFlag === true;

  // Calculate node dimensions based on depth
  const getNodeSize = () => {
    if (node.depth === 0) return { width: 200, height: 70 };
    if (node.depth === 1) return { width: 170, height: 56 };
    return { width: 150, height: 50 };
  };

  const { width, height } = getNodeSize();

  // Calculate opacity based on state
  const calculateOpacity = () => {
    if (isFoggy) return 0.15;
    if (isConflicted) return 0.4;
    return 1;
  };

  // Calculate border styling
  const getBorderColor = () => {
    if (isActive) return "rgba(74, 158, 255, 0.8)"; // blue accent
    if (isConflicted) return "rgba(251, 191, 36, 0.6)"; // amber warning
    if (isHovered) return "rgba(255, 255, 255, 0.4)";
    if (node.depth === 0) return "rgba(255, 255, 255, 0.25)"; // center node brighter
    return "rgba(255, 255, 255, 0.15)";
  };

  const getBoxShadow = () => {
    if (isActive) {
      return "0 0 20px rgba(74, 158, 255, 0.4)";
    }
    if (node.depth === 0) {
      return "0 0 15px rgba(255, 255, 255, 0.1)";
    }
    return "none";
  };

  const nodeStyle: CSSProperties = {
    position: "absolute",
    left: `${pixelX - width / 2}px`,
    top: `${pixelY - height / 2}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: "rgba(20, 20, 30, 0.9)",
    border: `1px solid ${getBorderColor()}`,
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: isLeaf || isFoggy ? "default" : "pointer",
    transition: "all 0.2s ease",
    transform: isHovered && !isFoggy && !isLeaf ? "scale(1.03)" : "scale(1)",
    opacity: calculateOpacity(),
    filter: isFoggy ? "blur(4px)" : "blur(0)",
    boxShadow: getBoxShadow(),
    pointerEvents: isFoggy ? "none" : "auto",
    zIndex: isActive ? 100 : node.depth === 0 ? 50 : 10,
  };

  const labelStyle: CSSProperties = {
    fontSize: node.depth === 0 ? "15px" : "13px",
    fontWeight: node.depth === 0 ? 600 : 500,
    color: "white",
    textAlign: "center",
    padding: "0 12px",
    userSelect: "none",
  };

  const handleClick = () => {
    if (!isLeaf && !isFoggy) {
      onClick(node.id);
    }
  };

  return (
    <div
      style={nodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      title={isConflicted ? node.conflictReason : undefined}
    >
      <div style={labelStyle}>{node.label}</div>

      {/* Conflict warning icon */}
      {isConflicted && !isFoggy && (
        <div
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            fontSize: "14px",
          }}
        >
          ⚠
        </div>
      )}
    </div>
  );
}

export default OracleNodeComponent;
