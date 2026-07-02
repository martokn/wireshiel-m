import React from "react";

export default function RiskGauge({ score }) {
  const getColor = (s) => {
    if (s >= 80) return { text: "text-red-400", label: "Critical", bar: "bg-red-500" };
    if (s >= 60) return { text: "text-orange-400", label: "High Risk", bar: "bg-orange-500" };
    if (s >= 40) return { text: "text-amber-400", label: "Medium", bar: "bg-amber-500" };
    return { text: "text-green-400", label: "Low", bar: "bg-green-500" };
  };
  const c = getColor(score);

  return (
    <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Network Risk Score</h3>
      <p className="text-xs text-slate-500 mb-4">Overall security posture</p>
      <div className="flex items-end gap-3 mb-3">
        <span className="text-4xl font-bold font-mono text-white">{score}</span>
        <span className="text-lg text-slate-500 font-mono mb-1">/100</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[hsl(222,30%,14%)] mb-2">
        <div className={`h-full rounded-full ${c.bar} transition-all duration-1000`} style={{ width: `${score}%` }} />
      </div>
      <p className={`text-xs font-semibold ${c.text}`}>{c.label}</p>
    </div>
  );
}