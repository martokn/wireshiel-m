import React, { useState, useEffect } from "react";
import { Activity, Wifi, ArrowUpDown, Monitor, Pause, Play, Cable, Radio, Crosshair, X, Network, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const protocols = ["HTTP", "HTTPS", "DNS", "SSH", "FTP", "SMTP", "SMB", "TLS"];
const flags = ["SYN", "ACK", "FIN", "RST", "PSH", "URG"];

const PROTO_COLORS = { HTTP: "#8b5cf6", HTTPS: "#06b6d4", DNS: "#f59e0b", SSH: "#22c55e", FTP: "#ef4444", SMTP: "#ec4899", SMB: "#f97316", TLS: "#6366f1" };

const INTERFACES = [
  { id: "eth0", name: "Ethernet (eth0)", ip: "192.168.1.10", type: "Wired", mtu: 1500, status: "up" },
  { id: "wlan0", name: "WiFi (wlan0)", ip: "192.168.1.22", type: "Wireless", mtu: 1500, status: "up" },
  { id: "eth1", name: "Uplink (eth1)", ip: "203.0.113.5", type: "Wired", mtu: 1500, status: "up" },
  { id: "tun0", name: "VPN Tunnel (tun0)", ip: "10.8.0.1", type: "Tunnel", mtu: 1400, status: "up" },
  { id: "lo", name: "Loopback (lo)", ip: "127.0.0.1", type: "Loopback", mtu: 65536, status: "up" },
];

const GROUP_MODES = [
  { id: "protocol", name: "By Protocol", icon: Network },
  { id: "endpoint", name: "By Endpoint", icon: Radio },
  { id: "issue", name: "By Issue", icon: AlertTriangle },
];

const ENDPOINT_COLORS = ["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#3b82f6", "#f97316", "#14b8a6"];

const randomIP = () => `${Math.floor(Math.random()*223+1)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*254+1)}`;
const randomPort = () => [80, 443, 22, 53, 8080, 3389, 25, 993, 8443][Math.floor(Math.random() * 9)];

const detectIssue = (proto, flag, action) => {
  if (action === "block") return { type: "blocked", color: "#ef4444", label: "Blocked" };
  if (flag === "RST") return { type: "reset", color: "#f97316", label: "Conn Reset" };
  if (["FTP", "HTTP", "SMTP"].includes(proto)) return { type: "unencrypted", color: "#f59e0b", label: "Unencrypted" };
  if (flag === "SYN" && Math.random() > 0.7) return { type: "scan", color: "#a855f7", label: "Possible Scan" };
  return { type: "normal", color: "#22c55e", label: "Normal" };
};

const generatePacket = (ifaceId) => {
  const src = randomIP();
  const dst = randomIP();
  const srcPort = Math.floor(Math.random() * 60000 + 1024);
  const dstPort = randomPort();
  const proto = protocols[Math.floor(Math.random() * protocols.length)];
  const flag = flags[Math.floor(Math.random() * flags.length)];
  const action = Math.random() > 0.15 ? "allow" : "block";
  const convKey = [`${src}:${srcPort}`, `${dst}:${dstPort}`].sort().join(" ↔ ");
  return {
    id: Math.random().toString(36).slice(2, 10),
    interface: ifaceId,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    src, dst, srcPort, dstPort, proto,
    size: Math.floor(Math.random() * 8000 + 64),
    flag, action, convKey,
    issue: detectIssue(proto, flag, action),
  };
};

export default function RealTimeMonitor() {
  const [packets, setPackets] = useState(() => Array.from({ length: 30 }, () => generatePacket("eth0")));
  const [paused, setPaused] = useState(false);
  const [selectedInterface, setSelectedInterface] = useState("eth0");
  const [followStream, setFollowStream] = useState(null);
  const [groupBy, setGroupBy] = useState("protocol");
  const [bandwidth, setBandwidth] = useState(() => {
    const data = [];
    for (let i = 59; i >= 0; i--) {
      data.push({ t: `${i}s`, val: Math.floor(Math.random() * 3000 + 1500) });
    }
    return data;
  });

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      setPackets(prev => [generatePacket(selectedInterface), ...prev.slice(0, 99)]);
      setBandwidth(prev => [...prev.slice(1), { t: "0s", val: Math.floor(Math.random() * 3000 + 1500) }]);
    }, 800);
    return () => clearInterval(iv);
  }, [paused, selectedInterface]);

  const endpointColorFor = (key) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return ENDPOINT_COLORS[hash % ENDPOINT_COLORS.length];
  };

  const rowColor = (p) => {
    if (groupBy === "issue") return p.issue.color;
    if (groupBy === "endpoint") return endpointColorFor(p.convKey);
    return PROTO_COLORS[p.proto] || "#64748b";
  };

  const followedPackets = followStream ? packets.filter(p => p.convKey === followStream) : [];
  const displayPackets = followStream ? followedPackets : packets;

  const groups = (() => {
    if (groupBy === "issue") {
      const map = {};
      packets.forEach(p => {
        const k = p.issue.label;
        map[k] = map[k] || { name: k, count: 0, color: p.issue.color };
        map[k].count++;
      });
      return Object.values(map).sort((a, b) => b.count - a.count);
    }
    if (groupBy === "endpoint") {
      const map = {};
      packets.forEach(p => {
        const k = p.convKey;
        map[k] = map[k] || { name: k, count: 0, color: endpointColorFor(k) };
        map[k].count++;
      });
      return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
    }
    return protocols.map(p => ({
      name: p,
      count: packets.filter(pk => pk.proto === p).length,
      color: PROTO_COLORS[p],
    })).sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Real-Time Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live traffic feed and network analysis</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Cable className="w-4 h-4 text-slate-500" />
            <Select value={selectedInterface} onValueChange={setSelectedInterface}>
              <SelectTrigger className="w-[190px] h-8 bg-[hsl(222,44%,8%)] border-[hsl(222,30%,18%)] text-slate-300 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                {INTERFACES.map(iface => (
                  <SelectItem key={iface.id} value={iface.id} className="text-slate-300 text-xs">
                    <span className="flex items-center gap-2">
                      {iface.type === "Wireless" ? <Wifi className="w-3 h-3 text-cyan-400" /> : <Cable className="w-3 h-3 text-slate-400" />}
                      {iface.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,18%)]">
            {GROUP_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setGroupBy(mode.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  groupBy === mode.id ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <mode.icon className="w-3.5 h-3.5" />
                {mode.name}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused(!paused)}
            className="bg-transparent border-[hsl(222,30%,18%)] text-slate-300 hover:bg-white/5 hover:text-white"
          >
            {paused ? <Play className="w-3.5 h-3.5 mr-1.5" /> : <Pause className="w-3.5 h-3.5 mr-1.5" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-live" />
            <span className="text-xs font-medium text-green-400">{paused ? "PAUSED" : "CAPTURING"}</span>
          </div>
        </div>
      </div>

      {/* Interface Info Bar */}
      {(() => {
        const iface = INTERFACES.find(i => i.id === selectedInterface) || INTERFACES[0];
        return (
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] flex-wrap">
            <div className="flex items-center gap-2">
              {iface.type === "Wireless" ? <Wifi className="w-4 h-4 text-cyan-400" /> : <Cable className="w-4 h-4 text-slate-400" />}
              <span className="text-xs font-mono text-slate-300">{iface.id}</span>
            </div>
            <div className="h-4 w-px bg-[hsl(222,30%,16%)]" />
            <span className="text-xs text-slate-500">IP: <span className="font-mono text-slate-300">{iface.ip}</span></span>
            <div className="h-4 w-px bg-[hsl(222,30%,16%)]" />
            <span className="text-xs text-slate-500">Type: <span className="font-mono text-slate-300">{iface.type}</span></span>
            <div className="h-4 w-px bg-[hsl(222,30%,16%)]" />
            <span className="text-xs text-slate-500">MTU: <span className="font-mono text-slate-300">{iface.mtu}</span></span>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-live" />
              <span className="text-xs text-green-400 font-mono">{iface.status.toUpperCase()}</span>
            </div>
          </div>
        );
      })()}

      {/* Bandwidth Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Bandwidth (Mbps) — Last 60s</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={bandwidth}>
              <defs>
                <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Area type="monotone" dataKey="val" stroke="#06b6d4" fill="url(#bwGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">
            {groupBy === "protocol" ? "Protocol Breakdown" : groupBy === "endpoint" ? "Endpoint Streams" : "Issue Groups"}
          </h3>
          <div className="space-y-2">
            {groups.map((g, i) => (
              <div key={g.name + i} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-slate-400 font-mono truncate" title={g.name}>{g.name}</span>
                <div className="w-20 h-2 rounded-full bg-[hsl(222,30%,14%)]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${packets.length ? (g.count / packets.length) * 100 : 0}%`, backgroundColor: g.color }} />
                </div>
                <span className="w-6 text-xs text-slate-500 font-mono text-right">{g.count}</span>
              </div>
            ))}
            {groups.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      {/* Follow Stream Banner */}
      {followStream && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-sm text-cyan-300 font-medium shrink-0">Following stream:</span>
            <span className="text-xs font-mono text-slate-300 truncate">{followStream}</span>
            <span className="text-xs text-slate-500 shrink-0">({followedPackets.length} packets)</span>
          </div>
          <button
            onClick={() => setFollowStream(null)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
          >
            <X className="w-3.5 h-3.5" /> Unfollow
          </button>
        </div>
      )}

      {/* Packet Table */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(222,30%,14%)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Live Packet Feed
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {followStream ? `${followedPackets.length} in stream` : `${packets.length} packets`}
          </span>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[hsl(222,44%,10%)]">
              <tr className="text-left text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Destination</th>
                <th className="px-4 py-2.5 font-medium">Protocol</th>
                <th className="px-4 py-2.5 font-medium">Size</th>
                <th className="px-4 py-2.5 font-medium">Flag</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium text-right">Stream</th>
              </tr>
            </thead>
            <tbody>
              {displayPackets.slice(0, 50).map((p) => {
                const color = rowColor(p);
                return (
                  <tr
                    key={p.id}
                    className="border-t border-[hsl(222,30%,12%)] transition-colors"
                    style={{ borderLeft: `2px solid ${color}` }}
                  >
                    <td className="px-4 py-2 font-mono text-slate-500">{p.time}</td>
                    <td className="px-4 py-2 font-mono text-cyan-400">{p.src}:{p.srcPort}</td>
                    <td className="px-4 py-2 font-mono text-slate-300">{p.dst}:{p.dstPort}</td>
                    <td className="px-4 py-2">
                      <span className="px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${color}22`, color }}>{p.proto}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-400">{p.size} B</td>
                    <td className="px-4 py-2 font-mono text-slate-500">{p.flag}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.action === "allow" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                        {p.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setFollowStream(followStream === p.convKey ? null : p.convKey)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          followStream === p.convKey
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                        }`}
                      >
                        {followStream === p.convKey ? <><X className="w-3 h-3" /> Unfollow</> : <><Crosshair className="w-3 h-3" /> Follow</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayPackets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-600 text-xs">
                    No packets in this stream yet. Waiting for traffic...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}