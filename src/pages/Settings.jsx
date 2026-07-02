import React, { useState, useEffect } from "react";
import { api } from "@/api/netshieldClient";
import { Settings as SettingsIcon, Shield, Bell, Users, Database, Globe, Cpu, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("general");
  const { toast } = useToast();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const tabs = [
    { key: "general", label: "General", icon: SettingsIcon },
    { key: "security", label: "Security", icon: Shield },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "detection", label: "Detection Engines", icon: Cpu },
    { key: "integrations", label: "Integrations", icon: Globe },
    { key: "data", label: "Data Retention", icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">System configuration and administration</p>
        </div>
        <Button
          onClick={() => api.auth.logout("/")}
          variant="outline"
          className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Navigation */}
        <div className="space-y-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                tab === t.key
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-6">
          {tab === "general" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Platform Name</label>
                  <Input defaultValue="NetShield" className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white max-w-md" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Organization</label>
                  <Input defaultValue="Security Operations Center" className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white max-w-md" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Timezone</label>
                  <Input defaultValue="UTC+3 (East Africa)" className="bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white max-w-md" />
                </div>
                <Button onClick={() => toast({ title: "Settings saved" })} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="w-4 h-4 mr-1.5" /> Save Changes
                </Button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Security Settings</h3>
              <div className="space-y-4">
                {[
                  { label: "Two-Factor Authentication", desc: "Require 2FA for all users", default: true },
                  { label: "Session Timeout", desc: "Auto-logout after 30 minutes of inactivity", default: true },
                  { label: "IP Whitelisting", desc: "Restrict access to approved IP addresses", default: false },
                  { label: "API Rate Limiting", desc: "Limit API requests per minute", default: true },
                  { label: "Audit All Actions", desc: "Log every user action for compliance", default: true },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-[hsl(222,30%,14%)]">
                    <div>
                      <p className="text-sm text-white">{s.label}</p>
                      <p className="text-xs text-slate-500">{s.desc}</p>
                    </div>
                    <Switch defaultChecked={s.default} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
              <div className="space-y-4">
                {[
                  { label: "Email Alerts", desc: "Send critical alerts via email" },
                  { label: "Slack Notifications", desc: "Post alerts to Slack channel" },
                  { label: "Telegram Alerts", desc: "Send alerts via Telegram bot" },
                  { label: "SMS for Critical", desc: "SMS for critical severity alerts only" },
                  { label: "Webhook Notifications", desc: "POST to custom webhook URL" },
                ].map((n, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-[hsl(222,30%,14%)]">
                    <div>
                      <p className="text-sm text-white">{n.label}</p>
                      <p className="text-xs text-slate-500">{n.desc}</p>
                    </div>
                    <Switch defaultChecked={i < 2} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "detection" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Detection Engines</h3>
              <div className="space-y-3">
                {[
                  { name: "Suricata IDS/IPS", status: "active", version: "7.0.3" },
                  { name: "Zeek Network Analyzer", status: "active", version: "6.2.0" },
                  { name: "SafeLine WAF", status: "active", version: "3.1.0" },
                  { name: "AI/ML Engine", status: "active", version: "2.4.1" },
                  { name: "Threat Intel Engine", status: "active", version: "1.8.0" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,16%)]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-sm font-medium text-white">{e.name}</p>
                        <p className="text-xs text-slate-500">v{e.version}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20 uppercase">{e.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "integrations" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Integrations</h3>
              <div className="space-y-3">
                {[
                  { name: "SIEM (Splunk/QRadar)", connected: false },
                  { name: "Firewall / WAF", connected: true },
                  { name: "EDR / XDR", connected: false },
                  { name: "ITSM (ServiceNow/Jira)", connected: false },
                  { name: "Threat Intel Platforms", connected: true },
                ].map((int, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,16%)]">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <p className="text-sm text-white">{int.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${int.connected ? "bg-green-500/15 text-green-400" : "bg-slate-500/15 text-slate-400"}`}>
                      {int.connected ? "CONNECTED" : "NOT CONNECTED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Data Retention</h3>
              <div className="space-y-4">
                {[
                  { label: "Raw Packet Data (PCAP)", value: "30 days" },
                  { label: "Traffic Metadata", value: "90 days" },
                  { label: "Alerts & Incidents", value: "365 days" },
                  { label: "Audit Logs", value: "730 days" },
                  { label: "Threat Intelligence", value: "180 days" },
                ].map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-[hsl(222,30%,14%)]">
                    <p className="text-sm text-white">{d.label}</p>
                    <Input defaultValue={d.value} className="w-32 bg-[hsl(222,30%,12%)] border-[hsl(222,30%,18%)] text-white text-right text-sm" />
                  </div>
                ))}
                <Button onClick={() => toast({ title: "Retention policy saved" })} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="w-4 h-4 mr-1.5" /> Save Policy
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}