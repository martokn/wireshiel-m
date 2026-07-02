import React from "react";

const config = {
  new: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  investigating: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  resolved: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30" },
  false_positive: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30" },
  escalated: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  open: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  containment: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  eradication: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  recovery: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  closed: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30" },
  active: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30" },
  inactive: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30" },
  quarantined: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  blocked: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  suspicious: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
};

export default function StatusBadge({ status }) {
  const c = config[status] || config.new;
  const label = status?.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${c.bg} ${c.text} border ${c.border}`}>
      {label}
    </span>
  );
}