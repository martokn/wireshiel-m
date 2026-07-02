import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield, LayoutDashboard, Activity, Bell, Search, Network, Bot,
  FileText, Settings, Database, ChevronLeft, ChevronRight,
  AlertTriangle, Globe, Server, ClipboardList, LogOut, Radar, Gauge
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/" },
  { label: "Real-Time Monitor", icon: Activity, path: "/monitor" },
  { label: "Alerts & Incidents", icon: Bell, path: "/alerts" },
  { label: "Threat Intelligence", icon: Globe, path: "/threat-intel" },
  { label: "Network Map", icon: Network, path: "/network-map" },
  { label: "Session Explorer", icon: Search, path: "/sessions" },
  { label: "Protocol Analysis", icon: Network, path: "/protocol-analysis" },
  { label: "Network Discovery", icon: Radar, path: "/network-discovery" },
  { label: "Performance Monitor", icon: Gauge, path: "/performance" },
  { label: "AI Assistant", icon: Bot, path: "/ai-assistant" },
  { label: "Asset Inventory", icon: Server, path: "/assets" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "Audit Logs", icon: ClipboardList, path: "/audit-logs" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-[hsl(222,47%,7%)] border-r border-[hsl(222,30%,14%)] z-50 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[hsl(222,30%,14%)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-wide">NetShield</h1>
            <p className="text-[10px] text-cyan-400/70 font-mono">SECURITY PLATFORM</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <item.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              {!collapsed && <span className="font-medium truncate">{item.label}</span>}
              {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-live" />}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-2 border-t border-[hsl(222,30%,14%)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 text-sm transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}