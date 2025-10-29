import React from "react";

export default function StatCards() {
  // Same dummy data we use in charts
  const callsPerDay = [180, 220, 205, 260, 240, 120, 90];
  const failsPerDay = [14, 18, 9, 21, 17, 4, 2];
  const resolutionTimes = [44, 39, 42, 47, 41, 38, 36]; // sec per day

  const totalCalls = callsPerDay.reduce((a, b) => a + b, 0);
  const totalFails = failsPerDay.reduce((a, b) => a + b, 0);
  const failRate = (totalFails / totalCalls) * 100;

  const avgRes =
    resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;

  const healthy = failRate < 8 && avgRes < 45;
  const healthLabel = healthy ? "Healthy" : "Needs Attention";
  const healthTrend = healthy ? "+Stable" : "-Degraded";

  const stats = [
    {
      label: "Total Calls (7d)",
      value: totalCalls.toString(),
      change: "+12%",
    },
    {
      label: "Avg Handle Time",
      value: `${Math.round(avgRes)} sec`,
      change: avgRes < 45 ? "-5%" : "+5%",
    },
    {
      label: "CSAT",
      value: "94%",
      change: "+2%",
    },
    {
      label: "Voice Agent Health",
      value: healthLabel,
      change: healthTrend,
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10 md:mb-12 animate-fade-up [animation-delay:200ms] opacity-0">
      {stats.map((s) => (
        <div
          key={s.label}
          className="card-glass p-4 md:p-5 flex flex-col justify-between border border-borderDim rounded-xl3 shadow-cardGlow"
        >
          {/* label */}
          <div className="text-textMuted text-xs md:text-sm font-medium tracking-tight">
            {s.label}
          </div>

          {/* main row */}
          <div className="flex items-end justify-between mt-3">
            <div className="text-white font-semibold text-xl md:text-2xl leading-none tracking-tight">
              {s.value}
            </div>

            <div
              className={`text-[10px] md:text-xs font-semibold ${
                s.change.startsWith("-") ? "text-red-400" : "text-mint"
              }`}
            >
              {s.change}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
