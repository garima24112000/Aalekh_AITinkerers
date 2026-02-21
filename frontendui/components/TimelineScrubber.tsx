import React, { useState } from "react";
import { OracleState, HistoryEntry } from "@/types/oracle";

interface PillData {
  index: number;
  type: "answer" | "nodeClick";
  label: string;
  tooltipText?: string;
  branchId: string;
}

interface TimelineScrubberProps {
  state: OracleState;
  onRewind: (eventIndex: number) => void;
  onFork: (answerIndex: number) => void;
  onSwitchBranch: (branchId: string) => void;
  currentPosition: number; // index in explorationHistory
}

export function TimelineScrubber({
  state,
  onRewind,
  onFork,
  onSwitchBranch,
  currentPosition,
}: TimelineScrubberProps) {
  const [hoveredPill, setHoveredPill] = useState<number | null>(null);

  // Build pill data for the main branch
  const mainBranchPills = buildPillsFromHistory(
    state.explorationHistory,
    "main"
  );

  // Build pill data for fork branch if it exists
  const forkBranch = state.branches[0]; // For now, only support first branch
  const forkBranchPills = forkBranch
    ? buildPillsFromHistory(forkBranch.explorationHistory, forkBranch.branchId)
    : [];

  const hasFork = forkBranchPills.length > 0;
  const isMainActive = state.activeBranchId === "main";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: hasFork ? "120px" : "80px",
        backgroundColor: "rgba(10, 10, 15, 0.95)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "20px 40px",
        transition: "height 300ms ease",
        zIndex: 1000,
      }}
    >
      {/* Main Track */}
      <Track
        pills={mainBranchPills}
        label="Origin"
        isActive={isMainActive}
        hoveredPill={hoveredPill}
        currentPosition={isMainActive ? currentPosition : -1}
        onPillClick={(index) => {
          if (!isMainActive) {
            onSwitchBranch("main");
          }
          onRewind(index);
        }}
        onPillHover={setHoveredPill}
        onFork={onFork}
        showForkButton={true}
      />

      {/* Fork Track */}
      {hasFork && forkBranch && (
        <div style={{ marginTop: "20px" }}>
          <Track
            pills={forkBranchPills}
            label="Fork"
            isActive={!isMainActive}
            hoveredPill={hoveredPill}
            currentPosition={!isMainActive ? currentPosition : -1}
            onPillClick={(index) => {
              if (isMainActive) {
                onSwitchBranch(forkBranch.branchId);
              }
              onRewind(index);
            }}
            onPillHover={setHoveredPill}
            onFork={() => {
              // Block multiple forks
              alert("Multiple forks coming soon.");
            }}
            showForkButton={false} // Only allow forking from main
          />
        </div>
      )}
    </div>
  );
}

interface TrackProps {
  pills: PillData[];
  label: string;
  isActive: boolean;
  hoveredPill: number | null;
  currentPosition: number;
  onPillClick: (index: number) => void;
  onPillHover: (index: number | null) => void;
  onFork: (answerIndex: number) => void;
  showForkButton: boolean;
}

function Track({
  pills,
  label,
  isActive,
  hoveredPill,
  currentPosition,
  onPillClick,
  onPillHover,
  onFork,
  showForkButton,
}: TrackProps) {
  const trackOpacity = isActive ? 1 : 0.4;

  return (
    <div style={{ position: "relative" }}>
      {/* Track labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: `rgba(255, 255, 255, ${trackOpacity * 0.5})`,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: `rgba(255, 255, 255, ${trackOpacity * 0.5})`,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Now
        </span>
      </div>

      {/* Track line */}
      <div
        style={{
          position: "relative",
          height: "1px",
          backgroundColor: `rgba(255, 255, 255, ${trackOpacity * 0.3})`,
          width: "100%",
        }}
      >
        {/* Pills */}
        {pills.map((pill, index) => {
          const position = pills.length === 1 ? 50 : (index / (pills.length - 1)) * 100;
          const isHovered = hoveredPill === pill.index;
          const isCurrent = pill.index === currentPosition;

          return (
            <Pill
              key={`${pill.branchId}-${pill.index}`}
              pill={pill}
              position={position}
              isHovered={isHovered}
              isCurrent={isCurrent}
              trackOpacity={trackOpacity}
              onHover={() => onPillHover(pill.index)}
              onLeave={() => onPillHover(null)}
              onClick={() => onPillClick(pill.index)}
              onFork={() => onFork(pill.index)}
              showForkButton={showForkButton && pill.type === "answer"}
            />
          );
        })}

        {/* Current position indicator */}
        {currentPosition >= 0 && isActive && pills.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: `${(currentPosition / Math.max(pills.length - 1, 1)) * 100}%`,
              top: "-4px",
              width: "2px",
              height: "9px",
              backgroundColor: "rgb(74, 158, 255)",
              transition: "left 350ms ease-out",
            }}
          />
        )}
      </div>
    </div>
  );
}

interface PillProps {
  pill: PillData;
  position: number; // 0-100 percentage
  isHovered: boolean;
  isCurrent: boolean;
  trackOpacity: number;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  onFork: () => void;
  showForkButton: boolean;
}

function Pill({
  pill,
  position,
  isHovered,
  isCurrent,
  trackOpacity,
  onHover,
  onLeave,
  onClick,
  onFork,
  showForkButton,
}: PillProps) {
  const isAnswer = pill.type === "answer";
  const pillColor = isAnswer ? "rgb(74, 158, 255)" : "rgb(156, 163, 175)";

  return (
    <div
      style={{
        position: "absolute",
        left: `${position}%`,
        top: "-10px",
        transform: `translateX(-50%) scale(${isHovered ? 1.15 : 1})`,
        transition: "transform 150ms ease",
        cursor: "pointer",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Pill circle */}
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: pillColor,
          opacity: trackOpacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          fontWeight: 600,
          color: "white",
          border: isCurrent ? "2px solid white" : "none",
        }}
      >
        {pill.label}
      </div>

      {/* Tooltip on hover */}
      {isHovered && pill.tooltipText && (
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 12px",
            backgroundColor: "rgba(20, 20, 30, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "white",
            whiteSpace: "nowrap",
            maxWidth: "300px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            pointerEvents: "none",
            zIndex: 1001,
          }}
        >
          {pill.tooltipText}
        </div>
      )}

      {/* Fork button */}
      {isHovered && showForkButton && (
        <div
          style={{
            position: "absolute",
            right: "-30px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: "rgba(74, 158, 255, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "12px",
            zIndex: 1002,
          }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onFork();
          }}
          title="Fork from this point"
        >
          ⑂
        </div>
      )}
    </div>
  );
}

// Helper function to build pill data from exploration history
function buildPillsFromHistory(
  history: HistoryEntry[],
  branchId: string
): PillData[] {
  return history.map((event) => {
    if (event.type === "answer") {
      return {
        index: event.index,
        type: "answer",
        label: `${event.index + 1}`,
        tooltipText: event.answer || `Question ${event.index + 1}`,
        branchId,
      };
    } else {
      return {
        index: event.index,
        type: "nodeClick",
        label: "○",
        tooltipText: event.nodeId ? `Clicked: ${event.nodeId}` : "Node click",
        branchId,
      };
    }
  });
}

export default TimelineScrubber;
