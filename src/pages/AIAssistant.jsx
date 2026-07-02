import React, { useState } from "react";
import { api } from "@/api/netshieldClient";
import { Bot, Send, Sparkles, Shield, AlertTriangle, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";

const quickActions = [
  { label: "Summarize recent threats", prompt: "Analyze and summarize the most recent security alerts. Identify patterns, common attack vectors, and provide a risk assessment with recommended actions.", icon: AlertTriangle },
  { label: "Check host 192.168.1.132", prompt: "Investigate host 192.168.1.132. Check for any suspicious activity, high risk indicators, unusual traffic patterns, and provide a security assessment.", icon: Terminal },
  { label: "Security posture report", prompt: "Generate a comprehensive security posture report covering: overall risk score, critical vulnerabilities, top threats, compliance status, and recommendations for improvement.", icon: Shield },
  { label: "Detect anomalies", prompt: "Analyze network traffic patterns and identify anomalies. Look for unusual data transfers, suspicious connection patterns, after-hours activity, and potential data exfiltration attempts.", icon: Sparkles },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const alertsData = await api.entities.Alert.list("-created_date", 20);
      const assetsData = await api.entities.Asset.list("-created_date", 20);

      const context = `You are NetShield AI Security Analyst. You analyze network security data and provide expert insights.

Current Security Data:
- Active Alerts (${alertsData.length}): ${JSON.stringify(alertsData.slice(0, 10).map(a => ({ title: a.title, severity: a.severity, source_ip: a.source_ip, status: a.status, category: a.category })))}
- Assets (${assetsData.length}): ${JSON.stringify(assetsData.slice(0, 10).map(a => ({ hostname: a.hostname, ip: a.ip_address, type: a.asset_type, risk: a.risk_score, status: a.status })))}

Respond with detailed, actionable security analysis. Use technical security terminology. Format with markdown headers, bullet points, and code blocks where appropriate.`;

      const response = await api.integrations.Core.InvokeLLM({
        prompt: context + "\n\nUser query: " + text,
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Analysis failed. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Security Analyst</h1>
        <p className="text-sm text-slate-500 mt-0.5">AI-powered threat analysis, root cause analysis, and recommendations</p>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">NetShield AI Analyst</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md">
                Ask me about threats, analyze network behavior, investigate hosts, or get security recommendations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {quickActions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(a.prompt)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[hsl(222,30%,12%)] border border-[hsl(222,30%,18%)] text-sm text-slate-300 hover:text-white hover:border-cyan-500/30 transition-all text-left"
                  >
                    <a.icon className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${msg.role === "user"
                ? "bg-cyan-600/20 border border-cyan-500/20 rounded-2xl rounded-br-md px-4 py-3"
                : "bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,16%)] rounded-2xl rounded-bl-md px-4 py-3"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none text-sm text-slate-200">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-white">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[hsl(222,30%,10%)] border border-[hsl(222,30%,16%)] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  Analyzing...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[hsl(222,30%,14%)]">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about threats, investigate IPs, or request analysis..."
              className="flex-1 bg-[hsl(222,30%,10%)] border-[hsl(222,30%,18%)] text-white resize-none min-h-[44px] max-h-32"
              rows={1}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white h-11 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}