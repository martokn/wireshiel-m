import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/api/netshieldClient";
import {
  Gauge, Activity, TrendingUp, TrendingDown, Signal, HardDrive,
  ArrowDownToLine, ArrowUpFromLine, Clock, Zap, ArrowUpDown
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Cell, CartesianGrid
} from "recharts";

const INTERFACES = [
  { id: "eth0", name: "eth0", ip: "192.168.1.10", utilization: 68 },
  { id: "wlan0", name: "wlan0", ip: "192.168.1.22", utilization: 42 },
  { id: "eth1", name: "eth1 (Uplink)", ip: "203.0.113.5", utilization: 84 },
  { id: "tun0", name: "tun0 (VPN)", ip: "10.8.0.1", utilization: 23 },
];

const formatBytes = (b) => {
  if (!b) return "0 B";
  if (b >= 1e12) return (b / 1e12).toFixed(2) + " TB";
  if (b >= 1e9) return (b / 1e9).toFixed(2) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(1) + " KB";
  return b + " B";
};

const buildBandwidth = (sessions) => {
  const hours = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date();
    h.setHours(h.getHours() - i, 0, 0, 0);
    hours.push({ key: h.getTime(), t: h.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), inbound: 0, outbound: 0 });
  }
  sessions.forEach((s) => {
    if (!s.created_date) return;
    const t = new Date(s.created_date).getTime();
    const bucket = hours.find((b) => t >= b.key && t < b.key + 3600000);
    if (bucket) {
      bucket.inbound += s.bytes_in || 0;
      bucket.outbound += s.bytes_out || 0;
    }
  });
  return hours;
};

const buildTopConsumers = (sessions) => {
  const map = {};
  sessions.forEach((s) => {
    const ip = s.source_ip;
    if (!ip) return;
    const bytes = (s.bytes_in || 0) + (s.bytes_out || 0);
    if (!map[ip]) map[ip] = { ip, hostname: s.application || ip, proto: s.protocol || "—", bytes: 0 };
    map[ip].bytes += bytes;
  });
  const arr = Object.values(map).sort((a, b) => b.bytes - a.bytes).slice(0, 6);
  const max = arr.length ? arr[0].bytes : 1;
  return arr.map((c) => ({ ...c, usagePct: max > 0 ? Math.round((c.bytes / max) * 100) : 0 }));
};

const timeLabel = (offsetMin) => {
  const d = new Date(Date.now() - offsetMin * 60000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const genInitial = (points, base, variance) =>
  Array.from({ length: points }, (_, i) => ({
    t: timeLabel((points - 1 - i) * 15),
    v: base + Math.floor(Math.random() * variance - variance / 2),
  }));

export default function PerformanceMonitor() {
  const [sessions, setSessions] = useState([]);
  const [latency, setLatency] = useState(() => genInitial(40, 24, 18));
  const [packetLoss, setPacketLoss] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      t: timeLabel((23 - i) * 30),
      v: parseFloat((Math.random() * 1.2).toFixed(2)),
    }))
  );
  const [live, setLive] = useState({ latency: 23, loss: 0.3, util: 68 });

  useEffect(() => {
    api.entities.NetworkSession.list("-created_date", 200)
      .then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const lat = Math.floor(12 + Math.random() * 36);
      const loss = parseFloat((Math.random() * 1.4).toFixed(2));
      setLive({ latency: lat, loss, util: Math.floor(40 + Math.random() * 55) });
      setLatency(prev => [...prev.slice(1), { t: timeLabel(0), v: lat }]);
      setPacketLoss(prev => [...prev.slice(1), { t: timeLabel(0), v: loss }]);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const bandwidth = useMemo(() => buildBandwidth(sessions), [sessions]);
  const topConsumers = useMemo(() => buildTopConsumers(sessions), [sessions]);
  const totalBytes = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.bytes_in || 0) + (s.bytes_out || 0), 0),
    [sessions]
  );
  const activeSessions = useMemo(() => sessions.filter((s) => s.status === "active").length, [sessions]);
  const blockedSessions = useMemo(() => sessions.filter((s) => s.action === "blocked").length, [sessions]);

  const avgLatency = Math.round(latency.reduce((s, p) => s + p.v, 0) / latency.length);
  const avgLoss = (packetLoss.reduce((s, p) => s + p.v, 0) / packetLoss.length).toFixed(2);

  const tooltipStyle = {
    background: "hsl(222,44%,10%)",
    border: "1px solid hsl(222,30%,20%)",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Bandwidth, latency, packet loss, and interface utilization</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-live" />
          <span className="text-xs font-medium text-green-400">MONITORING</span>
        </div>
      </div>

      {/* Live Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Traffic", value: formatBytes(totalBytes), sub: `${sessions.length} sessions`, icon: ArrowUpDown, color: "cyan" },
          { label: "Avg Latency", value: `${avgLatency} ms`, sub: `Now ${live.latency} ms`, icon: Clock, color: "blue" },
          { label: "Packet Loss", value: `${avgLoss}%`, sub: `Now ${live.loss}%`, icon: TrendingDown, color: live.loss > 1 ? "red" : "green" },
          { label: "Avg Utilization", value: `${live.util}%`, sub: "Across interfaces", icon: Gauge, color: "purple" },
        ].map((s, i) => (
          <div key={i} className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{s.label}</span>
              <s.icon className={`w-4 h-4 text-${s.color}-500`} />
            </div>
            <p className="text-2xl font-bold font-mono text-white">{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Bandwidth + Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Traffic Volume</h3>
              <p className="text-xs text-slate-500 mt-0.5">Inbound vs Outbound bytes — last 24 hours</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-cyan-400"><ArrowDownToLine className="w-3 h-3" /> In</span>
              <span className="flex items-center gap-1 text-blue-400"><ArrowUpFromLine className="w-3 h-3" /> Out</span>
            </div>
          </div>
          {sessions.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={bandwidth}>
                <defs>
                  <linearGradient id="bwIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bwOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => formatBytes(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBytes(v)} />
                <Area type="monotone" dataKey="inbound" stroke="#06b6d4" fill="url(#bwIn)" strokeWidth={2} dot={false} name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#3b82f6" fill="url(#bwOut)" strokeWidth={2} dot={false} name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">No session traffic recorded yet</div>
          )}
        </div>

        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Latency</h3>
              <p className="text-xs text-slate-500 mt-0.5">Round-trip time (ms)</p>
            </div>
            <Signal className="w-4 h-4 text-blue-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={latency}>
              <CartesianGrid stroke="hsl(222,30%,12%)" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Packet Loss + Interface Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Packet Loss (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={packetLoss}>
              <CartesianGrid stroke="hsl(222,30%,12%)" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => v + "%"} />
              <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                {packetLoss.map((entry, i) => (
                  <Cell key={i} fill={entry.v > 0.8 ? "#ef4444" : entry.v > 0.4 ? "#f59e0b" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" /> Interface Utilization
          </h3>
          <div className="space-y-4">
            {INTERFACES.map(iface => {
              const util = Math.min(iface.utilization + Math.floor(Math.random() * 8 - 4), 100);
              const color = util > 85 ? "#ef4444" : util > 60 ? "#f59e0b" : "#22c55e";
              return (
                <div key={iface.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-300">{iface.name}</span>
                      <span className="text-[10px] text-slate-600 font-mono">{iface.ip}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color }}>{util}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[hsl(222,30%,14%)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${util}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-[hsl(222,30%,14%)]">
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Normal (&lt;60%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> High (60-85%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical (&gt;85%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Network Consumers */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(222,30%,14%)]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Top Network Consumers
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[hsl(222,44%,6%)]">
              <tr className="text-left text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Host</th>
                <th className="px-4 py-2.5 font-medium">IP Address</th>
                <th className="px-4 py-2.5 font-medium">Protocol</th>
                <th className="px-4 py-2.5 font-medium">Total Bytes</th>
                <th className="px-4 py-2.5 font-medium">Usage</th>
              </tr>
            </thead>
            <tbody>
              {topConsumers.map((c, i) => (
                <tr key={i} className="border-t border-[hsl(222,30%,12%)] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-300">{c.hostname}</td>
                  <td className="px-4 py-2.5 font-mono text-cyan-400">{c.ip}</td>
                  <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 rounded bg-[hsl(222,30%,14%)] text-slate-300">{c.proto}</span></td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">{formatBytes(c.bytes)}</td>
                  <td className="px-4 py-2.5 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[hsl(222,30%,14%)] overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${c.usagePct}%` }} />
                      </div>
                      <span className="text-slate-500 font-mono w-8 text-right">{c.usagePct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {topConsumers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-600">No session data to rank</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Trends Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: "Total Traffic Recorded", value: formatBytes(totalBytes), trend: `${sessions.length} sessions`, up: true },
          { icon: Activity, label: "Active Sessions", value: activeSessions, trend: `${sessions.length} total`, up: true },
          { icon: TrendingDown, label: "Blocked Sessions", value: blockedSessions, trend: `${sessions.length} total`, up: true },
        ].map((s, i) => (
          <div key={i} className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{s.label}</span>
              <s.icon className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold font-mono text-white">{s.value}</p>
              <span className={`text-xs font-mono ${s.up ? "text-green-400" : "text-blue-400"}`}>{s.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}