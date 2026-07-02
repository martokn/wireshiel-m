import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/api/netshieldClient";
import { Activity, Shield, AlertTriangle, Server, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import RecentAlerts from "@/components/dashboard/RecentAlerts";
import TopTalkers from "@/components/dashboard/TopTalkers";
import RiskGauge from "@/components/dashboard/RiskGauge";

const PROTO_COLORS = {
  HTTPS: "#06b6d4", HTTP: "#8b5cf6", DNS: "#f59e0b", SSH: "#22c55e",
  SMTP: "#ec4899", FTP: "#ef4444", TLS: "#6366f1", TCP: "#3b82f6",
  UDP: "#a855f7", SMB: "#f97316",
};

const formatBytes = (b) => {
  if (!b) return "0 B";
  if (b >= 1e12) return (b / 1e12).toFixed(2) + " TB";
  if (b >= 1e9) return (b / 1e9).toFixed(2) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(1) + " KB";
  return b + " B";
};

const bucketTraffic = (sessions) => {
  const hours = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date();
    h.setHours(h.getHours() - i, 0, 0, 0);
    hours.push({
      key: h.getTime(),
      time: h.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      inbound: 0,
      outbound: 0,
    });
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

const protocolDistribution = (sessions) => {
  const counts = {};
  sessions.forEach((s) => {
    const p = s.protocol || "Other";
    counts[p] = (counts[p] || 0) + 1;
  });
  const total = sessions.length || 1;
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      count,
      color: PROTO_COLORS[name] || "#64748b",
    }))
    .sort((a, b) => b.count - a.count);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(222,44%,10%)] border border-[hsl(222,30%,20%)] rounded-lg p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {formatBytes(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function Overview() {
  const [alerts, setAlerts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.entities.Alert.list("-created_date", 50),
      api.entities.NetworkSession.list("-created_date", 50),
      api.entities.Asset.list("-created_date", 50),
    ]).then(([a, s, as]) => {
      setAlerts(a);
      setSessions(s);
      setAssets(as);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const trafficData = useMemo(() => bucketTraffic(sessions), [sessions]);
  const protocolData = useMemo(() => protocolDistribution(sessions), [sessions]);
  const totalBytes = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.bytes_in || 0) + (s.bytes_out || 0), 0),
    [sessions]
  );
  const blockedCount = useMemo(
    () => sessions.filter((s) => s.action === "blocked").length,
    [sessions]
  );

  const criticalAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "high").length;
  const activeAssets = assets.filter((a) => a.status === "active").length;
  const avgRisk = alerts.length > 0
    ? Math.round(alerts.reduce((s, a) => s + (a.risk_score || 0), 0) / alerts.length)
    : 0;

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
          <h1 className="text-2xl font-bold text-white">Security Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time threat monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse-live" />
          <span className="text-xs font-medium text-cyan-400">LIVE</span>
        </div>
      </div>

      {/* Stat Cards — all derived from real DB records */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Traffic" value={formatBytes(totalBytes)} change={`${sessions.length} sessions`} icon={Activity} color="cyan" />
        <StatCard label="Security Alerts" value={alerts.length} change={`${criticalAlerts} critical/high`} changeType={criticalAlerts > 0 ? "up" : null} icon={AlertTriangle} color="amber" />
        <StatCard label="High Risk Hosts" value={assets.filter((a) => (a.risk_score || 0) > 70).length} change={`${assets.length} total assets`} icon={Shield} color="red" />
        <StatCard label="Blocked Sessions" value={blockedCount} change={`${sessions.length} total sessions`} icon={Zap} color="green" />
        <StatCard label="Active Assets" value={activeAssets} change={`${assets.length} total`} icon={Server} color="purple" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart — from real session bytes bucketed by hour */}
        <div className="lg:col-span-2 bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Network Traffic</h3>
              <p className="text-xs text-slate-500 mt-0.5">Inbound vs Outbound bytes — last 24 hours</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded bg-cyan-500" /> Inbound</span>
              <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-0.5 rounded bg-purple-500" /> Outbound</span>
            </div>
          </div>
          {sessions.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => formatBytes(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="inbound" stroke="#06b6d4" fill="url(#inGrad)" strokeWidth={2} name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#8b5cf6" fill="url(#outGrad)" strokeWidth={2} name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
              No session traffic recorded yet
            </div>
          )}
        </div>

        {/* Risk Score & Protocol Distribution */}
        <div className="space-y-6">
          <RiskGauge score={avgRisk} />
          <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Protocol Distribution</h3>
            {protocolData.length > 0 ? (
              <div className="flex items-center gap-4">
                <PieChart width={100} height={100}>
                  <Pie data={protocolData} cx={50} cy={50} innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {protocolData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="flex-1 space-y-1.5">
                  {protocolData.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-400">{p.name}</span>
                      </span>
                      <span className="font-mono text-slate-300">{p.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 text-center py-6">No protocol data</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentAlerts alerts={alerts.slice(0, 8)} />
        </div>
        <TopTalkers sessions={sessions} />
      </div>
    </div>
  );
}