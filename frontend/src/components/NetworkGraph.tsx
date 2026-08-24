"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { NetworkResponse, GraphNode, GraphEdge } from "@/types";
import { getSectorColor, SECTOR_COLORS } from "@/lib/constants";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Dynamically import ForceGraph2D with ssr: false as required by Next.js App Router
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center text-slate-400 dark:text-slate-500 font-mono text-sm">
      Initializing Canvas Graph...
    </div>
  ),
});

interface NetworkGraphProps {
  data: NetworkResponse;
  centerTicker: string;
}

export default function NetworkGraph({ data, centerTicker }: NetworkGraphProps) {
  const router = useRouter();
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 550 });
  const [isDark, setIsDark] = useState<boolean>(true);

  // Detect and listen to theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Update canvas dimensions on container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(520, window.innerHeight * 0.58),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Transform backend NetworkResponse into react-force-graph format
  const nodesMap = new Map<string, GraphNode>();

  // Center node
  const centerSector = data.center?.sector || "Unknown";
  nodesMap.set(centerTicker, {
    id: centerTicker,
    ticker: centerTicker,
    sector: centerSector,
    hops: 0,
    isCenter: true,
    color: isDark ? "#38bdf8" : "#0284c7",
    val: 18,
  });

  // Reachable nodes
  data.nodes.forEach((node) => {
    if (!nodesMap.has(node.ticker)) {
      nodesMap.set(node.ticker, {
        id: node.ticker,
        ticker: node.ticker,
        sector: node.sector,
        hops: node.hops,
        isCenter: false,
        color: getSectorColor(node.sector),
        val: Math.max(8, 14 - node.hops * 2),
      });
    }
  });

  const nodes: GraphNode[] = Array.from(nodesMap.values());

  const links: GraphEdge[] = data.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    strength: edge.strength,
  }));

  const graphData = { nodes, links };

  // Recenter graph after data loads
  useEffect(() => {
    if (fgRef.current) {
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 50);
      }, 300);
    }
  }, [data]);

  const handleZoomIn = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
  };

  const handleZoomOut = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 0.7, 300);
  };

  const handleResetZoom = () => {
    if (fgRef.current) fgRef.current.zoomToFit(400, 50);
  };

  const canvasBg = isDark ? "#0c101c" : "#f8fafc";

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden glass-panel border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c101c] transition-colors duration-200"
    >
      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 backdrop-blur-md shadow-md">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset View"
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Force Graph */}
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor={canvasBg}
        nodeRelSize={6}
        nodeId="id"
        // Custom node rendering with labels and glow rings
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const isCenter = node.isCenter;
          const radius = isCenter ? 12 : Math.max(6, 10 - (node.hops || 1) * 1.5);
          const color = isCenter ? (isDark ? "#38bdf8" : "#0284c7") : getSectorColor(node.sector);

          // Center node outer pulsing glow ring
          if (isCenter) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(2, 132, 199, 0.2)";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.8)" : "rgba(2, 132, 199, 0.7)";
            ctx.stroke();
          }

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.lineWidth = isCenter ? 2.5 : 1.5;
          ctx.strokeStyle = isCenter ? "#ffffff" : "rgba(255, 255, 255, 0.8)";
          ctx.stroke();

          // Node Text Label (Ticker)
          const label = node.ticker;
          const fontSize = isCenter ? 13 : 11;
          ctx.font = `${isCenter ? "bold " : "600 "}${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Text shadow / pill background for clear legibility in both themes
          const textWidth = ctx.measureText(label).width;
          const padding = 3;
          ctx.fillStyle = isDark ? "rgba(10, 13, 20, 0.85)" : "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(
            node.x - textWidth / 2 - padding,
            node.y + radius + 4,
            textWidth + padding * 2,
            fontSize + 4
          );

          ctx.fillStyle = isCenter ? (isDark ? "#38bdf8" : "#0284c7") : (isDark ? "#f1f5f9" : "#0f172a");
          ctx.fillText(label, node.x, node.y + radius + fontSize / 2 + 6);
        }}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = color;
          const radius = node.isCenter ? 16 : 12;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        // Edge thickness proportional to correlation strength
        linkWidth={(link: any) => Math.max(1.2, Math.pow(Math.abs(link.strength), 2) * 5.5)}
        linkColor={(link: any) => {
          const strength = Math.abs(link.strength);
          if (isDark) {
            if (strength >= 0.8) return "rgba(96, 165, 250, 0.75)";
            if (strength >= 0.65) return "rgba(147, 197, 253, 0.5)";
            return "rgba(100, 116, 139, 0.35)";
          } else {
            if (strength >= 0.8) return "rgba(37, 99, 235, 0.75)";
            if (strength >= 0.65) return "rgba(59, 130, 246, 0.45)";
            return "rgba(148, 163, 184, 0.4)";
          }
        }}
        // Render edge strength labels
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          if (globalScale < 1.1) return;

          const source = link.source;
          const target = link.target;
          if (typeof source !== "object" || typeof target !== "object") return;

          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;

          const text = link.strength > 0 ? `+${link.strength.toFixed(2)}` : link.strength.toFixed(2);
          const fontSize = 8.5;
          ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.92)";
          ctx.fillRect(midX - textWidth / 2 - 2, midY - fontSize / 2 - 2, textWidth + 4, fontSize + 4);

          ctx.fillStyle = isDark
            ? (link.strength >= 0.75 ? "#93c5fd" : "#94a3b8")
            : (link.strength >= 0.75 ? "#1d4ed8" : "#475569");
          ctx.fillText(text, midX, midY);
        }}
        onNodeClick={(node: any) => {
          if (node.ticker && node.ticker !== centerTicker) {
            router.push(`/stocks/${node.ticker}`);
          }
        }}
        cooldownTicks={120}
        d3VelocityDecay={0.3}
      />

      {/* Interactive Sector Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 backdrop-blur-md flex flex-wrap items-center gap-3 text-xs shadow-md">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Sectors:</span>
        {Object.entries(SECTOR_COLORS).map(([sec, color]) => {
          if (sec === "Unknown") return null;
          return (
            <div key={sec} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-slate-700 dark:text-slate-300 font-medium">{sec}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-400/40" />
          <span className="text-blue-600 dark:text-blue-300 font-semibold">Center Node</span>
        </div>
      </div>
    </div>
  );
}
