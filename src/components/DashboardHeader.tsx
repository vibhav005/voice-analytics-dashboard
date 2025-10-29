import React from "react";

export default function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 mt-5 animate-fade-up opacity-0">
      <div className="mb-4 md:mb-0">
        <div className="text-white font-semibold text-lg tracking-tight flex items-center gap-2">
          <span>Agent Performance Dashboard</span>
          <span className="text-[9px] text-black bg-mint rounded-pill px-2 py-[2px] font-medium">
            internal
          </span>
        </div>
        <div className="text-textMuted text-xs mt-1 max-w-md leading-relaxed">
          Live call data, failure trends, SLA drift, and customer sentiment
          preview — everything you need to know if your voice agent is behaving.
        </div>
      </div>
    </div>
  );
}
