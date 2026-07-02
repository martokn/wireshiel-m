import React, { useState, useEffect } from "react";
import { api } from "@/api/netshieldClient";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/dashboard/StatusBadge";
import moment from "moment";

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProto, setFilterProto] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    api.entities.NetworkSession.list("-created_date", 50)
      .then(setSessions).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter(s => {
    if (filterProto !== "all" && s.protocol !== filterProto) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (search && !s.source_ip?.includes(search) && !s.destination_ip?.includes(search)) return false;
    return true;
  });

  const formatBytes = (b) => {
    if (!b) return "0 B";
    if (b > 1073741824) return (b / 1073741824).toFixed(1) + " GB";
    if (b > 1048576) return (b / 1048576).toFixed(1) + " MB";
    if (b > 1024) return (b / 1024).toFixed(1) + " KB";
    return b + " B";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Session Explorer</h1>
        <p className="text-sm text-slate-500 mt-0.5">Deep dive into network sessions and packet analysis</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search by IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white" />
        </div>
        <Select value={filterProto} onValueChange={setFilterProto}>
          <SelectTrigger className="w-28 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
            <SelectItem value="all" className="text-white">All Proto</SelectItem>
            {["TCP", "UDP", "HTTP", "HTTPS", "DNS", "SSH", "FTP", "SMTP"].map(p => <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
            <SelectItem value="all" className="text-white">All Status</SelectItem>
            {["active", "closed", "blocked", "suspicious"].map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-[hsl(222,30%,14%)]">
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Protocol</th>
                <th className="px-4 py-3 font-medium">Bytes In</th>
                <th className="px-4 py-3 font-medium">Bytes Out</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-[hsl(222,30%,12%)] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-cyan-400">{s.source_ip}:{s.source_port || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{s.destination_ip}:{s.destination_port || "—"}</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 rounded bg-[hsl(222,30%,14%)] text-slate-300 text-xs">{s.protocol}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-green-400">{formatBytes(s.bytes_in)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">{formatBytes(s.bytes_out)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.duration ? `${s.duration}s` : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.action === "allow" ? "bg-green-500/15 text-green-400" : s.action === "block" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {s.action?.toUpperCase() || "ALLOW"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: (s.risk_score || 0) >= 70 ? "#ef4444" : (s.risk_score || 0) >= 40 ? "#f59e0b" : "#22c55e" }}>
                    {s.risk_score || 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{moment(s.created_date).fromNow()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500">No sessions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}