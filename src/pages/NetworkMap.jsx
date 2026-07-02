import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/api/netshieldClient";
import { Network, Circle, AlertTriangle, Shield } from "lucide-react";

const generateNodes = (assets) => {
  if (assets.length > 0) {
    return assets.map((a, i) => ({
      id: a.id,
      label: a.hostname,
      ip: a.ip_address,
      type: a.asset_type || "server",
      risk: a.risk_score || 0,
      status: a.status || "active",
      x: 150 + (i % 5) * 180,
      y: 100 + Math.floor(i / 5) * 150,
    }));
  }
  // Default demo nodes
  return [
    { id: "fw", label: "Firewall", ip: "10.0.0.1", type: "firewall", risk: 15, status: "active", x: 450, y: 60 },
    { id: "gw", label: "Gateway", ip: "10.0.0.2", type: "router", risk: 22, status: "active", x: 450, y: 180 },
    { id: "srv1", label: "Web Server", ip: "10.0.1.10", type: "server", risk: 78, status: "active", x: 200, y: 300 },
    { id: "srv2", label: "DB Server", ip: "10.0.1.20", type: "server", risk: 45, status: "active", x: 400, y: 300 },
    { id: "srv3", label: "Mail Server", ip: "10.0.1.30", type: "server", risk: 62, status: "active", x: 600, y: 300 },
    { id: "ws1", label: "Workstation-1", ip: "192.168.1.10", type: "workstation", risk: 33, status: "active", x: 150, y: 440 },
    { id: "ws2", label: "Workstation-2", ip: "192.168.1.11", type: "workstation", risk: 88, status: "suspicious", x: 350, y: 440 },
    { id: "ws3", label: "Workstation-3", ip: "192.168.1.12", type: "workstation", risk: 12, status: "active", x: 550, y: 440 },
    { id: "iot1", label: "IoT Camera", ip: "192.168.2.5", type: "iot", risk: 91, status: "quarantined", x: 750, y: 300 },
    { id: "cloud1", label: "AWS Instance", ip: "172.16.0.50", type: "cloud_instance", risk: 41, status: "active", x: 750, y: 180 },
  ];
};

const buildEdges = (nodes) => {
  if (nodes.length < 2) return [];
  const coreTypes = ["firewall", "router", "switch"];
  const core = nodes.find((n) => coreTypes.includes(n.type)) || nodes[0];
  return nodes.filter((n) => n.id !== core.id).map((n) => ({ from: core.id, to: n.id }));
};

const getRiskColor = (risk) => {
  if (risk >= 80) return "#ef4444";
  if (risk >= 60) return "#f97316";
  if (risk >= 40) return "#f59e0b";
  return "#22c55e";
};

export default function NetworkMap() {
  const [assets, setAssets] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.entities.Asset.list("-created_date", 50)
      .then((a) => {
        setAssets(a);
        setNodes(generateNodes(a));
      })
      .catch(() => setNodes(generateNodes([])))
      .finally(() => setLoading(false));
  }, []);

  const edges = useMemo(() => buildEdges(nodes), [nodes]);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Network Map</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visual topology of hosts, connections, and risk scores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[hsl(222,30%,14%)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" /> Network Topology
            </h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
            </div>
          </div>
          <svg width="100%" height="520" viewBox="0 0 900 520" className="bg-[hsl(222,47%,5%)]">
            {/* Grid */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0,210,255,0.04)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="900" height="520" fill="url(#grid)" />

            {/* Edges */}
            {edges.map((e, i) => {
              const from = nodes.find(n => n.id === e.from);
              const to = nodes.find(n => n.id === e.to);
              if (!from || !to) return null;
              const isAttack = to.risk > 70;
              return (
                <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isAttack ? "rgba(239,68,68,0.4)" : "rgba(0,210,255,0.15)"}
                  strokeWidth={isAttack ? 2 : 1}
                  strokeDasharray={isAttack ? "5,5" : "none"}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => (
              <g key={node.id} onClick={() => setSelected(node)} className="cursor-pointer">
                <circle cx={node.x} cy={node.y} r={24} fill={getRiskColor(node.risk)} fillOpacity={0.15}
                  stroke={getRiskColor(node.risk)} strokeWidth={selected?.id === node.id ? 3 : 1.5} strokeOpacity={0.6} />
                <circle cx={node.x} cy={node.y} r={6} fill={getRiskColor(node.risk)} />
                <text x={node.x} y={node.y + 40} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">{node.label}</text>
                <text x={node.x} y={node.y + 52} textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace">{node.ip}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              {selected ? selected.label : "Node Details"}
            </h3>
            {selected ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">IP Address</span><span className="font-mono text-cyan-400">{selected.ip}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-300 capitalize">{selected.type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`capitalize ${selected.status === "active" ? "text-green-400" : selected.status === "quarantined" ? "text-red-400" : "text-amber-400"}`}>{selected.status}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Risk Score</span>
                  <span className="font-mono font-bold" style={{ color: getRiskColor(selected.risk) }}>{selected.risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[hsl(222,30%,14%)]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${selected.risk}%`, backgroundColor: getRiskColor(selected.risk) }} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Click a node to see details</p>
            )}
          </div>

          <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Network Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total Nodes</span><span className="text-white font-mono">{nodes.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">High Risk</span><span className="text-red-400 font-mono">{nodes.filter(n => n.risk >= 70).length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Quarantined</span><span className="text-amber-400 font-mono">{nodes.filter(n => n.status === "quarantined").length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}