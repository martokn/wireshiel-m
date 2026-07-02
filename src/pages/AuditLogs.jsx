import React, { useState, useEffect } from "react";
import { api } from "@/api/netshieldClient";
import { ClipboardList, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import moment from "moment";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.entities.AuditLog.list("-created_date", 50)
      .then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => {
    if (!search) return true;
    return l.action?.toLowerCase().includes(search.toLowerCase()) ||
           l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
           l.details?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">System audit trail and administrative actions</p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white" />
      </div>

      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-[hsl(222,30%,14%)]">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="border-t border-[hsl(222,30%,12%)] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{moment(log.created_date).format("YYYY-MM-DD HH:mm:ss")}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{log.user_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">{log.user_role || "—"}</td>
                  <td className="px-4 py-3 text-xs text-cyan-400">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{log.resource_type || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{log.details || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.ip_address || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      log.result === "success" ? "bg-green-500/15 text-green-400" :
                      log.result === "failure" ? "bg-red-500/15 text-red-400" :
                      "bg-amber-500/15 text-amber-400"
                    }`}>
                      {log.result?.toUpperCase() || "—"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No audit logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}