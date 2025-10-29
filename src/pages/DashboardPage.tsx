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
    <div className="px-6 md:px-10 max-w-7xl mx-auto w-full pb-20">
      <DashboardHeader />

      <StatCards />

      {/* first row: call volume + resolution time (editable) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        <CallVolumeLineChart notify={notify} />
        <ResolutionTimeEditableChart notify={notify} />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
