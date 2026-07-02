import React, { useState, useEffect } from "react";
import { api } from "@/api/netshieldClient";
import { Globe, Plus, Search, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import SeverityBadge from "@/components/dashboard/SeverityBadge";
import StatusBadge from "@/components/dashboard/StatusBadge";
import moment from "moment";

export default function ThreatIntel() {
  const [iocs, setIocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  const [form, setForm] = useState({
    ioc_type: "ip", ioc_value: "", threat_type: "malware", confidence: 80,
    severity: "medium", source: "", description: ""
  });

  const loadData = () => {
    setLoading(true);
    api.entities.ThreatIntel.list("-created_date", 50)
      .then(setIocs).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!form.ioc_value) return;
    await api.entities.ThreatIntel.create({ ...form, status: "active", first_seen: new Date().toISOString() });
    toast({ title: "IOC added" });
    setShowCreate(false);
    loadData();
  };

  const filtered = iocs.filter(i => {
    if (filterType !== "all" && i.ioc_type !== filterType) return false;
    if (search && !i.ioc_value?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // MITRE ATT&CK tactics for the mapping view
  const mitreTactics = [
    { id: "TA0001", name: "Initial Access", color: "#ef4444" },
    { id: "TA0002", name: "Execution", color: "#f97316" },
    { id: "TA0003", name: "Persistence", color: "#f59e0b" },
    { id: "TA0004", name: "Privilege Escalation", color: "#eab308" },
    { id: "TA0005", name: "Defense Evasion", color: "#84cc16" },
    { id: "TA0006", name: "Credential Access", color: "#22c55e" },
    { id: "TA0007", name: "Discovery", color: "#06b6d4" },
    { id: "TA0008", name: "Lateral Movement", color: "#3b82f6" },
    { id: "TA0009", name: "Collection", color: "#8b5cf6" },
    { id: "TA0010", name: "Exfiltration", color: "#a855f7" },
    { id: "TA0011", name: "Command & Control", color: "#ec4899" },
    { id: "TA0040", name: "Impact", color: "#f43f5e" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">IOC management, threat feeds & MITRE ATT&CK mapping</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white"><Plus className="w-4 h-4 mr-1.5" /> Add IOC</Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(222,44%,8%)] border-[hsl(222,30%,18%)] text-white">
            <DialogHeader><DialogTitle>Add Indicator of Compromise</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.ioc_type} onValueChange={v => setForm({ ...form, ioc_type: v })}>
                  <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                    {["ip", "domain", "url", "hash_md5", "hash_sha256", "email", "file_name"].map(t => <SelectItem key={t} value={t} className="text-white">{t.replace(/_/g, " ").toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.threat_type} onValueChange={v => setForm({ ...form, threat_type: v })}>
                  <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                    {["malware", "phishing", "c2", "botnet", "ransomware", "apt", "exploit", "spam"].map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="IOC Value (IP, domain, hash...)" value={form.ioc_value} onChange={e => setForm({ ...form, ioc_value: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white font-mono" />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                    {["critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Confidence %" value={form.confidence} onChange={e => setForm({ ...form, confidence: Number(e.target.value) })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" />
              </div>
              <Input placeholder="Source (feed name)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" rows={2} />
              <Button onClick={handleCreate} className="w-full bg-cyan-600 hover:bg-cyan-700">Add IOC</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search IOCs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
            <SelectItem value="all" className="text-white">All Types</SelectItem>
            {["ip", "domain", "url", "hash_md5", "hash_sha256"].map(t => <SelectItem key={t} value={t} className="text-white">{t.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* IOC Table */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-[hsl(222,30%,14%)]">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Threat</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ioc => (
                <tr key={ioc.id} className="border-t border-[hsl(222,30%,12%)] hover:bg-white/[0.02]">
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[11px] font-semibold uppercase">{ioc.ioc_type?.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-200 max-w-xs truncate">{ioc.ioc_value}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 capitalize">{ioc.threat_type}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={ioc.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{ioc.confidence}%</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{ioc.source || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={ioc.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{moment(ioc.created_date).fromNow()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No IOCs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MITRE ATT&CK Matrix */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" /> MITRE ATT&CK Coverage
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {mitreTactics.map(t => (
            <div key={t.id} className="p-3 rounded-lg border border-[hsl(222,30%,16%)] hover:border-[hsl(222,30%,22%)] transition-colors cursor-pointer group">
              <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: t.color }} />
              <p className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">{t.name}</p>
              <p className="text-[10px] text-slate-600 font-mono">{t.id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}