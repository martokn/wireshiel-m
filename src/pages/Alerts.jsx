import React, { useState, useEffect } from "react";
import { api } from "@/api/netshieldClient";
import { Bell, Plus, Filter, Search, ChevronDown, X, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import SeverityBadge from "@/components/dashboard/SeverityBadge";
import StatusBadge from "@/components/dashboard/StatusBadge";
import moment from "moment";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("alerts");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", description: "", severity: "medium", category: "intrusion",
    source_ip: "", destination_ip: "", protocol: "", risk_score: 50,
    detection_engine: "suricata"
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.entities.Alert.list("-created_date", 50),
      api.entities.Incident.list("-created_date", 50),
    ]).then(([a, i]) => { setAlerts(a); setIncidents(i); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!form.title) return;
    await api.entities.Alert.create({ ...form, status: "new" });
    toast({ title: "Alert created", description: form.title });
    setShowCreate(false);
    setForm({ title: "", description: "", severity: "medium", category: "intrusion", source_ip: "", destination_ip: "", protocol: "", risk_score: 50, detection_engine: "suricata" });
    loadData();
  };

  const updateStatus = async (id, status) => {
    await api.entities.Alert.update(id, { status });
    toast({ title: "Alert updated" });
    loadData();
    setSelected(null);
  };

  const filtered = alerts.filter(a => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchQuery && !a.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !a.source_ip?.includes(searchQuery)) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts & Incidents</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage security alerts and incident response</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(222,44%,8%)] border-[hsl(222,30%,18%)] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Alert title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" rows={3} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                    {["critical", "high", "medium", "low", "info"].map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                    {["intrusion", "malware", "dos", "web_attack", "data_exfiltration", "brute_force", "anomaly", "policy_violation", "reconnaissance", "lateral_movement"].map(c => <SelectItem key={c} value={c} className="text-white capitalize">{c.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Source IP" value={form.source_ip} onChange={e => setForm({ ...form, source_ip: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white font-mono" />
                <Input placeholder="Destination IP" value={form.destination_ip} onChange={e => setForm({ ...form, destination_ip: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white font-mono" />
              </div>
              <Select value={form.detection_engine} onValueChange={v => setForm({ ...form, detection_engine: v })}>
                <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                  {["suricata", "zeek", "waf", "ai_engine", "threat_intel", "manual"].map(e => <SelectItem key={e} value={e} className="text-white capitalize">{e.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} className="w-full bg-cyan-600 hover:bg-cyan-700">Create Alert</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[hsl(222,30%,10%)] rounded-lg w-fit">
        {[{ key: "alerts", label: "Alerts", count: alerts.length }, { key: "incidents", label: "Incidents", count: incidents.length }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-cyan-500/15 text-cyan-400" : "text-slate-400 hover:text-white"}`}>
            {t.label} <span className="ml-1 text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search alerts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white" />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-32 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
            <SelectItem value="all" className="text-white">All Severity</SelectItem>
            {["critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
            <SelectItem value="all" className="text-white">All Status</SelectItem>
            {["new", "investigating", "resolved", "escalated", "false_positive"].map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-[hsl(222,30%,14%)]">
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Engine</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(alert => (
                <tr key={alert.id} className="border-t border-[hsl(222,30%,12%)] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-4 py-3 text-slate-200 max-w-xs truncate">{alert.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan-400">{alert.source_ip || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 capitalize">{alert.category?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">{alert.detection_engine?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{moment(alert.created_date).fromNow()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {alert.status !== "resolved" && (
                        <button onClick={() => updateStatus(alert.id, "resolved")} className="p-1 rounded hover:bg-green-500/10 text-green-500" title="Resolve">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {alert.status !== "investigating" && alert.status !== "resolved" && (
                        <button onClick={() => updateStatus(alert.id, "investigating")} className="p-1 rounded hover:bg-amber-500/10 text-amber-500" title="Investigate">
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No alerts match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}