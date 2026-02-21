# ORACLE — Phase 2 Design Document
## Frontend + Experience
### Team: Person 3 (Interrogation Panel + Ignition) + Person 4 (Map Canvas + Timeline Scrubber)

---

## 1. What Phase 2 Is Responsible For

Phase 2 is everything the judge sees, touches, and feels. It has no Claude calls, no Redis reads, no LangGraph logic. Its job is to take the state object that Phase 1 produces and render it into an experience that feels cinematic, spatial, and unlike anything in consumer software today.

Phase 2 owns:
- The three-panel layout (interrogation left, map center, sidebar right)
- The interrogation chat UI and answer submission
- The fog-to-clarity transition during interrogation
- The ignition moment — the single most important animation in the app
- The node graph canvas with all visual states
- The adaptive sidebar that changes based on active node
- The timeline scrubber at the bottom
- The rewind mechanic
- The fork mechanic and two-track display

Phase 2 does not own:
- Any Claude API calls
- Any Redis operations
- Any LangGraph logic
- What the nodes say or how they are positioned (Claude decides that)

---

## 2. The Core Design Principle

Every visual decision in Phase 2 should answer one question: **does this make Claude's reasoning feel visible and touchable?**

The map is not a dashboard. The scrubber is not a history log. The constraint blocks are not form fields. Each of these elements should feel like the user is physically handling the AI's thinking — picking it up, turning it over, rewinding it, forking it.

If a design decision makes ORACLE look like a regular SaaS tool, it is the wrong decision.

---

## 3. Technology Decisions

### 3.1 React + Next.js

**Why:** CopilotKit's frontend hooks (`useCoAgent`, `useCopilotAction`) are React-native. There is no meaningful alternative if we want CopilotKit's state sync. Next.js is already running for the CopilotKit runtime API route in Phase 1 — Phase 2 lives in the same repo.

**Component architecture decision:** We use React state (`useState`, `useReducer`) for local UI state (hover states, panel open/closed, active tooltip). We use `useCoAgent` for all application state (constraints, mapState, explorationHistory, phase). We never duplicate application state into local React state — if it comes from `useCoAgent`, it lives only there.

---

### 3.2 CSS for Layout and Animation

**Why not Framer Motion:** Framer Motion is excellent but adds bundle weight and an API to learn under time pressure. The animations we need — opacity transitions, blur transitions, slide-in panels — are achievable with CSS transitions and `keyframes`. We use Framer Motion only for the ignition moment if time permits, because that single animation justifies the dependency.

**Why not Tailwind:** Tailwind is fast for layout but awkward for the dynamic, state-driven styling we need (nodes changing opacity based on conflictFlag, blur levels changing based on constraint count). Inline styles with CSS custom properties are cleaner for this use case. Use Tailwind for structural layout (flex, grid, padding, margin) and inline styles for dynamic visual states.

**CSS architecture decision:** Every dynamic visual state maps to a single CSS variable or class toggle. Examples:
- Node opacity: driven by `--node-opacity` CSS variable set inline
- Canvas fog level: driven by a `data-fog-level="0|1|2|3|4|5"` attribute on the canvas container
- Phase transitions: driven by `data-phase="entry|interrogation|ignition|exploration"` on the root container

This keeps the rendering logic in CSS where it belongs and keeps the React components clean.

---

### 3.3 SVG for Edges

**Why SVG and not a canvas library:** We are rendering nodes as absolutely positioned divs, not canvas elements. Drawing edges between them requires SVG lines that sit in a layer behind the divs. A full canvas library (React Flow, D3 force graph) would require us to surrender control of node rendering to the library — we cannot do that because our nodes need to be React components with hover states, click handlers, and dynamic CSS. SVG lines are 20 lines of code. React Flow is a new API to learn under pressure.

**Edge rendering approach:** A single full-size SVG element covers the canvas, z-index below the node layer. Lines are drawn between node center coordinates. Node positions are known from the `x, y` percentages in state, converted to pixel coordinates at render time using the canvas container's `getBoundingClientRect`.

---

### 3.4 CopilotKit Frontend Hooks

**`useCoAgent({ name: "oracle_agent" })`**
The primary hook. Returns `{ state, setState }`. `state` is the full OracleState object. Both Person 3 and Person 4 call this hook in their respective components. React's rendering handles keeping them in sync — any change to state in one component re-renders components that read the same state.

**`useCopilotAction`**
Used by Person 3 for the `ConfirmConstraints` action. When Phase 1 triggers the confirmation pause, this hook's render function fires and displays the constraint summary card. The `handler` function resumes the agent when the user confirms.

**`useCoAgentStateRender`**
Used by Person 4 to show a loading state in the map canvas while `map_generator` is running. Renders a subtle "thinking" animation over the canvas during the 5–15 second generation window.

---

## 4. The Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                          ORACLE                                  │
├───────────────┬─────────────────────────────────┬───────────────┤
│               │                                 │               │
│               │                                 │               │
│ INTERROGATION │         MAP CANVAS              │   ADAPTIVE    │
│    PANEL      │                                 │   SIDEBAR     │
│   (30% width) │         (55% width)             │  (15% width)  │
│               │                                 │               │
│               │                                 │               │
│               │                                 │               │
├───────────────┴─────────────────────────────────┴───────────────┤
│                     TIMELINE SCRUBBER                            │
│                        (100% width, 80px height)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Layout behavior by phase:**

During `entry`: Only the center panel is visible. Single input, full focus.

During `interrogation`: Left panel slides in from the left. Map canvas is visible but foggy. Sidebar is hidden. Scrubber is hidden.

During `ignition`: Left panel shows the constraint summary card. Map canvas snaps to clarity. Scrubber slides up from the bottom.

During `exploration`: Left panel slides away to a collapsed drawer (accessible via a tab on the left edge). Sidebar appears on the right when a node is active. Scrubber is fully visible.

**Why these proportions:** 30/55/15 gives the map canvas dominance while leaving enough room for the interrogation panel to feel like a real conversation, not a cramped sidebar. The adaptive sidebar at 15% is intentionally narrow — it is contextual, not primary.

---

## 5. Person 3: Interrogation Panel + Ignition Moment

### 5.1 The Entry Screen

A single centered input on a dark background. The ORACLE wordmark above it. Placeholder text: "Describe the problem you're trying to solve." No other UI elements. No nav, no footer, no options.

When the user submits, the screen transitions: the input slides to the top of the left panel, the map canvas fades in (foggy), and the first question from Phase 1 appears.

**Design decision:** Do not animate the entry → interrogation transition with a complex sequence. A 300ms crossfade is enough. The constraint blocks and fog are what make this feel alive — spend animation budget there.

---

### 5.2 The Interrogation Chat UI

The left panel contains:
- A scrollable history of previous Q&A pairs (muted, receding into the past)
- The current question — full brightness, larger type
- A text input at the bottom

**Visual treatment of question history:** Previous questions and answers stack above the current question. As new questions arrive, older ones shrink slightly and reduce opacity. The most recent exchange is always most prominent. This creates a sense of temporal depth — the conversation has a past that is still visible but no longer active.

**The current question:** Renders with a subtle typewriter effect. Not letter-by-letter (too slow) — word-by-word at 60ms intervals. If the question is longer than 12 words, skip the animation entirely and render immediately. Animation should feel alive, not like a loading state.

**Answer submission:**
- User types in the input field at the bottom
- Submit on Enter key (no button — keyboard first)
- On submit: input clears, answer appears in the history above, constraint block animates onto the canvas, new question arrives after a 400ms pause

**Hotkey affordance:** A subtle hint below the input: `↵ to answer · Esc to rephrase`. No other keyboard UI needed.

---

### 5.3 Constraint Blocks Appearing on Canvas

This is the visual feedback that connects the interrogation panel to the map canvas. Every time the user answers a question, a constraint block should materialize visibly on the canvas.

**What a constraint block looks like:** A small pill/chip floating in the canvas background. Dark border, slightly lighter background than the canvas. Label is the constraint value in short form ("Runway: 3 months", "Model: High-touch"). Font is small, monospace.

**Where they appear:** In the foggy region of the canvas, clustered loosely near the center but with slight random offset per block. They do not have fixed positions — they float in the background layer, behind where the nodes will eventually appear.

**Animation:** Each block fades in at 0% opacity from a position 20px below its final position, rises and fades to full opacity over 400ms. Subtle. Not distracting from the question in the left panel.

**Why this matters:** The constraint blocks give the user physical evidence that their answers are accumulating into something. The canvas is being built. The map is being assembled. Without this feedback, the interrogation feels like a form. With it, it feels like construction.

---

### 5.4 The Fog-to-Clarity System

The canvas fog state is the progress indicator for the interrogation. It is not a percentage bar. It is the canvas itself becoming more defined as dimensions are covered.

**Implementation:** A `data-fog-level` attribute on the canvas container, set to 0–5 based on how many dimensions are covered (0 = all foggy, 5 = fully clear). CSS transitions handle the visual change.

At fog level 0: Canvas background is near-black. Node shapes are barely visible ghost outlines at 8% opacity, heavily blurred.

At fog level 1–4: Progressively more of the canvas reveals. Some node areas sharpen while others remain foggy. The fog doesn't lift uniformly — certain regions of the canvas clarify first based on which dimensions have been covered.

At fog level 5 (ignition): All blur disappears, all nodes snap to their base opacity in a single transition.

**Why non-uniform fog:** If the fog lifts uniformly, it just looks like a loading bar in disguise. If certain regions clarify based on which constraints have landed — the financial section clarifies when the runway constraint is answered, the market section clarifies when the market dimension is covered — the fog feels intelligent. It reinforces that Claude is actively structuring the space around the user's answers.

**How to implement non-uniform fog:** Each node has a `dimension` property (set by Phase 1 in the node JSON) that tags it to one of the 5 dimensions. When a dimension is covered, all nodes tagged to that dimension transition from blur(4px) opacity-15 to blur(1px) opacity-40. At ignition, everything transitions to full clarity.

---

### 5.5 The Ignition Moment

This is the most important 3 seconds in the entire application. It is the moment the interrogation ends and the solution space reveals itself. It needs to feel earned and cinematic.

**Sequence:**

**Step 1 — Constraint summary card (0ms):**
The `ConfirmConstraints` CopilotKit action fires. A card slides up from the bottom of the left panel (or overlays the input area). It reads:

> "Here is what I understood:
> You are a UX designer with 3 months runway, leaving full-time work. You want 2–3 high-value clients, stability over creative risk, and have a warm network to activate. Your target is $8k/month.
>
> [Confirm] [Edit]"

The Confirm and Edit buttons are the only UI elements visible. Everything else dims.

**Step 2 — User confirms (variable):**
User reads, hits Confirm. The card collapses.

**Step 3 — The reveal (600ms):**
This is a single CSS transition. All nodes simultaneously transition from their fog state (blur + low opacity) to full clarity. The transition eases out — starts fast, slows at the end. The constraint blocks in the background fade out as the nodes sharpen over them.

**Step 4 — Scrubber appears (800ms after confirm):**
The timeline scrubber slides up from below the canvas with a 300ms ease-in. The 5 answer pills are already populated.

**Step 5 — Left panel slides away (1000ms after confirm):**
The interrogation panel slides left and collapses to a thin tab. The canvas expands to fill the space. The map breathes.

**What makes this feel earned:** The fog-to-clarity is satisfying because the user caused it. Five answers built up to this moment. The constraint blocks disappearing as the nodes appear creates a visual metaphor — the inputs transformed into the output. The scrubber appearing signals that something new is possible. The panel sliding away says: the conversation is over, now explore.

**Edit path:** If the user clicks Edit instead of Confirm, the constraint summary card expands to show each constraint as an editable line. The user can change any value. On reconfirm, Phase 1 regenerates the map. This is a stretch goal — only build it if the main path is rock solid first.

---

## 6. Person 4: Map Canvas + Timeline Scrubber

### 6.1 Node Rendering

Nodes are absolutely positioned div elements inside a relative-positioned canvas container. The canvas container is 100% of the center panel. Each node's position is calculated from the `x, y` percentages in state:

```
pixelX = (node.x / 100) * containerWidth
pixelY = (node.y / 100) * containerHeight
```

The div is then positioned with `left: pixelX - nodeWidth/2` and `top: pixelY - nodeHeight/2` to center it on its coordinate.

**Node visual anatomy:**
- Outer shell: dark rounded rectangle, subtle border (1px solid, 15% white opacity)
- Label: 13px, medium weight, white, centered
- Depth-0 (center): larger, brighter border, slightly glowing
- Depth-1: standard size
- Depth-2+: slightly smaller, slightly more muted border

**Node states and their visual treatment:**

`default` — standard styling as above

`hover` — border brightens to 40% white opacity, slight scale(1.03) transform, cursor pointer

`active` (clicked/expanded) — border color shifts to a highlight color (not white — use a blue or amber accent). Subtle outer glow using box-shadow.

`conflicted` — opacity 40%, border color shifts to a warning amber. Small ⚠ icon in the top-right corner of the node. On hover, a tooltip appears below with the `conflictReason` string from state.

`fog` — blur(4px), opacity 10–15% depending on fog level. Not interactive in this state.

**Why absolutely positioned divs and not a canvas library:**
We need full control over node rendering. Each node needs hover states, click handlers, dynamic CSS, and tooltip overlays. Canvas libraries like React Flow render nodes in their own way and fighting their abstractions costs more time than building from scratch. Absolutely positioned divs are simple, predictable, and give us complete control.

---

### 6.2 Edge Rendering

A single full-size SVG sits as a sibling to the node layer, positioned absolute, same dimensions as the canvas container, z-index below the nodes.

Each edge in `mapState.edges` is rendered as an SVG line between the center coordinates of its source and target nodes. Line styling: 1px stroke, 20% white opacity. No arrows. Straight lines only — no curves (curves require control points, straight lines require just two coordinates).

On node expansion, new edges animate in with a stroke-dashoffset animation — the line draws itself from parent to child over 400ms. This makes the expansion feel like the map is growing organically.

**Conflict edges:** If either node on an edge has `conflictFlag: true`, the edge renders at 10% opacity in amber instead of white. Subtle — it should not dominate visually.

---

### 6.3 Node Click and Expansion

When a node is clicked:
1. The node transitions to its `active` visual state immediately (no wait for API)
2. A loading indicator appears — three small dots pulse below the active node
3. Person 4 calls `clickNode(nodeId)` via the Phase 1 action
4. Phase 1 returns updated state with new child nodes
5. Child nodes fade in around the parent, connected by the drawing-edge animation
6. The loading indicator disappears

**Positioning child nodes:** Phase 1's expander node returns x/y positions for children. Trust these positions. Do not recalculate them in the frontend.

**What if the user clicks multiple nodes quickly:** Queue the clicks. Process them sequentially. Do not fire multiple `clickNode` calls simultaneously — the state updates will collide.

**Depth limit:** Nodes at depth 4 or beyond cannot be expanded. They receive a visual treatment indicating they are leaf nodes (slightly rounded corners, no hover cursor change to pointer).

---

### 6.4 Adaptive Sidebar

The right sidebar (15% width) appears when a node is `active`. It is completely hidden when no node is active.

**What the sidebar contains:**
The sidebar content is not fully dynamic from Claude — that would require another Claude call per node click, which is too slow. Instead, we use a classification approach: Phase 1 tags each node with a `category` property (e.g. "financial", "strategic", "operational", "tactical"). The sidebar renders a pre-built template for each category.

**Category templates:**

`financial` category → shows a simple range slider labeled "Risk Tolerance" and a toggle for "Include investor scenarios"

`strategic` category → shows a dropdown for "Time horizon" (3mo / 6mo / 1yr / 3yr) and a toggle for "Include competitive analysis"

`operational` category → shows a range slider for "Complexity" and a dropdown for "Team size assumption"

`tactical` category → shows a checklist of 3–4 related action items (generated by the expander node and stored in the node's metadata)

**Why pre-built templates and not fully dynamic sidebar:**
A fully dynamic sidebar requires a Claude call per node click to generate relevant controls. That adds 2–3 seconds of latency to every click. Pre-built templates keyed on category render instantly and still feel adaptive to the user — the sidebar visibly changes when they move between nodes of different categories.

**Sidebar animation:** Slides in from the right over 250ms when a node is activated. Slides out over 200ms when no node is active. Content cross-fades between templates when the active node changes category.

---

### 6.5 The Timeline Scrubber

The scrubber is a horizontal track at the bottom of the screen, 80px tall. It is hidden during interrogation and slides up after ignition.

**Anatomy of the scrubber:**

Left label: "Origin" in small muted text

Right label: "Now" in small muted text

Track: a thin horizontal line running the full width, 1px, 30% white opacity

Pills: circular or pill-shaped markers positioned along the track

**Two pill types:**

`answer pills` (blue) — represent interrogation answers. Labeled with a number (1–5). On hover, a tooltip shows the question and answer text.

`exploration pills` (white/grey) — represent node clicks during exploration. On hover, a tooltip shows the node label that was clicked.

**Pill positioning:** Pills are evenly distributed along the track based on their `timelineIndex` in state. If there are 5 answer pills and 3 exploration pills, all 8 are distributed proportionally across the track width.

**Hover interaction:** On pill hover, the pill scales up slightly and the fork button appears — a small branching icon to the right of the pill. Cursor is pointer.

---

### 6.6 The Rewind Mechanic

Clicking any pill rewinds the map to the state it was in at that moment.

**What happens visually:**
1. The active node deselects
2. The map canvas fades to 40% opacity over 150ms
3. The nodes transition to the snapshot positions and states (some child nodes that were expanded after this point disappear)
4. The map fades back to full opacity over 200ms

The total rewind animation is 350ms. It should feel like a fast video scrub, not a slow dissolve.

**What "rewind" actually does technically:**
```
setState({ mapState: explorationHistory[pillIndex].mapSnapshot })
```
That is the entire mechanic. All visual complexity is driven by React re-rendering the nodes in their snapshot positions with their snapshot states. CSS transitions handle the smooth appearance.

**The current position indicator:** A small vertical line on the track indicates "now" — the most recent event. When the user rewinds, this indicator moves left. When they explore forward from a rewound state, it moves right again.

---

### 6.7 The Fork Mechanic

Forking is the most complex interaction in the scrubber. It creates a parallel branch from a past decision point.

**How the user triggers a fork:**
1. User hovers over any answer pill (exploration pills cannot be forked — only answer pills)
2. The fork icon appears
3. User clicks the fork icon
4. The pill highlights, the interrogation panel slides back in from the left
5. The original question at that index re-displays in the interrogation panel
6. The user types a different answer and submits

**What happens after the user submits the fork answer:**
1. Phase 1's `forkAt` action fires
2. Phase 1 regenerates the map with the new constraint set
3. A second track appears on the scrubber below the original track
4. The new branch track is blue; the original track greys out
5. The map updates to show the fork branch's map

**Two-track display:**
The scrubber grows to accommodate two tracks. Original track (grey) on top, fork track (blue) below. Both tracks show their respective pills. The currently active track is slightly brighter.

Clicking a pill on the grey track: switches `activeBranchId` to "main", map transitions to the original branch's current state. Clicking a pill on the blue track: switches `activeBranchId` to the fork branch, map transitions to the fork branch's state.

**The map transition between branches:** Same as the rewind animation — 150ms fade to 40%, state update, 200ms fade back to full. Fast, clean, unmistakable.

**Scope limit:** Only one fork is supported in the hackathon build. If the user tries to fork again from the fork branch, the UI shows a tooltip: "Multiple forks coming soon." Do not break — just block gracefully.

---

## 7. Mocking Strategy for Hours 1–3

Phase 2 cannot wait for Phase 1 to be ready. Use this mocked state for the first 3 hours.

**Mocked state object:**
Hardcode a complete OracleState for Priya's example — all 5 constraints filled in, a full node tree of 14 nodes with realistic labels and positions, 8 explorationHistory entries, one branch. This mock covers every UI state.

**How to use the mock:**
Create a `useMockState` hook that returns the mocked state and a setState function that updates it locally. Person 3 and Person 4 import this hook. When Phase 1 is ready, swap `useMockState` for `useCoAgent` — one line change per component.

**Test scenarios to cover with the mock:**
- Phase = interrogation, fog level 2 of 5
- Phase = ignition, constraint summary showing
- Phase = exploration, 3 nodes expanded, active node is "Network Activation"
- Scrubber with 8 pills, current position at pill 6
- Scrubber with two tracks, fork branch active

Build the UI against all four states before wiring to real state.

---

## 8. Hour-by-Hour Plan for Phase 2

| Time | Person 3 | Person 4 |
|---|---|---|
| 0:00–0:30 | Both: Align on state schema with Phase 1. Agree on mock state object. | Both: Align on state schema with Phase 1. Agree on mock state object. |
| 0:30–1:30 | Build layout shell: three panels, correct proportions, phase-based show/hide logic using mock state | Build map canvas: node rendering with mock nodes, SVG edges, fog state at level 2 |
| 1:30–2:30 | Build interrogation chat UI: question display, answer input, Q&A history stacking | Build node interactions: hover states, active states, conflict flag rendering, tooltip on conflict |
| 2:30–3:30 | Build constraint blocks appearing on canvas: animation, positioning, fog advancing per answer | Build timeline scrubber: track, pills, positioning, hover states, fork icon appearing |
| 3:00 | Wire to real Phase 1 state: swap useMockState for useCoAgent | Wire to real Phase 1 state: swap useMockState for useCoAgent |
| 3:30–4:30 | Build ignition sequence: constraint summary card, confirm action, fog-to-clarity animation, panel slide-away | Build rewind mechanic: click pill, map fades out, snapshot restores, fades in |
| 4:30–5:30 | Adaptive sidebar: category detection, template rendering, slide-in/out animation | Build fork mechanic: fork button, interrogation panel re-opens, new branch track appears |
| 5:00–5:30 | Polish: typewriter effect on questions, smooth panel transitions | Polish: two-track display, branch switching animation |
| 5:30–6:00 | Both: Full demo run-through. Cut anything broken. Rehearse the 3-minute script. | Both: Full demo run-through. Cut anything broken. Rehearse the 3-minute script. |

---

## 9. The Fallback Ladder

If things break, cut in this exact order. Stop cutting when the demo is stable.

**Cut 1 — Fork two-track display:** Show rewind only. A single track that rewinds is still a strong demo. The fork mechanic without the visual two-track is still interesting. Cut the two-track rendering, keep the rewind and single fork.

**Cut 2 — Adaptive sidebar:** Replace with a static panel that says "Contextual controls for [node label]" with 2 mocked sliders. Judges see the concept. The real implementation is not needed.

**Cut 3 — Constraint blocks during interrogation:** Remove the floating constraint blocks. The fog-to-clarity still works without them. The interrogation feels slightly less live but still functions.

**Cut 4 — Typewriter effect on questions:** Render questions instantly. Not noticeable once the rest is working.

**Cut 5 — Non-uniform fog:** Make the fog lift uniformly across the whole canvas. Simpler CSS, same concept, slightly less intelligent feeling.

**Cut 6 — SVG edges:** Remove edges entirely. Nodes float without connections. Loses some of the graph feeling but the nodes themselves still tell the story.

**Never cut:** The ignition moment, the map rendering, the rewind mechanic. These are the three things that make the demo work. If these are broken, the demo does not exist.

---

## 10. What the Demo Script Looks Like in Phase 2's Terms

Every build decision should serve one of these seven moments:

1. **Entry** — single input, dark screen, complete focus. Person 3 owns this.
2. **Question 3 answer** — user types, constraint block floats onto canvas, fog advances. Person 3 (left panel) + Person 4 (canvas reaction) together.
3. **Ignition** — fog lifts, map snaps, scrubber slides up, panel recedes. Person 3 owns this. It is the most important moment.
4. **Node expansion** — user clicks "Network Activation", 4 children animate outward. Person 4 owns this.
5. **Rewind** — user drags scrubber back to pill 3, map fades and restores. Person 4 owns this.
6. **Fork answer** — user gives different answer, map restructures. Phase 1 + Person 4.
7. **Two tracks** — both tracks visible, user clicks between them, map swaps. Person 4 owns this.

If all 7 moments work, the demo is a 10. If only moments 1–5 work, the demo is still an 8. Plan accordingly.

---

## 11. What Success Looks Like

At the end of 6 hours, Phase 2 is successful if:

- The three-panel layout is stable and transitions smoothly between phases
- A first-time viewer watching the demo understands what is happening without explanation
- The ignition moment produces an audible reaction from the room
- The rewind mechanic works reliably on the first attempt during the demo
- No component is in a broken state during the demo — everything either works or is cleanly hidden
- The judge's first question is "how did you build this?" not "what does this do?"
