import React, { useState } from "react";
import { api } from "@/api/netshieldClient";
import { FileText, Download, Loader2, Shield, BarChart3, AlertTriangle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";

const reportTypes = [
  { id: "executive", label: "Executive Summary", desc: "High-level overview for management", icon: BarChart3, color: "cyan" },
  { id: "threat", label: "Threat Analysis Report", desc: "Detailed threat landscape analysis", icon: AlertTriangle, color: "red" },
  { id: "compliance", label: "Compliance Report", desc: "ISO 27001, PCI-DSS, NIST compliance", icon: ClipboardCheck, color: "green" },
  { id: "incident", label: "Incident Report", desc: "Incident summary and timeline", icon: Shield, color: "amber" },
];

export default function Reports() {
  const [generating, setGenerating] = useState(null);
  const [report, setReport] = useState(null);
  const { toast } = useToast();

  const generateReport = async (type) => {
    setGenerating(type);
    setReport(null);

    try {
      const alerts = await api.entities.Alert.list("-created_date", 30);
      const assets = await api.entities.Asset.list("-created_date", 30);
      const incidents = await api.entities.Incident.list("-created_date", 20);

      const prompts = {
        executive: `Generate an executive security summary report. Include: Overall risk posture, key metrics, top threats, incident trends, and strategic recommendations.`,
        threat: `Generate a detailed threat analysis report. Include: Threat landscape overview, attack vector analysis, IOC summary, MITRE ATT&CK mapping, and mitigation recommendations.`,
        compliance: `Generate a compliance status report covering ISO 27001, PCI-DSS, and NIST frameworks. Include: control assessments, gaps, and remediation priorities.`,
        incident: `Generate an incident summary report. Include: incident timeline, affected systems, root cause analysis, containment actions, and lessons learned.`,
      };

      const context = `Security Data Summary:
- Alerts: ${alerts.length} total, ${alerts.filter(a => a.severity === "critical").length} critical
- Assets: ${assets.length} monitored, ${assets.filter(a => (a.risk_score || 0) > 70).length} high-risk
- Incidents: ${incidents.length} recorded
Format the report professionally with markdown headers, tables, and clear sections.`;

      const result = await api.integrations.Core.InvokeLLM({
        prompt: prompts[type] + "\n\n" + context,
      });

      setReport({ type, content: result, timestamp: new Date().toISOString() });
      toast({ title: "Report generated" });
    } catch {
      toast({ title: "Failed to generate report", variant: "destructive" });
    }
    setGenerating(null);
  };

  const colorMap = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40",
    red: "border-red-500/20 bg-red-500/5 hover:border-red-500/40",
    green: "border-green-500/20 bg-green-500/5 hover:border-green-500/40",
    amber: "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40",
  };
  const iconColorMap = {
    cyan: "text-cyan-500",
    red: "text-red-500",
    green: "text-green-500",
    amber: "text-amber-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate executive, compliance, and threat reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map(r => (
          <button
            key={r.id}
            onClick={() => generateReport(r.id)}
            disabled={generating === r.id}
            className={`p-5 rounded-xl border text-left transition-all ${colorMap[r.color]}`}
          >
            <r.icon className={`w-6 h-6 mb-3 ${iconColorMap[r.color]}`} />
            <h3 className="text-sm font-semibold text-white mb-1">{r.label}</h3>
            <p className="text-xs text-slate-500">{r.desc}</p>
            {generating === r.id && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-cyan-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
              </div>
            )}
          </button>
        ))}
      </div>

      {report && (
        <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(222,30%,14%)]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white capitalize">{report.type.replace(/_/g, " ")} Report</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">{new Date(report.timestamp).toLocaleString()}</span>
          </div>
          <div className="p-6 prose prose-sm prose-invert max-w-none text-slate-200">
            <ReactMarkdown>{report.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}