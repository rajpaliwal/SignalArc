"use client";

import { Hand, Maximize2, Minimize2, Minus, MousePointerClick, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InterestEdge, InterestType } from "@/lib/types";

interface StoryNode {
  id: string;
  title: string;
}

/** What the hover tooltip / click selection describes — a node or an edge,
 * whichever the pointer is over. */
type HoverTarget =
  | { kind: "user"; label: string }
  | { kind: "interest"; edge: InterestEdge }
  | { kind: "story"; story: StoryNode };

const TYPE_COLOR: Record<InterestType, string> = {
  topic: "#6366f1",
  place: "#f59e0b",
  profession: "#64748b",
  hobby: "#14b8a6",
  sport: "#14b8a6",
  movie: "#8b5cf6",
  political: "#6366f1",
  other: "#94a3b8",
};

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function ConstellationGraph({
  centerLabel,
  edges,
  followedStories,
  selectedId,
  onSelectInterest,
  onSelectStory,
}: {
  centerLabel: string;
  edges: InterestEdge[];
  followedStories: StoryNode[];
  /** id of the interest currently selected (e.g. via the list below) — drawn with a highlight ring. */
  selectedId?: string | null;
  /** Fired when an interest node or its edge is clicked. */
  onSelectInterest?: (id: string) => void;
  /** Fired when a followed-story node or its edge is clicked. */
  onSelectStory?: (id: string) => void;
}) {
  const size = 640;
  const center = { x: size / 2, y: size / 2 };
  const interestRadius = 190;
  const storyRadius = 280;

  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ target: HoverTarget; x: number; y: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Buttons-only by default: a bare wheel handler zooms on every incidental
  // trackpad scroll over the graph, which reads as broken rather than a
  // feature — touchpad zoom is opt-in via the toggle below.
  const [zoomMode, setZoomMode] = useState<"buttons" | "touchpad">("buttons");
  const containerRef = useRef<HTMLDivElement>(null);

  const positiveEdges = edges.filter((e) => e.negativeWeight === 0);

  const zoomBy = (factor: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (zoomMode !== "touchpad") return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  };

  const updateHoverPosition = (e: React.MouseEvent, target: HoverTarget) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    // Clamp so the tooltip can never render past the container's own edge —
    // it's what was actually spilling out over other UI, not the zoomed
    // graph itself (the SVG already clips its own drawing to its box).
    const x = Math.min(e.clientX - bounds.left, bounds.width - 230);
    const y = Math.min(e.clientY - bounds.top, bounds.height - 90);
    setHover({ target, x: Math.max(0, x), y: Math.max(0, y) });
  };

  // Esc exits fullscreen, matching what every other fullscreen UI does.
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  // Scale-around-center transform so zoom doesn't drag the graph off-position.
  const zoomTransform = `translate(${center.x} ${center.y}) scale(${zoom}) translate(${-center.x} ${-center.y})`;

  return (
    <>
      {/* backdrop is a sibling, not a child — a fixed-position child of an
          overflow-hidden container gets clipped inconsistently across
          browsers, which would make the dimmed backdrop only cover part
          of the screen */}
      {fullscreen && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setFullscreen(false)} />}
      <div
        ref={containerRef}
        className={
          fullscreen
            ? "fixed inset-4 z-50 overflow-hidden rounded-2xl bg-[#0b0f1f] shadow-2xl sm:inset-8"
            : "relative h-full w-full overflow-hidden rounded-xl"
        }
        onWheel={handleWheel}
      >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        // `overflow: hidden` must be set on the svg element itself, not
        // just its wrapping div — verified by measuring actual rendered
        // geometry: at high zoom, the scaled inner <g> painted circles
        // and lines ~450px past the wrapping div's own box even though
        // that div had overflow-hidden, because the div's clipping doesn't
        // reach into the svg's own internal coordinate/paint space. Setting
        // it directly here (both the CSS class and the presentation
        // attribute, for older-engine safety) is what actually clips it.
        className="h-full w-full overflow-hidden"
        style={{ overflow: "hidden" }}
        overflow="hidden"
        role="img"
        aria-label="Personal relevance constellation"
      >
        <rect width={size} height={size} fill="none" />

        <g transform={zoomTransform}>
          {/* orbit guides */}
          <circle cx={center.x} cy={center.y} r={interestRadius} fill="none" stroke="#ffffff" strokeOpacity="0.12" />
          <circle
            cx={center.x}
            cy={center.y}
            r={storyRadius}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.1"
            strokeDasharray="4 4"
          />

          {/* edges: interests */}
          {positiveEdges.map((edge, i) => {
            const angle = (360 / positiveEdges.length) * i;
            const pos = polar(center.x, center.y, interestRadius, angle);
            const strength = edge.explicitWeight + edge.implicitWeight * edge.confidence;
            return (
              <line
                key={`line-${edge.id}`}
                x1={center.x}
                y1={center.y}
                x2={pos.x}
                y2={pos.y}
                stroke={TYPE_COLOR[edge.type]}
                strokeWidth={Math.max(0.75, strength * 2) * (hover?.target.kind === "interest" && hover.target.edge.id === edge.id ? 2 : 1)}
                strokeOpacity={edge.source === "explicit" ? 0.55 : 0.35}
                strokeDasharray={edge.source === "inferred" ? "3 3" : undefined}
                className="cursor-pointer transition-[stroke-width]"
                onMouseEnter={(e) => updateHoverPosition(e, { kind: "interest", edge })}
                onMouseMove={(e) => updateHoverPosition(e, { kind: "interest", edge })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectInterest?.(edge.id)}
              />
            );
          })}

          {/* edges: followed stories */}
          {followedStories.map((story, i) => {
            const angle = (360 / Math.max(followedStories.length, 1)) * i + 20;
            const pos = polar(center.x, center.y, storyRadius, angle);
            return (
              <line
                key={`story-line-${story.id}`}
                x1={center.x}
                y1={center.y}
                x2={pos.x}
                y2={pos.y}
                stroke="#f97316"
                strokeWidth={hover?.target.kind === "story" && hover.target.story.id === story.id ? "2.5" : "1.25"}
                strokeOpacity="0.5"
                className="cursor-pointer transition-[stroke-width]"
                onMouseEnter={(e) => updateHoverPosition(e, { kind: "story", story })}
                onMouseMove={(e) => updateHoverPosition(e, { kind: "story", story })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectStory?.(story.id)}
              />
            );
          })}

          {/* center node */}
          <circle
            cx={center.x}
            cy={center.y}
            r={22}
            fill="#6366f1"
            className="cursor-pointer"
            onMouseEnter={(e) => updateHoverPosition(e, { kind: "user", label: centerLabel })}
            onMouseMove={(e) => updateHoverPosition(e, { kind: "user", label: centerLabel })}
            onMouseLeave={() => setHover(null)}
          />
          <text
            x={center.x}
            y={center.y + 4}
            textAnchor="middle"
            className="pointer-events-none fill-white text-[11px] font-semibold"
          >
            You
          </text>

          {/* interest nodes */}
          {positiveEdges.map((edge, i) => {
            const angle = (360 / positiveEdges.length) * i;
            const pos = polar(center.x, center.y, interestRadius, angle);
            const strength = edge.explicitWeight + edge.implicitWeight * edge.confidence;
            const r = Math.max(5, Math.min(11, 5 + strength * 5));
            const isSelected = selectedId === edge.id;
            return (
              <g key={`node-${edge.id}`}>
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={r + 5} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={TYPE_COLOR[edge.type]}
                  opacity={edge.source === "explicit" ? 1 : 0.7}
                  className="cursor-pointer"
                  onMouseEnter={(e) => updateHoverPosition(e, { kind: "interest", edge })}
                  onMouseMove={(e) => updateHoverPosition(e, { kind: "interest", edge })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelectInterest?.(edge.id)}
                />
                <text
                  x={pos.x}
                  y={pos.y + r + 12}
                  textAnchor="middle"
                  className="pointer-events-none fill-slate-300 text-[9px] font-medium"
                >
                  {edge.label.length > 16 ? `${edge.label.slice(0, 16)}…` : edge.label}
                </text>
              </g>
            );
          })}

          {/* followed story nodes */}
          {followedStories.map((story, i) => {
            const angle = (360 / Math.max(followedStories.length, 1)) * i + 20;
            const pos = polar(center.x, center.y, storyRadius, angle);
            return (
              <g key={`story-node-${story.id}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={7}
                  fill="#f97316"
                  className="cursor-pointer"
                  onMouseEnter={(e) => updateHoverPosition(e, { kind: "story", story })}
                  onMouseMove={(e) => updateHoverPosition(e, { kind: "story", story })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelectStory?.(story.id)}
                />
                <text
                  x={pos.x}
                  y={pos.y + 20}
                  textAnchor="middle"
                  className="pointer-events-none fill-slate-300 text-[9px] font-medium"
                >
                  {story.title.length > 22 ? `${story.title.slice(0, 22)}…` : story.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* zoom + fullscreen controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-lg border border-white/10 bg-black/30 p-1 backdrop-blur">
        <button
          onClick={() => zoomBy(1.25)}
          aria-label="Zoom in"
          className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setZoom(1)}
          aria-label="Reset zoom"
          className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        <button
          onClick={() => zoomBy(1 / 1.25)}
          aria-label="Zoom out"
          className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="my-0.5 h-px bg-white/10" />
        <button
          onClick={() => setZoomMode((m) => (m === "buttons" ? "touchpad" : "buttons"))}
          aria-label={zoomMode === "buttons" ? "Switch to touchpad zoom" : "Switch to button zoom"}
          title={zoomMode === "buttons" ? "Button zoom (click for touchpad zoom)" : "Touchpad zoom (click for button zoom)"}
          className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {zoomMode === "buttons" ? <MousePointerClick className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
        </button>
        <div className="my-0.5 h-px bg-white/10" />
        <button
          onClick={() => setFullscreen((v) => !v)}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          {hover.target.kind === "user" && <p className="font-semibold text-white">{hover.target.label}</p>}
          {hover.target.kind === "interest" && (
            <>
              <p className="font-semibold text-white">{hover.target.edge.label}</p>
              <p className="mt-0.5 text-slate-400">
                {hover.target.edge.type} · {hover.target.edge.source} · {Math.round(hover.target.edge.confidence * 100)}%
                confidence
              </p>
              <p className="mt-1 text-slate-400">{hover.target.edge.reason}</p>
              <p className="mt-1 text-indigo-300">Click for details ↓</p>
            </>
          )}
          {hover.target.kind === "story" && (
            <>
              <p className="font-semibold text-white">{hover.target.story.title}</p>
              <p className="mt-1 text-indigo-300">Click to open story →</p>
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
}
