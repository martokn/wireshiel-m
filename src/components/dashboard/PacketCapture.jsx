import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play, Pause, Trash2, ArrowDownToLine, ArrowUpFromLine,
  Radio, ChevronRight, ChevronDown, Filter, Download, Star,
  Bookmark, BookmarkCheck, BarChart3, Network, Globe,
  Cable, Wifi, AlertTriangle, Crosshair, X, Search
} from "lucide-react";
import { api } from "@/api/netshieldClient";

const PROTOCOLS = [
  { name: "ALL",   color: "#94a3b8", ports: [] },
  { name: "TCP",   color: "#3b82f6", ports: [] },
  { name: "UDP",   color: "#a855f7", ports: [] },
  { name: "HTTPS", color: "#06b6d4", ports: [443] },
  { name: "HTTP",  color: "#8b5cf6", ports: [80] },
  { name: "DNS",   color: "#f59e0b", ports: [53] },
  { name: "SSH",   color: "#22c55e", ports: [22] },
  { name: "SMB",   color: "#f97316", ports: [445] },
  { name: "SMTP",  color: "#ec4899", ports: [25] },
  { name: "FTP",   color: "#ef4444", ports: [21] },
  { name: "TLS",   color: "#6366f1", ports: [443] },
];

const INTERNAL_IPS = ["192.168.1.10", "192.168.1.11", "192.168.1.20", "192.168.1.45", "10.0.1.10", "10.0.1.20", "10.0.0.5"];
const EXTERNAL_IPS = ["45.33.32.156", "8.8.8.8", "1.1.1.1", "104.16.132.229", "185.220.101.42", "203.0.113.50", "198.51.100.77", "172.64.150.2"];

const CAPTURE_INTERFACES = [
  { id: "eth0", name: "Ethernet (eth0)", ip: "192.168.1.10", type: "Wired", mtu: 1500, speed: "1 Gbps" },
  { id: "wlan0", name: "WiFi (wlan0)", ip: "192.168.1.22", type: "Wireless", mtu: 1500, speed: "600 Mbps" },
  { id: "eth1", name: "Uplink (eth1)", ip: "203.0.113.5", type: "Wired", mtu: 1500, speed: "10 Gbps" },
  { id: "tun0", name: "VPN Tunnel (tun0)", ip: "10.8.0.1", type: "Tunnel", mtu: 1400, speed: "200 Mbps" },
];

const INFO_TEMPLATES = {
  HTTPS: [
    "Client Hello (SNI=cloudflare.com)",
    "Server Hello, Certificate",
    "Application Data",
    "Change Cipher Spec, Encrypted Handshake",
    "Application Data, Application Data",
  ],
  HTTP: [
    "GET /index.html HTTP/1.1",
    "HTTP/1.1 200 OK (text/html)",
    "POST /api/login HTTP/1.1",
    "HTTP/1.1 401 Unauthorized",
    "GET /static/app.js HTTP/1.1",
  ],
  DNS: [
    "Standard query 0x4a3b A example.com",
    "Standard query response 0x4a3b A 93.184.216.34",
    "Standard query 0x8c21 AAAA cdn.cloudflare.net",
    "Standard query response 0x8c21 AAAA 2606:4700::6810",
    "Standard query 0x2f10 TXT _dmarc.com",
  ],
  SSH: [
    "SSH Protocol Version Exchange",
    "Key Exchange Init",
    "New Keys, Encrypted Packet",
    "Channel Open Session",
    "Channel Data (encrypted)",
  ],
  SMB: [
    "Negotiate Protocol Request",
    "Negotiate Protocol Response",
    "Session Setup AndX Request",
    "Tree Connect AndX Request (\\\\share)",
    "NT Create AndX Request, File: report.pdf",
  ],
  SMTP: [
    "C: EHLO mail.netshield.io",
    "S: 250 OK",
    "C: MAIL FROM:<user@netshield.io>",
    "S: 250 2.1.0 Ok",
    "C: RCPT TO:<dest@example.com>",
  ],
  FTP: [
    "C: USER anonymous",
    "S: 331 Please specify password",
    "C: PASS guest",
    "S: 230 Login successful",
    "C: RETR file.zip",
  ],
  TLS: [
    "Client Hello",
    "Server Hello, Change Cipher Spec",
    "Certificate, Server Key Exchange",
    "Application Data",
    "Encrypted Alert",
  ],
  TCP: [
    "54321 → 443 [ACK] Seq=1 Ack=1 Win=64240 Len=0",
    "443 → 54321 [PSH, ACK] Seq=1 Ack=1 Win=64240 Len=512",
    "54321 → 443 [SYN] Seq=0 Win=64240 Len=0 MSS=1460",
    "443 → 54321 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0",
    "54321 → 443 [FIN, ACK] Seq=1 Ack=1 Win=64240 Len=0",
    "443 → 54321 [RST, ACK] Seq=1 Ack=1 Win=0 Len=0",
  ],
  UDP: [
    "53421 → 53 Len=42",
    "53 → 53421 Len=98",
    "12345 → 443 Len=1200",
    "443 → 12345 Len=512",
    "5060 → 5060 Len=256 (SIP)",
  ],
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generatePacket = (seqNum) => {
  const weighted = [
    ...Array(30).fill("HTTPS"),
    ...Array(15).fill("DNS"),
    ...Array(10).fill("TCP"),
    ...Array(8).fill("TLS"),
    ...Array(7).fill("UDP"),
    ...Array(5).fill("SMB"),
    ...Array(4).fill("HTTP"),
    ...Array(3).fill("SSH"),
    ...Array(2).fill("SMTP"),
    ...Array(1).fill("FTP"),
  ];
  const protoName = pick(weighted);
  const proto = PROTOCOLS.find(p => p.name === protoName);

  const direction = Math.random() > 0.5 ? "OUT" : "IN";
  let srcIp, dstIp;
  if (direction === "IN") {
    srcIp = pick(EXTERNAL_IPS);
    dstIp = pick(INTERNAL_IPS);
  } else {
    srcIp = pick(INTERNAL_IPS);
    dstIp = pick(EXTERNAL_IPS);
  }

  const protoDef = PROTOCOLS.find(p => p.name === protoName);
  const dstPort = protoDef.ports.length ? pick(protoDef.ports) : randInt(1024, 65535);
  const srcPort = randInt(49152, 65535);
  const length = protoName === "DNS" ? randInt(60, 180) : protoName === "TCP" || protoName === "UDP" ? randInt(54, 1500) : randInt(80, 1460);

  const transportProto = ["HTTPS", "HTTP", "SSH", "SMB", "SMTP", "FTP", "TLS"].includes(protoName) ? "TCP" : "UDP";
  const isTCPOrUDP = protoName === "TCP" || protoName === "UDP";

  return {
    id: seqNum,
    timestamp: new Date(),
    direction,
    source: srcIp,
    destination: dstIp,
    srcPort,
    dstPort,
    protocol: protoName,
    transport: isTCPOrUDP ? protoName : transportProto,
    length,
    info: pick(INFO_TEMPLATES[protoName] || INFO_TEMPLATES.TCP),
    color: proto.color,
  };
};

const formatTime = (date) => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
};

function downloadPcap(packets, fileName) {
  const magicNumber = 0xa1b2c3d4;
  const versionMajor = 2;
  const versionMinor = 4;
  const thiszone = 0;
  const sigfigs = 0;
  const snaplen = 65535;
  const network = 1;

  const header = new ArrayBuffer(24);
  const hdr = new DataView(header);
  hdr.setUint32(0, magicNumber, false);
  hdr.setUint16(4, versionMajor, false);
  hdr.setUint16(6, versionMinor, false);
  hdr.setInt32(8, thiszone, false);
  hdr.setUint32(12, sigfigs, false);
  hdr.setUint32(16, snaplen, false);
  hdr.setUint32(20, network, false);

  const blocks = [header];
  packets.forEach(pkt => {
    const tsSec = Math.floor(pkt.timestamp.getTime() / 1000);
    const tsUsec = (pkt.timestamp.getTime() % 1000) * 1000;
    const inclLen = Math.min(pkt.length, snaplen);
    const origLen = pkt.length;

    const pktHeader = new ArrayBuffer(16);
    const ph = new DataView(pktHeader);
    ph.setUint32(0, tsSec, false);
    ph.setUint32(4, tsUsec, false);
    ph.setUint32(8, inclLen, false);
    ph.setUint32(12, origLen, false);

    const payload = new Uint8Array(inclLen);
    for (let i = 0; i < inclLen; i++) {
      payload[i] = randInt(0, 255);
    }

    blocks.push(pktHeader);
    blocks.push(payload.buffer);
  });

  const blob = new Blob(blocks, { type: "application/vnd.tcpdump.pcap" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "capture.pcap";
  a.click();
  URL.revokeObjectURL(url);
}

export default function PacketCapture() {
  const [packets, setPackets] = useState([]);
  const [capturing, setCapturing] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [bookmarked, setBookmarked] = useState(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showSpiPanel, setShowSpiPanel] = useState(false);
  const [activeInterface, setActiveInterface] = useState(CAPTURE_INTERFACES[0].id);
  const [followStream, setFollowStream] = useState(null);
  const [threatIps, setThreatIps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showThreatIndicators, setShowThreatIndicators] = useState(true);
  const seqRef = useRef(0);
  const captureRef = useRef(true);

  useEffect(() => {
    captureRef.current = capturing;
  }, [capturing]);

  useEffect(() => {
    api.entities.ThreatIntel.list("-created_date", 50).then(iocs => {
      const ips = iocs
        .filter(ioc => ioc.ioc_type === "ip" && ioc.status === "active")
        .map(ioc => ioc.ioc_value);
      setThreatIps(ips);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!captureRef.current) return;
      const count = randInt(1, 4);
      setPackets(prev => {
        const newPackets = [];
        for (let i = 0; i < count; i++) {
          seqRef.current += 1;
          newPackets.push(generatePacket(seqRef.current));
        }
        const combined = [...prev, ...newPackets];
        return combined.slice(-200);
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPacket && activeFilter !== "ALL" && selectedPacket.protocol !== activeFilter) {
      setSelectedPacket(null);
    }
  }, [activeFilter, selectedPacket]);

  const toggleBookmark = useCallback((id) => {
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const packetConversationKey = useCallback((pkt) => {
    return [pkt.source, pkt.destination, pkt.srcPort, pkt.dstPort, pkt.transport].sort().join("|");
  }, []);

  const filteredPackets = useMemo(() => {
    let result = activeFilter === "ALL"
      ? packets
      : packets.filter(p => {
          if (activeFilter === "TCP" || activeFilter === "UDP") return p.transport === activeFilter;
          return p.protocol === activeFilter;
        });

    if (showBookmarksOnly) {
      result = result.filter(p => bookmarked.has(p.id));
    }

    if (followStream) {
      result = result.filter(p => packetConversationKey(p) === followStream);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.source.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q) ||
        p.protocol.toLowerCase().includes(q) ||
        p.info.toLowerCase().includes(q) ||
        String(p.srcPort).includes(q) ||
        String(p.dstPort).includes(q)
      );
    }

    return result;
  }, [packets, activeFilter, showBookmarksOnly, bookmarked, followStream, searchQuery, packetConversationKey]);

  const isThreatPacket = useCallback((pkt) => {
    if (!showThreatIndicators || threatIps.length === 0) return false;
    return threatIps.includes(pkt.source) || threatIps.includes(pkt.destination);
  }, [threatIps, showThreatIndicators]);

  const inCount = filteredPackets.filter(p => p.direction === "IN").length;
  const outCount = filteredPackets.filter(p => p.direction === "OUT").length;
  const threatCount = packets.filter(p => isThreatPacket(p)).length;

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClear = () => {
    setPackets([]);
    setSelectedPacket(null);
    seqRef.current = 0;
  };

  const conversations = useMemo(() => {
    const map = {};
    packets.forEach(p => {
      const key = packetConversationKey(p);
      if (!map[key]) {
        map[key] = {
          key,
          src: p.source,
          dst: p.destination,
          srcPort: p.srcPort,
          dstPort: p.dstPort,
          proto: p.transport,
          count: 0,
        };
      }
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [packets, packetConversationKey]);

  const currentInterface = CAPTURE_INTERFACES.find(i => i.id === activeInterface) || CAPTURE_INTERFACES[0];

  const handleExportPcap = () => {
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    downloadPcap(packets, `netshield-capture-${ts}.pcap`);
  };

  const handleExportFilteredPcap = () => {
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    downloadPcap(filteredPackets, `netshield-capture-filtered-${ts}.pcap`);
  };

  const spiData = useMemo(() => {
    if (!showSpiPanel || filteredPackets.length === 0) return null;
    const sources = {};
    const destinations = {};
    const protocols = {};
    const srcPorts = {};
    const dstPorts = {};
    const infoHashes = {};

    filteredPackets.forEach(pkt => {
      sources[pkt.source] = (sources[pkt.source] || 0) + 1;
      destinations[pkt.destination] = (destinations[pkt.destination] || 0) + 1;
      protocols[pkt.protocol] = (protocols[pkt.protocol] || 0) + 1;
      srcPorts[pkt.srcPort] = (srcPorts[pkt.srcPort] || 0) + 1;
      dstPorts[pkt.dstPort] = (dstPorts[pkt.dstPort] || 0) + 1;
      const hash = pkt.info.slice(0, 40);
      infoHashes[hash] = (infoHashes[hash] || 0) + 1;
    });

    const top = (obj, n = 5) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([key, count]) => ({ value: key, count }));

    return {
      sources: top(sources),
      destinations: top(destinations),
      protocols: top(protocols),
      srcPorts: top(srcPorts),
      dstPorts: top(dstPorts),
      infoHashes: top(infoHashes),
      totalPackets: filteredPackets.length,
    };
  }, [showSpiPanel, filteredPackets]);

  return (
    <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(222,30%,14%)]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Live Packet Capture</h3>
          <span className="text-xs text-slate-500">— Wireshark-style traffic flow</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeInterface}
            onChange={e => setActiveInterface(e.target.value)}
            className="bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,18%)] rounded-lg px-2 py-1.5 text-[11px] text-slate-300 font-mono cursor-pointer outline-none"
          >
            {CAPTURE_INTERFACES.map(iface => (
              <option key={iface.id} value={iface.id}>{iface.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSpiPanel(!showSpiPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showSpiPanel
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "bg-secondary text-slate-400 border border-[hsl(222,30%,16%)] hover:bg-secondary/80"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> SPI
          </button>
          <button
            onClick={() => setCapturing(c => !c)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              capturing
                ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                : "bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/20"
            }`}
          >
            {capturing ? <><Pause className="w-3.5 h-3.5" /> Stop</> : <><Play className="w-3.5 h-3.5" /> Start</>}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-slate-400 border border-[hsl(222,30%,16%)] hover:bg-secondary/80"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-slate-400 border border-[hsl(222,30%,16%)] hover:bg-secondary/80">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-[hsl(222,44%,10%)] border border-[hsl(222,30%,18%)] rounded-lg shadow-xl hidden group-hover:block z-50">
              <button
                onClick={handleExportPcap}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-t-lg"
              >
                Export All ({packets.length}) as PCAP
              </button>
              <button
                onClick={handleExportFilteredPcap}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-b-lg"
              >
                Export Filtered ({filteredPackets.length}) as PCAP
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interface Info Bar */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
        <div className="flex items-center gap-1.5">
          {currentInterface.type === "Wireless" ? <Wifi className="w-3.5 h-3.5 text-cyan-400" /> : <Cable className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-xs font-mono text-slate-300">{currentInterface.id}</span>
        </div>
        <div className="h-3 w-px bg-[hsl(222,30%,16%)]" />
        <span className="text-[11px] text-slate-500">IP: <span className="font-mono text-slate-400">{currentInterface.ip}</span></span>
        <div className="h-3 w-px bg-[hsl(222,30%,16%)]" />
        <span className="text-[11px] text-slate-500">Speed: <span className="font-mono text-slate-400">{currentInterface.speed}</span></span>
        <div className="h-3 w-px bg-[hsl(222,30%,16%)]" />
        <span className="text-[11px] text-slate-500">MTU: <span className="font-mono text-slate-400">{currentInterface.mtu}</span></span>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-5 py-2.5 border-b border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-green-400" />
          <span className="text-xs text-slate-500">Inbound:</span>
          <span className="text-xs font-mono font-semibold text-green-400">{inCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-slate-500">Outbound:</span>
          <span className="text-xs font-mono font-semibold text-blue-400">{outCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-slate-500">Bookmarked:</span>
          <span className="text-xs font-mono font-semibold text-amber-400">{bookmarked.size}</span>
        </div>
        {threatCount > 0 && showThreatIndicators && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-slate-500">Threats:</span>
            <span className="text-xs font-mono font-semibold text-red-400">{threatCount}</span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500">Showing:</span>
          <span className="text-xs font-mono font-semibold text-slate-300">{filteredPackets.length}</span>
          {capturing && (
            <span className="flex items-center gap-1 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
              <span className="text-[10px] text-red-400 font-mono uppercase tracking-wider">Live</span>
            </span>
          )}
        </div>
      </div>

      {/* Search + Toggle Bar */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[hsl(222,30%,14%)]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search IP, port, protocol, info..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,18%)] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-slate-300 font-mono outline-none focus:border-cyan-500/40"
          />
        </div>
        <button
          onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            showBookmarksOnly
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              : "bg-secondary text-slate-400 border border-[hsl(222,30%,16%)] hover:bg-secondary/80"
          }`}
        >
          <Star className="w-3.5 h-3.5" /> Bookmarks {bookmarked.size > 0 && `(${bookmarked.size})`}
        </button>
        <button
          onClick={() => setShowThreatIndicators(!showThreatIndicators)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            showThreatIndicators
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "bg-secondary text-slate-400 border border-[hsl(222,30%,16%)] hover:bg-secondary/80"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Threat Intel
        </button>
      </div>

      {/* Protocol Filter Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap px-5 py-3 border-b border-[hsl(222,30%,14%)]">
        <span className="text-xs text-slate-500 mr-1">Filter:</span>
        {PROTOCOLS.map(p => (
          <button
            key={p.name}
            onClick={() => setActiveFilter(p.name)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all border ${
              activeFilter === p.name
                ? "bg-white/10 text-white"
                : "bg-transparent text-slate-400 hover:bg-white/5"
            }`}
            style={activeFilter === p.name ? { borderColor: p.color, color: p.color, boxShadow: `0 0 10px -4px ${p.color}` } : { borderColor: "transparent" }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* SPI Panel */}
      {showSpiPanel && spiData && (
        <div className="border-b border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">SPI View — Session Packet Intelligence</span>
              <span className="text-[11px] text-slate-500 font-mono ml-auto">{spiData.totalPackets} packets analyzed</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <SpiCard title="Source IPs" data={spiData.sources} color="#06b6d4" />
              <SpiCard title="Dest IPs" data={spiData.destinations} color="#8b5cf6" />
              <SpiCard title="Protocols" data={spiData.protocols} color="#22c55e" />
              <SpiCard title="Source Ports" data={spiData.srcPorts} color="#f59e0b" />
              <SpiCard title="Dest Ports" data={spiData.dstPorts} color="#ec4899" />
              <SpiCard title="Top Info" data={spiData.infoHashes} color="#6366f1" />
            </div>
          </div>
        </div>
      )}

      {/* Conversation Stream Banner */}
      {followStream && (
        <div className="flex items-center justify-between px-5 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-cyan-300 font-medium">Following stream:</span>
            <span className="text-[11px] font-mono text-slate-300 truncate max-w-[300px]">
              {(() => {
                const conv = conversations.find(c => c.key === followStream);
                return conv ? `${conv.src}:${conv.srcPort} ↔ ${conv.dst}:${conv.dstPort}` : followStream;
              })()}
            </span>
            <span className="text-[11px] text-slate-500">({filteredPackets.length} packets)</span>
          </div>
          <button
            onClick={() => setFollowStream(null)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
          >
            <X className="w-3.5 h-3.5" /> Unfollow
          </button>
        </div>
      )}

      {/* Conversations Dropdown */}
      {conversations.length > 0 && !followStream && (
        <div className="px-5 py-2 border-b border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
          <div className="flex items-center gap-2">
            <Network className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-500">Conversations:</span>
            <select
              value=""
              onChange={e => {
                if (e.target.value) setFollowStream(e.target.value);
              }}
              className="bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,18%)] rounded px-2 py-1 text-[11px] text-slate-300 font-mono cursor-pointer outline-none max-w-xs"
            >
              <option value="">All streams ({packets.length} packets)</option>
              {conversations.slice(0, 10).map(c => (
                <option key={c.key} value={c.key}>
                  {c.src}:{c.srcPort} ↔ {c.dst}:{c.dstPort} ({c.count} pkts)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Packet Table */}
      <div className="flex flex-col" style={{ maxHeight: "500px" }}>
        <div className="grid grid-cols-[36px_50px_110px_30px_140px_140px_70px_70px_1fr] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-medium border-b border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
          <span />
          <span>No.</span>
          <span>Time</span>
          <span>Dir</span>
          <span>Source</span>
          <span>Destination</span>
          <span>Protocol</span>
          <span>Length</span>
          <span>Info</span>
        </div>

        <div className="overflow-y-auto flex-1 font-mono text-[11px]">
          {filteredPackets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Radio className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">
                {showBookmarksOnly
                  ? "No bookmarked packets. Click the star icon to bookmark packets."
                  : followStream
                    ? "No packets in this stream yet."
                    : capturing
                      ? "Waiting for packets..."
                      : "Capture stopped. Press Start to capture."}
              </p>
            </div>
          )}
          {[...filteredPackets].reverse().map((pkt) => {
            const threat = isThreatPacket(pkt);
            const isBookmarked = bookmarked.has(pkt.id);
            return (
              <div
                key={pkt.id}
                onClick={() => setSelectedPacket(pkt)}
                className={`grid grid-cols-[36px_50px_110px_30px_140px_140px_70px_70px_1fr] gap-2 px-4 py-1.5 cursor-pointer transition-colors border-b border-[hsl(222,30%,10%)] ${
                  selectedPacket?.id === pkt.id
                    ? "bg-cyan-500/10"
                    : isBookmarked
                      ? "bg-amber-500/5"
                      : threat
                        ? "bg-red-500/5"
                        : "hover:bg-white/[0.03]"
                }`}
              >
                <span className="flex items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(pkt.id); }}
                    className={`p-0.5 rounded transition-colors ${
                      isBookmarked ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    <Star className="w-3 h-3" fill={isBookmarked ? "currentColor" : "none"} />
                  </button>
                </span>
                <span className="text-slate-500">{pkt.id}</span>
                <span className="text-slate-400">{formatTime(pkt.timestamp)}</span>
                <span className="flex items-center">
                  {pkt.direction === "IN"
                    ? <ArrowDownToLine className="w-3 h-3 text-green-400" />
                    : <ArrowUpFromLine className="w-3 h-3 text-blue-400" />
                  }
                </span>
                <span className={`truncate ${threat ? "text-red-400" : "text-slate-300"}`}>
                  {pkt.source}
                  <span className="text-slate-600">:{pkt.srcPort}</span>
                  {threat && <AlertTriangle className="w-2.5 h-2.5 inline ml-1 text-red-400" />}
                </span>
                <span className={`truncate ${threat ? "text-red-400" : "text-slate-300"}`}>
                  {pkt.destination}
                  <span className="text-slate-600">:{pkt.dstPort}</span>
                </span>
                <span className="font-semibold" style={{ color: pkt.color }}>{pkt.protocol}</span>
                <span className="text-slate-400">{pkt.length}</span>
                <span className="text-slate-400 truncate">{pkt.info}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Packet Detail Pane */}
      {selectedPacket && (
        <div className="border-t border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
          <div className="px-4 py-2 border-b border-[hsl(222,30%,14%)] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              Packet Details — #{selectedPacket.id}
              {bookmarked.has(selectedPacket.id) && (
                <span className="ml-2 text-amber-400 normal-case">★ Bookmarked</span>
              )}
              {isThreatPacket(selectedPacket) && (
                <span className="ml-2 text-red-400 normal-case">⚠ Threat IOC Match</span>
              )}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleBookmark(selectedPacket.id); }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${
                bookmarked.has(selectedPacket.id)
                  ? "text-amber-400 bg-amber-500/10"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Star className="w-3 h-3" fill={bookmarked.has(selectedPacket.id) ? "currentColor" : "none"} />
              {bookmarked.has(selectedPacket.id) ? "Bookmarked" : "Bookmark"}
            </button>
          </div>
          <div className="px-4 py-2 space-y-0.5 font-mono text-[11px]">
            <DetailRow
              label={`Frame ${selectedPacket.id}: ${selectedPacket.length} bytes on wire, ${selectedPacket.length} bytes captured`}
              expanded={expandedSections["frame"]}
              onClick={() => toggleSection("frame")}
              children={[
                { label: `  Arrival Time: ${formatTime(selectedPacket.timestamp)}` },
                { label: `  Frame Length: ${selectedPacket.length} bytes` },
                { label: `  Interface: ${currentInterface.id} (${currentInterface.name})` },
              ]}
            />
            <DetailRow
              label="Ethernet II, Src: 00:1a:2b:3c:4d:5e, Dst: 00:5e:1a:2b:3c:4d"
              expanded={expandedSections["eth"]}
              onClick={() => toggleSection("eth")}
              children={[
                { label: "  Destination: 00:5e:1a:2b:3c:4d" },
                { label: "  Source: 00:1a:2b:3c:4d:5e" },
                { label: "  Type: IPv4 (0x0800)" },
              ]}
            />
            <DetailRow
              label={`Internet Protocol Version 4, Src: ${selectedPacket.source}, Dst: ${selectedPacket.destination}`}
              expanded={expandedSections["ip"]}
              onClick={() => toggleSection("ip")}
              children={[
                { label: `  Source: ${selectedPacket.source}` },
                { label: `  Destination: ${selectedPacket.destination}` },
                { label: `  Direction: ${selectedPacket.direction === "IN" ? "Inbound (External → Internal)" : "Outbound (Internal → External)"}` },
                { label: "  TTL: 64" },
                { label: "  Protocol: " + selectedPacket.transport + " (" + (selectedPacket.transport === "TCP" ? "6" : "17") + ")" },
              ]}
            />
            <DetailRow
              label={`${selectedPacket.transport} ${selectedPacket.srcPort} → ${selectedPacket.dstPort}`}
              expanded={expandedSections["transport"]}
              onClick={() => toggleSection("transport")}
              children={[
                { label: `  Source Port: ${selectedPacket.srcPort}` },
                { label: `  Destination Port: ${selectedPacket.dstPort}` },
                ...(selectedPacket.transport === "TCP"
                  ? [{ label: "  Flags: 0x018 (PSH, ACK)" }, { label: "  Window: 64240" }]
                  : [{ label: "  Length: " + selectedPacket.length }]),
              ]}
            />
            <DetailRow
              label={`${selectedPacket.protocol}: ${selectedPacket.info}`}
              expanded={expandedSections["app"]}
              onClick={() => toggleSection("app")}
              children={[
                { label: `  Application Protocol: ${selectedPacket.protocol}` },
                { label: `  Direction: ${selectedPacket.direction}` },
                { label: `  Info: ${selectedPacket.info}` },
                { label: `  Payload Length: ${selectedPacket.length - 54} bytes` },
              ]}
            />
          </div>

          <div className="px-4 pb-3 pt-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Hex Dump</div>
            <div className="bg-black/30 rounded-lg p-2 font-mono text-[10px] text-slate-400 leading-relaxed overflow-x-auto">
              <HexDump length={selectedPacket.length} protocol={selectedPacket.protocol} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, expanded, onClick, children }) {
  return (
    <div>
      <button onClick={onClick} className="flex items-center gap-1 w-full text-left text-slate-300 hover:text-white py-0.5">
        {expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        {label}
      </button>
      {expanded && (
        <div className="ml-4 mt-0.5">
          {children.map((c, i) => (
            <p key={i} className="text-slate-500 py-0.5">{c.label}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function HexDump({ length, protocol }) {
  const bytes = Math.min(length, 160);
  const rows = Math.ceil(bytes / 16);
  const lines = [];
  for (let r = 0; r < rows; r++) {
    const offset = (r * 16).toString(16).padStart(4, "0");
    let hex = "";
    let ascii = "";
    for (let c = 0; c < 16; c++) {
      if (r * 16 + c < bytes) {
        const byte = randInt(0, 255);
        hex += byte.toString(16).padStart(2, "0") + " ";
        ascii += byte >= 32 && byte < 127 ? String.fromCharCode(byte) : ".";
      } else {
        hex += "   ";
        ascii += " ";
      }
    }
    lines.push(
      <div key={r} className="flex gap-4">
        <span className="text-cyan-400/60">{offset}</span>
        <span className="text-slate-400">{hex}</span>
        <span className="text-slate-500">{ascii}</span>
      </div>
    );
  }
  return <div>{lines}</div>;
}

function SpiCard({ title, data, color }) {
  const maxCount = data.length > 0 ? data[0].count : 0;
  return (
    <div className="bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,16%)] rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">{title}</p>
      <div className="space-y-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <div
              className="h-1.5 rounded-full transition-all shrink-0"
              style={{
                width: `${Math.max((item.count / maxCount) * 100, 8)}%`,
                backgroundColor: color,
                opacity: 0.6,
              }}
            />
            <span className="font-mono text-slate-300 truncate flex-1">{item.value}</span>
            <span className="font-mono text-slate-500 shrink-0">{item.count}</span>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-[10px] text-slate-600 italic">No data</p>
        )}
      </div>
    </div>
  );
}
