import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, Trash2, ArrowDownToLine, ArrowUpFromLine,
  Radio, ChevronRight, ChevronDown, Filter
} from "lucide-react";

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
  // Pick a protocol — weighted toward common ones
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

  // Determine direction: IN = external→internal, OUT = internal→external
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

  // If TCP/UDP, set the L4 protocol
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

export default function PacketCapture() {
  const [packets, setPackets] = useState([]);
  const [capturing, setCapturing] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const seqRef = useRef(0);
  const captureRef = useRef(true);

  // Toggle capture state ref
  useEffect(() => {
    captureRef.current = capturing;
  }, [capturing]);

  // Generate packets at interval
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
        return combined.slice(-200); // keep last 200
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Reset selection if filtered out
  useEffect(() => {
    if (selectedPacket && activeFilter !== "ALL" && selectedPacket.protocol !== activeFilter) {
      setSelectedPacket(null);
    }
  }, [activeFilter, selectedPacket]);

  const filteredPackets = activeFilter === "ALL"
    ? packets
    : packets.filter(p => {
        if (activeFilter === "TCP" || activeFilter === "UDP") return p.transport === activeFilter;
        return p.protocol === activeFilter;
      });

  const inCount = filteredPackets.filter(p => p.direction === "IN").length;
  const outCount = filteredPackets.filter(p => p.direction === "OUT").length;

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClear = () => {
    setPackets([]);
    setSelectedPacket(null);
    seqRef.current = 0;
  };

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
        </div>
      </div>

      {/* Direction Stats Bar */}
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

      {/* Packet Table */}
      <div className="flex flex-col" style={{ maxHeight: "500px" }}>
        {/* Column Headers */}
        <div className="grid grid-cols-[50px_110px_30px_140px_140px_70px_70px_1fr] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-medium border-b border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
          <span>No.</span>
          <span>Time</span>
          <span>Dir</span>
          <span>Source</span>
          <span>Destination</span>
          <span>Protocol</span>
          <span>Length</span>
          <span>Info</span>
        </div>

        {/* Scrollable Packet List */}
        <div className="overflow-y-auto flex-1 font-mono text-[11px]">
          {filteredPackets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Radio className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">
                {capturing ? "Waiting for packets..." : "Capture stopped. Press Start to capture."}
              </p>
            </div>
          )}
          {[...filteredPackets].reverse().map((pkt) => (
            <div
              key={pkt.id}
              onClick={() => setSelectedPacket(pkt)}
              className={`grid grid-cols-[50px_110px_30px_140px_140px_70px_70px_1fr] gap-2 px-4 py-1.5 cursor-pointer transition-colors border-b border-[hsl(222,30%,10%)] ${
                selectedPacket?.id === pkt.id
                  ? "bg-cyan-500/10"
                  : "hover:bg-white/[0.03]"
              }`}
            >
              <span className="text-slate-500">{pkt.id}</span>
              <span className="text-slate-400">{formatTime(pkt.timestamp)}</span>
              <span className="flex items-center">
                {pkt.direction === "IN"
                  ? <ArrowDownToLine className="w-3 h-3 text-green-400" />
                  : <ArrowUpFromLine className="w-3 h-3 text-blue-400" />
                }
              </span>
              <span className="text-slate-300 truncate">
                {pkt.source}
                <span className="text-slate-600">:{pkt.srcPort}</span>
              </span>
              <span className="text-slate-300 truncate">
                {pkt.destination}
                <span className="text-slate-600">:{pkt.dstPort}</span>
              </span>
              <span className="font-semibold" style={{ color: pkt.color }}>{pkt.protocol}</span>
              <span className="text-slate-400">{pkt.length}</span>
              <span className="text-slate-400 truncate">{pkt.info}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Packet Detail Pane (Wireshark-style) */}
      {selectedPacket && (
        <div className="border-t border-[hsl(222,30%,14%)] bg-[hsl(222,44%,6%)]">
          <div className="px-4 py-2 border-b border-[hsl(222,30%,14%)]">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Packet Details — #{selectedPacket.id}</span>
          </div>
          <div className="px-4 py-2 space-y-0.5 font-mono text-[11px]">
            {/* Frame */}
            <DetailRow
              label={`Frame ${selectedPacket.id}: ${selectedPacket.length} bytes on wire, ${selectedPacket.length} bytes captured`}
              expanded={expandedSections.frame}
              onClick={() => toggleSection("frame")}
              children={[
                { label: `  Arrival Time: ${formatTime(selectedPacket.timestamp)}` },
                { label: `  Frame Length: ${selectedPacket.length} bytes` },
                { label: `  Interface: eth0` },
              ]}
            />
            {/* Ethernet */}
            <DetailRow
              label="Ethernet II, Src: 00:1a:2b:3c:4d:5e, Dst: 00:5e:1a:2b:3c:4d"
              expanded={expandedSections.eth}
              onClick={() => toggleSection("eth")}
              children={[
                { label: "  Destination: 00:5e:1a:2b:3c:4d" },
                { label: "  Source: 00:1a:2b:3c:4d:5e" },
                { label: "  Type: IPv4 (0x0800)" },
              ]}
            />
            {/* IP */}
            <DetailRow
              label={`Internet Protocol Version 4, Src: ${selectedPacket.source}, Dst: ${selectedPacket.destination}`}
              expanded={expandedSections.ip}
              onClick={() => toggleSection("ip")}
              children={[
                { label: `  Source: ${selectedPacket.source}` },
                { label: `  Destination: ${selectedPacket.destination}` },
                { label: `  Direction: ${selectedPacket.direction === "IN" ? "Inbound (External → Internal)" : "Outbound (Internal → External)"}` },
                { label: "  TTL: 64" },
                { label: "  Protocol: " + selectedPacket.transport + " (" + (selectedPacket.transport === "TCP" ? "6" : "17") + ")" },
              ]}
            />
            {/* Transport */}
            <DetailRow
              label={`${selectedPacket.transport} ${selectedPacket.srcPort} → ${selectedPacket.dstPort}`}
              expanded={expandedSections.transport}
              onClick={() => toggleSection("transport")}
              children={[
                { label: `  Source Port: ${selectedPacket.srcPort}` },
                { label: `  Destination Port: ${selectedPacket.dstPort}` },
                ...(selectedPacket.transport === "TCP"
                  ? [{ label: "  Flags: 0x018 (PSH, ACK)" }, { label: "  Window: 64240" }]
                  : [{ label: "  Length: " + selectedPacket.length }]),
              ]}
            />
            {/* Application / Info */}
            <DetailRow
              label={`${selectedPacket.protocol}: ${selectedPacket.info}`}
              expanded={expandedSections.app}
              onClick={() => toggleSection("app")}
              children={[
                { label: `  Application Protocol: ${selectedPacket.protocol}` },
                { label: `  Direction: ${selectedPacket.direction}` },
                { label: `  Info: ${selectedPacket.info}` },
                { label: `  Payload Length: ${selectedPacket.length - 54} bytes` },
              ]}
            />
          </div>

          {/* Hex dump */}
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
  // Generate a realistic-looking hex dump
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