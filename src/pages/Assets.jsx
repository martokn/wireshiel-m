import React, { useState, useEffect } from "react";
import { api } from "@/api/netshieldClient";
import { Server, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import SeverityBadge from "@/components/dashboard/SeverityBadge";
import StatusBadge from "@/components/dashboard/StatusBadge";

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  const [form, setForm] = useState({
    hostname: "", ip_address: "", asset_type: "server", os: "",
    department: "", criticality: "medium", status: "active", risk_score: 0
  });

  const loadData = () => {
    setLoading(true);
    api.entities.Asset.list("-created_date", 50)
      .then(setAssets).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!form.hostname || !form.ip_address) return;
    await api.entities.Asset.create(form);
    toast({ title: "Asset added" });
    setShowCreate(false);
    setForm({ hostname: "", ip_address: "", asset_type: "server", os: "", department: "", criticality: "medium", status: "active", risk_score: 0 });
    loadData();
  };

  const handleDelete = async (id) => {
    await api.entities.Asset.delete(id);
    toast({ title: "Asset removed" });
    loadData();
  };

  const filtered = assets.filter(a => {
    if (filterType !== "all" && a.asset_type !== filterType) return false;
    if (search && !a.hostname?.toLowerCase().includes(search.toLowerCase()) && !a.ip_address?.includes(search)) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage network assets and their security posture</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white"><Plus className="w-4 h-4 mr-1.5" /> Add Asset</Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(222,44%,8%)] border-[hsl(222,30%,18%)] text-white">
            <DialogHeader><DialogTitle>Add Network Asset</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Hostname" value={form.hostname} onChange={e => setForm({ ...form, hostname: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" />
              <Input placeholder="IP Address" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white font-mono" />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.asset_type} onValueChange={v => setForm({ ...form, asset_type: v })}>
                  <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                    {["server", "workstation", "router", "switch", "firewall", "iot", "mobile", "cloud_instance", "container"].map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.criticality} onValueChange={v => setForm({ ...form, criticality: v })}>
                  <SelectTrigger className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
                    {["critical", "high", "medium", "low"].map(c => <SelectItem key={c} value={c} className="text-white capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Operating System" value={form.os} onChange={e => setForm({ ...form, os: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" />
                <Input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white" />
              </div>
              <Button onClick={handleCreate} className="w-full bg-cyan-600 hover:bg-cyan-700">Add Asset</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,16%)] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,44%,10%)] border-[hsl(222,30%,18%)]">
            <SelectItem value="all" className="text-white">All Types</SelectItem>
            {["server", "workstation", "router", "switch", "firewall", "iot", "cloud_instance"].map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(asset => (
          <div key={asset.id} className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-4 hover:border-[hsl(222,30%,20%)] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-semibold text-white">{asset.hostname}</h3>
              </div>
              <button onClick={() => handleDelete(asset.id)} className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">IP</span><span className="font-mono text-cyan-400">{asset.ip_address}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-300 capitalize">{asset.asset_type?.replace(/_/g, " ")}</span></div>
              {asset.os && <div className="flex justify-between"><span className="text-slate-500">OS</span><span className="text-slate-300">{asset.os}</span></div>}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={asset.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Criticality</span>
                <SeverityBadge severity={asset.criticality} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Risk Score</span>
                <span className="font-mono font-bold" style={{ color: (asset.risk_score || 0) >= 70 ? "#ef4444" : (asset.risk_score || 0) >= 40 ? "#f59e0b" : "#22c55e" }}>
                  {asset.risk_score || 0}/100
                </span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">No assets found. Add your first asset.</div>
        )}
      </div>
    </div>
  );
}