import { useEffect, useState, RefObject } from "react";
import { OracleNode } from "@/types/oracle";

export interface NodePosition {
  id: string;
  pixelX: number;
  pixelY: number;
}

export interface CanvasLayout {
  nodePositions: Map<string, NodePosition>;
  containerWidth: number;
  containerHeight: number;
}

/**
 * Converts x/y percentage positions to pixel positions
 * Watches for container resize with ResizeObserver
 */
export function useCanvasLayout(
  containerRef: RefObject<HTMLDivElement | null>,
  nodes: OracleNode[]
): CanvasLayout {
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Setup ResizeObserver to track container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setContainerWidth(rect.width);
      setContainerHeight(rect.height);
    };

    // Initial measurement
    updateDimensions();

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Convert percentage positions to pixels
  const nodePositions = new Map<string, NodePosition>();

  for (const node of nodes) {
    const pixelX = (node.x / 100) * containerWidth;
    const pixelY = (node.y / 100) * containerHeight;

    nodePositions.set(node.id, {
      id: node.id,
      pixelX,
      pixelY,
    });
  }

  return {
    nodePositions,
    containerWidth,
    containerHeight,
  };
}
