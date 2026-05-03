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
  const nodesRef = useRef<NetworkNode[]>([]);
  const animRef = useRef<number>(0);

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

  // Simple force simulation
  const simulate = useCallback(() => {
    if (!data || !svgRef.current) return;

    const W = svgRef.current.clientWidth || 360;
    const H = 260;
    const nodes = data.nodes.map((n) => ({
      ...n,
      x: n.x ?? W * 0.2 + Math.random() * W * 0.6,
      y: n.y ?? H * 0.2 + Math.random() * H * 0.6,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    nodesRef.current = nodes;

    const edges = data.edges.filter(
      (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
    );

    let tick = 0;
    const maxTicks = 120;

    const step = () => {
      if (tick >= maxTicks) return;

      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x! - nodes[i].x!;
          const dy = nodes[j].y! - nodes[i].y!;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx! -= fx;
          nodes[i].vy! -= fy;
          nodes[j].vx! += fx;
          nodes[j].vy! += fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source)!;
        const b = nodeMap.get(edge.target)!;
        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 80) * 0.01 * edge.strength;
        const fx = (dx / Math.max(dist, 1)) * force;
        const fy = (dy / Math.max(dist, 1)) * force;
        a.vx! += fx;
        a.vy! += fy;
        b.vx! -= fx;
        b.vy! -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx! += (W / 2 - node.x!) * 0.005;
        node.vy! += (H / 2 - node.y!) * 0.005;
      }

      // Apply velocity with damping
      for (const node of nodes) {
        node.vx! *= 0.85;
        node.vy! *= 0.85;
        node.x! += node.vx!;
        node.y! += node.vy!;
        // Bounds
        node.x = Math.max(20, Math.min(W - 20, node.x!));
        node.y = Math.max(20, Math.min(H - 20, node.y!));
      }

      tick++;
      nodesRef.current = [...nodes];
      // Force re-render
      setData((prev) => (prev ? { ...prev, nodes: [...nodes] } : prev));
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [data]);

  useEffect(() => {
    if (data && data.nodes.length > 0) {
      const cleanup = simulate();
      return cleanup;
    }
  }, [data?.nodes.length]);

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
