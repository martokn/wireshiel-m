import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SeverityBadge from "./SeverityBadge";
import moment from "moment";

export default function RecentAlerts({ alerts }) {
  return (
    <div className="bg-[hsl(222,44%,8%)] border border-[hsl(222,30%,14%)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Recent Alerts</h3>
        <Link to="/alerts" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No alerts yet. The system is monitoring.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(222,30%,10%)] hover:bg-[hsl(222,30%,12%)] transition-colors group">
              <SeverityBadge severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{alert.title}</p>
                <p className="text-xs text-slate-500 font-mono">{alert.source_ip} → {alert.destination_ip || "—"}</p>
              </div>
              <span className="text-[11px] text-slate-600 font-mono whitespace-nowrap">
                {moment(alert.created_date).fromNow()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}