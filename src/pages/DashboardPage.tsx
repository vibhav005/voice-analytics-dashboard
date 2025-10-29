import React, { useState, useCallback } from "react";
import DashboardHeader from "../components/DashboardHeader";
import StatCards from "../components/StatCards";
import CallVolumeLineChart from "../components/charts/CallVolumeLineChart";
import ResolutionTimeEditableChart from "../components/charts/ResolutionTimeEditableChart";
import Toast, { ToastType } from "../components/Toast";

export default function DashboardPage() {
  // toast UI local to dashboard
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const notify = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur && cur.message === message ? null : cur));
    }, 3000);
  }, []);

  return (
    <div className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto w-full pb-24 md:pb-28">
      {/* Top header (title, export, etc.) */}
      <DashboardHeader />

      {/* KPI strip */}
      <StatCards />

      {/* Charts row */}
      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          gap-4 md:gap-6
          mb-8
        "
      >
        {/* Chart 1 wrapper */}
        <div
          className="
            flex
            min-h-[480px]
            sm:min-h-[500px]
            lg:min-h-[520px]
          "
        >
          <CallVolumeLineChart notify={notify} />
        </div>

        {/* Chart 2 wrapper */}
        <div
          className="
            flex
            min-h-[500px]
            sm:min-h-[520px]
            lg:min-h-[540px]
          "
        >
          <ResolutionTimeEditableChart notify={notify} />
        </div>
      </div>

      {/* Toast HUD */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
