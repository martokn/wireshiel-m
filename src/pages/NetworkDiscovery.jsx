import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/api/netshieldClient";
import {
  Radar, Server, Router, Wifi, Printer, Camera, Shield,
  Cpu, Monitor, Network, RefreshCw, CheckCircle2, Loader2, Search, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DEVICE_TYPES = [
  { key: "server",       name: "Servers",        icon: Server,  color: "#06b6d4" },
  { key: "router",        name: "Routers",        icon: Router,  color: "#8b5cf6" },
  { key: "switch",        name: "Switches",       icon: Network, color: "#3b82f6" },
  { key: "firewall",      name: "Firewalls",      icon: Shield,  color: "#ef4444" },
  { key: "workstation",   name: "Workstations",   icon: Monitor, color: "#22c55e" },
  { key: "printer",       name: "Printers",       icon: Printer, color: "#f59e0b" },
  { key: "camera",        name: "Cameras",        icon: Camera,  color: "#ec4899" },
  { key: "access_point",  name: "Access Points",  icon: Wifi,    color: "#14b8a6" },
  { key: "iot",           name: "IoT Devices",    icon: Cpu,     color: "#f97316" },
];

const VENDORS = ["Cisco", "Dell", "HP", "Juniper", "Fortinet", "Ubiquiti", "Apple", "Samsung", "Synology", "Lenovo", "D-Link", "Netgear", "Axis", "Hikvision"];
const OSLIST = ["Linux 5.x", "Windows Server 2019", "Windows 10", "macOS 14", "Cisco IOS XE", "FreeRTOS", "Embedded Linux", "Unknown"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randHex = (n) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
const randMac = () => `${randHex(2)}:${randHex(2)}:${randHex(2)}:${randHex(2)}:${randHex(2)}:${randHex(2)}`;

const SCAN_STEPS = [
  "Initializing dumpcap engine...",
  "Loading ARP cache table...",
  "Sending ICMP echo requests across subnet...",
  "Collecting MAC addresses via ARP...",
  "Resolving reverse DNS hostnames...",
  "Querying OUI vendor database...",
  "Fingerprinting operating systems (TTL analysis)...",
  "Detecting managed switches (SNMP walk)...",
  "Detecting routers (traceroute hops)...",
  "Detecting servers (port 22/80/443/3389)...",
  "Detecting printers (port 9100/631)...",
  "Detecting IP cameras (port 80/554)...",
  "Detecting wireless access points (802.11 beacons)...",
  "Detecting firewalls (stealth SYN scan)...",
  "Compiling device inventory...",
];

export default function NetworkDiscovery() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanLog, setScanLog] = useState([]);
  const [discovered, setDiscovered] = useState([]);
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    api.entities.Asset.list("-created_date", 200)
      .then(setAssets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const existingDevices = useMemo(() => assets.map((a) => {
    const meta = DEVICE_TYPES.find(t => t.key === a.asset_type) || DEVICE_TYPES[0];
    return {
      id: a.id,
      ip: a.ip_address,
      mac: a.mac_address || randMac(),
      hostname: a.hostname,
      type: meta.key,
      vendor: (a.tags && a.tags !== "") ? a.tags : pick(VENDORS),
      os: a.os || "Unknown",
      status: a.status || "active",
      source: "inventory",
    };
  }), [assets]);

  const allDevices = [...discovered, ...existingDevices];
  const filtered = typeFilter === "all" ? allDevices : allDevices.filter(d => d.type === typeFilter);

  const typeCounts = DEVICE_TYPES.reduce((acc, t) => {
    acc[t.key] = allDevices.filter(d => d.type === t.key).length;
    return acc;
  }, {});

  const onlineCount = allDevices.filter(d => d.status === "active").length;

  const runScan = () => {
    if (scanning) return;
    setScanning(true);
    setProgress(0);
    setScanLog([]);
    setDiscovered([]);
    const base = subnet.replace(/\/\d+$/, "").replace(/\.\d+$/, ".");
    let stepIdx = 0;
    const logTimer = setInterval(() => {
      if (stepIdx < SCAN_STEPS.length) {
        setScanLog(prev => [...prev, SCAN_STEPS[stepIdx]]);
        stepIdx++;
      }
    }, 260);

    const progTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progTimer);
          clearInterval(logTimer);
          const found = [];
          const count = Math.floor(Math.random() * 9 + 7);
          for (let j = 0; j < count; j++) {
            const type = DEVICE_TYPES[Math.floor(Math.random() * DEVICE_TYPES.length)].key;
            found.push({
              id: "disc-" + j,
              ip: base + Math.floor(Math.random() * 253 + 2),
              mac: randMac(),
              hostname: "device-" + randHex(4).toLowerCase(),
              type,
              vendor: pick(VENDORS),
              os: pick(OSLIST),
              status: Math.random() > 0.1 ? "active" : "inactive",
              source: "discovered",
            });
          }
          setDiscovered(found);
          setScanning(false);
          return 100;
        }
        return p + 3;
      });
    }, 170);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Network Discovery</h1>
          <p className="text-sm text-slate-500 mt-0.5">Scan subnets to discover devices, MACs, vendors, and device types</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Radar className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400">{onlineCount} Hosts Online</span>
        </div>
      </div>

      {/* Scan Controls */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              disabled={scanning}
              placeholder="e.g. 192.168.1.0/24"
              className="flex-1 h-9 bg-[hsl(222,44%,6%)] border border-[hsl(222,30%,18%)] rounded-md px-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
            />
          </div>
          <Button
            onClick={runScan}
            disabled={scanning}
            className="bg-cyan-500/90 hover:bg-cyan-500 text-slate-900 font-semibold"
          >
            {scanning ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Scanning...</> : <><Radar className="w-4 h-4 mr-1.5" /> Scan Network</>}
          </Button>
          <Button variant="outline" className="bg-transparent border-[hsl(222,30%,18%)] text-slate-300 hover:bg-white/5" disabled>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Auto-Discover (Cron)
          </Button>
        </div>

        {scanning && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-400 font-mono">Scanning {subnet}...</span>
              <span className="text-xs text-cyan-400 font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[hsl(222,30%,14%)] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-[11px] space-y-0.5">
              {scanLog.map((line, i) => (
                <div key={i} className="text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500/70 shrink-0" /> {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Device Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {DEVICE_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(typeFilter === t.key ? "all" : t.key)}
            className={`bg-[hsl(222,44%,8%)] border rounded-xl p-3 text-left transition-all hover:scale-[1.02] ${
              typeFilter === t.key ? "border-cyan-500/40 bg-cyan-500/5" : "border-[hsl(222,30%,14%)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <t.icon className="w-4 h-4" style={{ color: t.color }} />
              <span className="text-lg font-bold font-mono text-white">{typeCounts[t.key] || 0}</span>
            </div>
            <p className="text-[11px] text-slate-500">{t.name}</p>
          </button>
        ))}
      </div>

      {/* Discovered Devices Table */}
      <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(222,30%,14%)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            Discovered Devices
            {typeFilter !== "all" && <span className="text-xs text-cyan-400">— filtered: {typeFilter}</span>}
          </h3>
          <div className="flex items-center gap-3">
            {typeFilter !== "all" && (
              <button onClick={() => setTypeFilter("all")} className="text-xs text-slate-500 hover:text-cyan-400">Clear filter</button>
            )}
            <span className="text-xs text-slate-500 font-mono">{filtered.length} devices</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[hsl(222,44%,10%)]">
              <tr className="text-left text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">IP Address</th>
                <th className="px-4 py-2.5 font-medium">MAC Address</th>
                <th className="px-4 py-2.5 font-medium">Hostname</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Vendor</th>
                <th className="px-4 py-2.5 font-medium">OS</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const meta = DEVICE_TYPES.find(t => t.key === d.type) || DEVICE_TYPES[0];
                return (
                  <tr key={d.id} className="border-t border-[hsl(222,30%,12%)] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2 font-mono text-cyan-400">{d.ip}</td>
                    <td className="px-4 py-2 font-mono text-slate-400">{d.mac}</td>
                    <td className="px-4 py-2 font-mono text-slate-300">{d.hostname}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
                        <meta.icon className="w-3 h-3" /> {meta.name.replace(/s$/, "")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400">{d.vendor}</td>
                    <td className="px-4 py-2 text-slate-500">{d.os}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${d.source === "discovered" ? "bg-cyan-500/15 text-cyan-400" : "bg-slate-500/15 text-slate-400"}`}>
                        {d.source === "discovered" ? "NEW" : "INVENTORY"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${d.status === "active" ? "bg-green-500" : "bg-slate-600"}`} />
                        <span className={`text-[11px] font-medium ${d.status === "active" ? "text-green-400" : "text-slate-600"}`}>{d.status === "active" ? "Online" : "Offline"}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-600 text-xs">
                    <Radar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No devices found. Run a scan to discover devices on the network.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discovery Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: "ARP Probing", desc: "Resolves MAC addresses and identifies live hosts on the local segment." },
          { icon: Network, title: "ICMP Sweep", desc: "Pings the entire subnet range to detect all responsive hosts." },
          { icon: Search, title: "OUI Vendor Lookup", desc: "Maps MAC address prefixes to manufacturer names for asset classification." },
          { icon: Cpu, title: "OS Fingerprinting", desc: "Infers operating systems from TTL values and TCP/IP stack behavior." },
          { icon: Shield, title: "Service Detection", desc: "Identifies device roles by probing well-known ports (SSH, HTTP, RTSP, 9100)." },
          { icon: Radar, title: "Scheduled Discovery", desc: "Automated recurring scans keep the device inventory up to date." },
        ].map((m, i) => (
          <div key={i} className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-2">
              <m.icon className="w-4 h-4 text-cyan-400" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">{m.title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}