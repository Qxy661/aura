import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";

interface NetworkNode {
  id: number;
  title: string;
  score: number;
  user_score: number;
  source: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface NetworkEdge {
  source: number;
  target: number;
  type: string;
  strength: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface PaperNetworkProps {
  onSelectArticle?: (id: number) => void;
}

function getNodeColor(userScore: number): string {
  if (userScore >= 7) return "var(--color-brown)";
  if (userScore >= 4) return "var(--color-primary)";
  return "var(--color-muted-foreground)";
}

export function PaperNetwork({ onSelectArticle }: PaperNetworkProps) {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const res = await api.get<NetworkData>("/research/network");
      setData(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const buildNetwork = async () => {
    setBuilding(true);
    try {
      await api.post("/research/network/build");
      await fetchNetwork();
    } catch {
      // silent
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

  // Run force simulation synchronously (fast enough for ≤50 nodes)
  const layoutNodes = useCallback((nodes: NetworkNode[], edges: NetworkEdge[], W: number, H: number) => {
    const positioned = nodes.map((n) => ({
      ...n,
      x: W * 0.15 + Math.random() * W * 0.7,
      y: H * 0.15 + Math.random() * H * 0.7,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(positioned.map((n) => [n.id, n]));
    const validEdges = edges.filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target));

    for (let tick = 0; tick < 80; tick++) {
      // Repulsion
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const dx = positioned[j].x! - positioned[i].x!;
          const dy = positioned[j].y! - positioned[i].y!;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 600 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          positioned[i].vx! -= fx;
          positioned[i].vy! -= fy;
          positioned[j].vx! += fx;
          positioned[j].vy! += fy;
        }
      }
      // Attraction
      for (const edge of validEdges) {
        const a = nodeMap.get(edge.source)!;
        const b = nodeMap.get(edge.target)!;
        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 80) * 0.008 * edge.strength;
        const fx = (dx / Math.max(dist, 1)) * force;
        const fy = (dy / Math.max(dist, 1)) * force;
        a.vx! += fx;
        a.vy! += fy;
        b.vx! -= fx;
        b.vy! -= fy;
      }
      // Center gravity + damping
      for (const node of positioned) {
        node.vx! += (W / 2 - node.x!) * 0.004;
        node.vy! += (H / 2 - node.y!) * 0.004;
        node.vx! *= 0.8;
        node.vy! *= 0.8;
        node.x! += node.vx!;
        node.y! += node.vy!;
        node.x = Math.max(25, Math.min(W - 25, node.x!));
        node.y = Math.max(25, Math.min(H - 25, node.y!));
      }
    }
    return positioned;
  }, []);

  useEffect(() => {
    if (data && data.nodes.length > 0 && svgRef.current) {
      const W = svgRef.current.clientWidth || 360;
      const H = 260;
      const positioned = layoutNodes(data.nodes, data.edges, W, H);
      setData((prev) => prev ? { ...prev, nodes: positioned } : prev);
    }
  }, [data?.nodes.length, layoutNodes]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="cute-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            🔗 论文关系
          </h3>
          <button
            onClick={buildNetwork}
            disabled={building}
            className="btn-soft text-[10px] px-2.5 py-1"
          >
            {building ? "构建中..." : "构建关系"}
          </button>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)] text-center py-6">
          {loading ? "加载中..." : "点击「构建关系」让 AI 分析论文间的关联"}
        </p>
      </div>
    );
  }

  return (
    <div className="cute-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          🔗 论文关系
          <span className="text-[10px] font-normal text-[var(--color-muted-foreground)]">
            {data.nodes.length} 篇 · {data.edges.length} 条关联
          </span>
        </h3>
        <button
          onClick={buildNetwork}
          disabled={building}
          className="btn-soft text-[10px] px-2.5 py-1"
        >
          {building ? "刷新中..." : "刷新"}
        </button>
      </div>
      <svg
        ref={svgRef}
        width="100%"
        height="260"
        className="rounded-xl bg-[var(--color-muted)] border border-[var(--color-border)]"
      >
        {/* Edges */}
        {data.edges
          .filter((e) => {
            const ids = new Set(data.nodes.map((n) => n.id));
            return ids.has(e.source) && ids.has(e.target);
          })
          .map((edge, i) => {
            const src = data.nodes.find((n) => n.id === edge.source);
            const tgt = data.nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;
            return (
              <line
                key={i}
                x1={src.x ?? 0}
                y1={src.y ?? 0}
                x2={tgt.x ?? 0}
                y2={tgt.y ?? 0}
                stroke="var(--color-border)"
                strokeWidth={1 + edge.strength * 2}
                strokeOpacity={0.5}
              />
            );
          })}
        {/* Nodes */}
        {data.nodes.map((node) => (
          <g
            key={node.id}
            className="cursor-pointer"
            onClick={() => onSelectArticle?.(node.id)}
          >
            <circle
              cx={node.x ?? 0}
              cy={node.y ?? 0}
              r={5 + node.user_score}
              fill={getNodeColor(node.user_score)}
              fillOpacity={0.8}
              stroke="white"
              strokeWidth={1.5}
            />
            <text
              x={node.x ?? 0}
              y={(node.y ?? 0) + 14 + node.user_score}
              textAnchor="middle"
              fontSize={8}
              fill="var(--color-foreground)"
              opacity={0.7}
            >
              {node.title.length > 15 ? node.title.slice(0, 15) + "…" : node.title}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
