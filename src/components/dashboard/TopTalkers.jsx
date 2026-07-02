import React from "react";

const mockTalkers = [
  { ip: "192.168.1.132", bytes: "2.48 TB", pct: 24.6 },
  { ip: "10.0.8.53", bytes: "1.98 TB", pct: 19.6 },
  { ip: "192.168.1.15", bytes: "1.62 TB", pct: 16.0 },
  { ip: "172.16.5.18", bytes: "1.32 TB", pct: 11.1 },
  { ip: "10.0.2.201", bytes: "0.98 TB", pct: 8.7 },
];

export default function TopTalkers({ sessions }) {
  const talkers = mockTalkers;

  return (
    <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Top Talkers</h3>
      <div className="space-y-3">
        {talkers.map((t, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-cyan-400">{t.ip}</span>
              <span className="text-xs font-mono text-slate-400">{t.bytes}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[hsl(222,30%,14%)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                style={{ width: `${t.pct * 2.5}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5 text-right">{t.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}