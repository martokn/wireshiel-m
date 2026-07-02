import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/api/netshieldClient";
import {
  Network, Activity, Shield, AlertTriangle, TrendingUp,
  ArrowUpDown, Eye, Zap, Lock, Globe, Radio
} from "lucide-react";
import PacketCapture from "@/components/dashboard/PacketCapture";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";

const PROTOCOL_META = {
  HTTPS:  { color: "#06b6d4", port: 443,  risk: 15, desc: "Encrypted web traffic" },
  HTTP:   { color: "#8b5cf6", port: 80,   risk: 55, desc: "Unencrypted web traffic" },
  DNS:    { color: "#f59e0b", port: 53,   risk: 40, desc: "Name resolution (tunneling risk)" },
  SSH:    { color: "#22c55e", port: 22,   risk: 35, desc: "Secure shell remote access" },
  FTP:    { color: "#ef4444", port: 21,   risk: 75, desc: "Unencrypted file transfer" },
  SMTP:   { color: "#ec4899", port: 25,   risk: 50, desc: "Email transmission" },
  SMB:    { color: "#f97316", port: 445,  risk: 65, desc: "File sharing (lateral movement vector)" },
  TLS:    { color: "#6366f1", port: 443,  risk: 20, desc: "Transport layer security" },
  TCP:    { color: "#3b82f6", port: 0,   risk: 30, desc: "Connection-oriented transport" },
  UDP:    { color: "#a855f7", port: 0,   risk: 35, desc: "Connectionless transport" },
};

const TREND_PROTOS = ["HTTPS", "DNS", "SSH", "HTTP", "SMB", "SMTP"];
const buildTrend = (sessions) => {
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const h = new Date();
    h.setHours(h.getHours() - i, 0, 0, 0);
    const start = h.getTime();
    const entry = { time: h.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    TREND_PROTOS.forEach(p => { entry[p] = 0; });
    sessions.forEach(s => {
      if (!s.created_date) return;
      const t = new Date(s.created_date).getTime();
      if (t >= start && t < start + 3600000 && entry[s.protocol] !== undefined) {
        entry[s.protocol]++;
      }
    });
    data.push(entry);
  }
  return data;
};

const analysisTactics = [
  {
    icon: Eye,
    title: "Deep Packet Inspection (DPI)",
    severity: "info",
    tactic: "Inspect packet payloads beyond port/protocol headers to detect hidden threats, malware signatures, and policy violations within allowed protocols.",
    recommendation: "Enable DPI on all ingress traffic. Flag payloads mismatching their declared protocol (e.g., non-HTTP on port 80).",
  },
  {
    icon: AlertTriangle,
    title: "Protocol Anomaly Detection",
    severity: "high",
    tactic: "Compare real-time protocol volume against 30-day baselines. Spike in DNS, SMB, or FTP traffic often indicates C2 communication, lateral movement, or data exfiltration.",
    recommendation: "Set threshold alerts: DNS >5x baseline, SMB traffic outside business hours, FTP from non-IT segments.",
  },
  {
    icon: Lock,
    title: "Unencrypted Protocol Audit",
    severity: "critical",
    tactic: "Identify hosts still using HTTP, FTP, or Telnet instead of encrypted alternatives. These expose credentials and data to interception.",
    recommendation: "Enforce TLS migration. Block port 80 at the firewall except for redirects. Decommission FTP in favor of SFTP.",
  },
  {
    icon: TrendingUp,
    title: "DNS Tunneling Detection",
    severity: "high",
    tactic: "Analyze DNS query lengths, frequency, and TXT record usage. Long subdomains and high entropy indicate data exfiltration via DNS tunneling.",
    recommendation: "Monitor DNS queries >52 characters, high TXT record volume, and unusual query frequencies per host.",
  },
  {
    icon: Zap,
    title: "Lateral Movement via SMB",
    severity: "critical",
    tactic: "SMB traffic between workstations (east-west) is a strong indicator of lateral movement. Legitimate SMB should flow client-to-server only.",
    recommendation: "Segment the network. Block SMB between workstation subnets. Alert on any SMB from IoT devices.",
  },
  {
    icon: Globe,
    title: "Geographic Traffic Profiling",
    severity: "medium",
    tactic: "Correlate protocol usage with destination geolocation. Unexpected countries for specific protocols (e.g., SSH to high-risk regions) warrant investigation.",
    recommendation: "Build geofencing rules. Alert on SSH/RDP connections to known safe-haven countries for threat actors.",
  },
];

const severityStyles = {
  critical: "border-red-500/30 bg-red-500/5 text-red-400",
  high: "border-orange-500/30 bg-orange-500/5 text-orange-400",
  medium: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  info: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(222,44%,10%)] border border-[hsl(222,30%,20%)] rounded-lg p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()} sessions
        </p>
      ))}
    </div>
  );
};

export default function ProtocolAnalysis() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const trendData = useMemo(() => buildTrend(sessions), [sessions]);

  useEffect(() => {
    api.entities.NetworkSession.list("-created_date", 100)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build protocol stats from real session data only
  const protocolStats = useMemo(() => {
    const stats = {};
    Object.keys(PROTOCOL_META).forEach(p => {
      stats[p] = { name: p, sessions: 0, bytesIn: 0, bytesOut: 0, risk: PROTOCOL_META[p].risk, color: PROTOCOL_META[p].color };
    });
    sessions.forEach(s => {
      const proto = s.protocol || "Other";
      if (!stats[proto]) {
        stats[proto] = { name: proto, sessions: 0, bytesIn: 0, bytesOut: 0, risk: 30, color: "#64748b" };
      }
      stats[proto].sessions++;
      stats[proto].bytesIn += s.bytes_in || 0;
      stats[proto].bytesOut += s.bytes_out || 0;
    });
    return Object.values(stats)
      .map(p => ({ ...p, totalBytes: p.bytesIn + p.bytesOut }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [sessions]);

  const radarData = protocolStats.slice(0, 8).map(p => ({
    protocol: p.name,
    volume: Math.round(p.sessions / 100),
    risk: p.risk,
  }));

  const totalSessions = protocolStats.reduce((s, p) => s + p.sessions, 0);
  const totalBytes = protocolStats.reduce((s, p) => s + p.totalBytes, 0);
  const highRiskProtos = protocolStats.filter(p => p.risk >= 60);

  const formatBytes = (b) => {
    if (b > 1e12) return (b / 1e12).toFixed(1) + " TB";
    if (b > 1e9) return (b / 1e9).toFixed(1) + " GB";
    if (b > 1e6) return (b / 1e6).toFixed(1) + " MB";
    if (b > 1e3) return (b / 1e3).toFixed(1) + " KB";
    return b + " B";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Protocol Analysis</h1>
          <p className="text-sm text-slate-500 mt-0.5">Network protocol breakdown, trends, and security analysis tactics</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400">{totalSessions.toLocaleString()} Sessions</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Protocols Detected", value: protocolStats.filter(p => p.sessions > 0).length, icon: Network, color: "cyan" },
          { label: "Total Sessions", value: totalSessions.toLocaleString(), icon: Activity, color: "blue" },
          { label: "Total Bandwidth", value: formatBytes(totalBytes), icon: ArrowUpDown, color: "purple" },
          { label: "High-Risk Protocols", value: highRiskProtos.length, icon: Shield, color: "red" },
        ].map((s, i) => (
          <div key={i} className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{s.label}</span>
              <s.icon className={`w-4 h-4 text-${s.color}-500`} />
            </div>
            <p className="text-2xl font-bold font-mono text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Live Packet Capture — Wireshark-style */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Traffic Flow Monitor</h2>
          <span className="text-xs text-slate-500">— Click any protocol filter to see packets flowing in/out</span>
        </div>
        <PacketCapture />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Trend */}
        <div className="lg:col-span-2 bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Protocol Traffic Trends</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sessions per protocol — last 12 hours</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <defs>
                {["HTTPS", "DNS", "SSH", "HTTP", "SMB", "SMTP"].map(p => (
                  <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PROTOCOL_META[p].color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={PROTOCOL_META[p].color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomTooltip />} />
              {["HTTPS", "DNS", "SSH", "HTTP", "SMB", "SMTP"].map(p => (
                <Area key={p} type="monotone" dataKey={p} stroke={PROTOCOL_META[p].color} fill={`url(#grad-${p})`} strokeWidth={1.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 flex-wrap mt-3">
            {["HTTPS", "DNS", "SSH", "HTTP", "SMB", "SMTP"].map(p => (
              <span key={p} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: PROTOCOL_META[p].color }} />
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Protocol Distribution Pie */}
        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Protocol Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={protocolStats.filter(p => p.sessions > 0)}
                cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}
                dataKey="sessions" strokeWidth={0}
              >
                {protocolStats.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(222,44%,10%)", border: "1px solid hsl(222,30%,20%)", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v) => v.toLocaleString()}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3 max-h-32 overflow-y-auto">
            {protocolStats.filter(p => p.sessions > 0).map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-400">{p.name}</span>
                </span>
                <span className="font-mono text-slate-300">{((p.sessions / totalSessions) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Sessions & Bandwidth by Protocol</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={protocolStats.filter(p => p.sessions > 0)}>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={{ background: "hsl(222,44%,10%)", border: "1px solid hsl(222,30%,20%)", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v) => v.toLocaleString()}
              />
              <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                {protocolStats.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Volume vs Risk Profile</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(222,30%,16%)" />
              <PolarAngleAxis dataKey="protocol" tick={{ fill: "#64748b", fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} />
              <Radar name="Volume" dataKey="volume" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              <Radar name="Risk" dataKey="risk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Protocol Detail Table */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(222,30%,14%)]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" /> Protocol Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-[hsl(222,30%,14%)]">
                <th className="px-4 py-3 font-medium">Protocol</th>
                <th className="px-4 py-3 font-medium">Port</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Sessions</th>
                <th className="px-4 py-3 font-medium">Bytes In</th>
                <th className="px-4 py-3 font-medium">Bytes Out</th>
                <th className="px-4 py-3 font-medium">Total BW</th>
                <th className="px-4 py-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {protocolStats.filter(p => p.sessions > 0).map(p => (
                <tr key={p.name} className="border-t border-[hsl(222,30%,12%)] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-white">{p.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{PROTOCOL_META[p.name]?.port || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{PROTOCOL_META[p.name]?.desc || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan-400">{p.sessions.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-green-400">{formatBytes(p.bytesIn)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">{formatBytes(p.bytesOut)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{formatBytes(p.totalBytes)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      p.risk >= 70 ? "border-red-500/30 bg-red-500/10 text-red-400" :
                      p.risk >= 50 ? "border-orange-500/30 bg-orange-500/10 text-orange-400" :
                      p.risk >= 30 ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
                      "border-green-500/30 bg-green-500/10 text-green-400"
                    }`}>
                      {p.risk >= 70 ? "Critical" : p.risk >= 50 ? "High" : p.risk >= 30 ? "Medium" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Tactics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Analysis Tactics & Security Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisTactics.map((t, i) => (
            <div
              key={i}
              className={`rounded-xl border p-5 transition-all hover:scale-[1.01] ${severityStyles[t.severity]}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <t.icon className="w-5 h-5" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                  severityStyles[t.severity]
                }`}>
                  {t.severity}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{t.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{t.tactic}</p>
              <div className="pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Recommendation</p>
                <p className="text-xs text-slate-300 leading-relaxed">{t.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}