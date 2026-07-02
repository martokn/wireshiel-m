import React from "react";

export default function StatCard({ label, value, change, changeType, icon: Icon, color = "cyan" }) {
  const colorMap = {
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", icon: "text-cyan-500" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: "text-red-500" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "text-amber-500" },
    green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", icon: "text-green-500" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", icon: "text-purple-500" },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4 backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${c.icon}`} />}
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {change && (
        <p className={`text-xs mt-1.5 font-medium ${changeType === "up" ? "text-green-400" : changeType === "down" ? "text-red-400" : "text-slate-500"}`}>
          {changeType === "up" ? "↑" : changeType === "down" ? "↓" : ""} {change}
        </p>
      )}
    </div>
  );
}