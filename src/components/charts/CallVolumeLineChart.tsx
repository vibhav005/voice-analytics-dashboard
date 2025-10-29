import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import EmailGateModal from "../EmailGateModal";
import ConfirmModal from "../ConfirmModal";
import { ToastType } from "../Toast";

type DayPoint = {
  day: string;
  calls: number;
  fail: number;
};

interface Props {
  notify: (msg: string, type: ToastType) => void;
}

// Mon→Sun
const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_CALLS = [180, 220, 205, 260, 240, 120, 90];
const DEFAULT_FAILS = [14, 18, 9, 21, 17, 4, 2];

function combineData(
  labels: string[],
  calls: number[],
  fails: number[]
): DayPoint[] {
  return labels.map((day, i) => ({
    day,
    calls: calls[i] ?? 0,
    fail: fails[i] ?? 0,
  }));
}

export default function CallVolumeLineChart({ notify }: Props) {
  // chart state
  const [callsArr, setCallsArr] = useState<number[]>([...DEFAULT_CALLS]);
  const [failsArr, setFailsArr] = useState<number[]>([...DEFAULT_FAILS]);
  const [chartData, setChartData] = useState<DayPoint[]>(
    combineData(LABELS, DEFAULT_CALLS, DEFAULT_FAILS)
  );

  // editing mode
  const [isEditing, setIsEditing] = useState(false);

  // auth
  const [email, setEmail] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // loading / overlay
  const [loading, setLoading] = useState(false);

  // confirm modal for overwrite
  const [showConfirm, setShowConfirm] = useState(false);
  // We'll temporarily stash what we loaded from Supabase here:
  const pendingPrevCalls = useRef<number[] | null>(null);
  const pendingPrevFails = useRef<number[] | null>(null);

  // pull from localStorage on mount
  useEffect(() => {
    const cachedEmail = window.localStorage.getItem("voiq-email");
    if (!cachedEmail) return;

    setEmail(cachedEmail);
    (async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from("custom_metrics")
        .select("call_metrics_calls, call_metrics_fail")
        .eq("email", cachedEmail)
        .maybeSingle();

      if (row && (row.call_metrics_calls || row.call_metrics_fail)) {
        const restoredCalls: number[] = row.call_metrics_calls ?? DEFAULT_CALLS;
        const restoredFails: number[] = row.call_metrics_fail ?? DEFAULT_FAILS;
        setCallsArr(restoredCalls);
        setFailsArr(restoredFails);
        setChartData(combineData(LABELS, restoredCalls, restoredFails));
      }
      setLoading(false);
    })();
  }, []);

  async function handleStartEdit() {
    if (!email) {
      setShowEmailModal(true);
    } else {
      await hydrateAndMaybeAskOverwrite(email);
    }
  }

  // pull previous values from Supabase and decide whether we need user confirm
  async function hydrateAndMaybeAskOverwrite(userEmail: string) {
    setLoading(true);

    const { data: row } = await supabase
      .from("custom_metrics")
      .select("call_metrics_calls, call_metrics_fail")
      .eq("email", userEmail)
      .maybeSingle();

    // user has saved values before
    if (row && (row.call_metrics_calls || row.call_metrics_fail)) {
      // hold onto what we found
      pendingPrevCalls.current = row.call_metrics_calls ?? DEFAULT_CALLS;
      pendingPrevFails.current = row.call_metrics_fail ?? DEFAULT_FAILS;

      // show the confirmation modal instead of window.confirm
      setShowConfirm(true);
      setLoading(false);
      return;
    }

    // no previous row: just preload with current data
    setCallsArr(chartData.map((p) => p.calls));
    setFailsArr(chartData.map((p) => p.fail));
    setIsEditing(true);
    setLoading(false);
  }

  function handleConfirmOverwrite() {
    // user clicked "Yes, overwrite"
    if (pendingPrevCalls.current && pendingPrevFails.current) {
      setCallsArr(pendingPrevCalls.current);
      setFailsArr(pendingPrevFails.current);
    }
    // clear refs
    pendingPrevCalls.current = null;
    pendingPrevFails.current = null;

    setShowConfirm(false);
    setIsEditing(true);
  }

  function handleCancelOverwrite() {
    // user clicked cancel
    pendingPrevCalls.current = null;
    pendingPrevFails.current = null;
    setShowConfirm(false);
    // do not enter edit mode
  }

  async function handleEmailSubmitted(userEmail: string) {
    setEmail(userEmail);
    window.localStorage.setItem("voiq-email", userEmail);
    setShowEmailModal(false);
    await hydrateAndMaybeAskOverwrite(userEmail);
  }

  function handleCallsChange(index: number, val: string) {
    const numVal = Number(val);
    const clone = [...callsArr];
    clone[index] = isNaN(numVal) ? 0 : numVal;
    setCallsArr(clone);
  }

  function handleFailsChange(index: number, val: string) {
    const numVal = Number(val);
    const clone = [...failsArr];
    clone[index] = isNaN(numVal) ? 0 : numVal;
    setFailsArr(clone);
  }

  async function handleSave() {
    if (!email) return;

    // reflect visually
    const updatedData = combineData(LABELS, callsArr, failsArr);
    setChartData(updatedData);

    setLoading(true);

    // also load resolution + SLA so we don't blow them away
    const { data: existingRow } = await supabase
      .from("custom_metrics")
      .select("resolution_times, target_resolution_sla")
      .eq("email", email)
      .maybeSingle();

    const { error: writeError } = await supabase.from("custom_metrics").upsert(
      {
        email,
        call_metrics_calls: callsArr,
        call_metrics_fail: failsArr,
        resolution_times: existingRow?.resolution_times ?? [
          44, 39, 42, 47, 41, 38, 36,
        ], // fallback
        target_resolution_sla: existingRow?.target_resolution_sla ?? 45,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    setLoading(false);
    setIsEditing(false);

    if (writeError) {
      notify("Error saving call metrics", "error");
    } else {
      notify("Call metrics saved", "success");
    }
  }

  // insight section
  const peak = chartData.reduce(
    (acc, cur) => (cur.calls > acc.calls ? cur : acc),
    chartData[0]
  );
  const last = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const failDelta = last && prev ? last.fail - prev.fail : 0;
  const failDirection =
    failDelta < 0
      ? `Failures dropping (-${Math.abs(failDelta)})`
      : failDelta > 0
      ? `Failures rising (+${failDelta})`
      : "Failures unchanged";

  return (
    <>
      {/* ask for email before editing */}
      <EmailGateModal
        visible={showEmailModal}
        onSubmitEmail={handleEmailSubmitted}
        onClose={() => setShowEmailModal(false)}
      />

      {/* confirm overwrite previous data */}
      <ConfirmModal
        visible={showConfirm}
        title="Overwrite previous values?"
        body="We found your previously saved call metrics. Do you want to load them and continue editing? (This will replace current unsaved values.)"
        confirmLabel="Yes, load mine"
        cancelLabel="No, keep current"
        onConfirm={handleConfirmOverwrite}
        onCancel={handleCancelOverwrite}
      />

      <div
        className="
          card-glass relative flex flex-col h-[400px]
          border border-borderDim rounded-xl3 shadow-cardGlow
          p-4 md:p-5
          animate-fade-up opacity-0
        "
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white/80 text-xs md:text-sm">
            <div className="h-3 w-3 rounded-full bg-mint animate-pulse mb-3 shadow-[0_0_20px_rgba(167,243,208,0.8)]" />
            <div className="text-textDim">Loading…</div>
          </div>
        )}

        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex flex-col">
            <div className="text-white font-semibold text-sm md:text-base tracking-tight flex items-center gap-2">
              <span>Call Volume vs Failures</span>
              <span className="text-[9px] md:text-[10px] text-black bg-mint rounded-pill px-2 py-[2px] font-medium">
                live
              </span>
            </div>

            <div className="text-textMuted text-[10px] md:text-xs mt-1">
              Last 7 days of production traffic
            </div>
          </div>

          {!isEditing ? (
            <button
              className="btn-pill text-[10px] md:text-xs whitespace-nowrap flex items-center gap-1"
              onClick={handleStartEdit}
            >
              <span>Edit Values</span>
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                className="
                  rounded-pill border border-borderDim bg-black/40
                  text-white/80 hover:text-white hover:border-white/60
                  text-[10px] md:text-xs px-3 py-1.5
                  backdrop-blur-md transition-colors
                "
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>

              <button
                className="btn-pill text-[10px] md:text-xs"
                onClick={handleSave}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* chart */}
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="day"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(167,243,208,0.4)",
                  borderRadius: "0.75rem",
                  color: "white",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(167,243,208,0.12)",
                }}
                labelStyle={{
                  color: "rgba(167,243,208,0.9)",
                  fontWeight: 600,
                }}
                itemStyle={{
                  color: "white",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "11px",
                  paddingTop: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="calls"
                name="Calls"
                stroke="#a7f3d0"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="fail"
                name="Failed Calls"
                stroke="#ff4d4d"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* editing inputs */}
        {isEditing && (
          <div className="mt-4 text-white/80">
            <div className="text-textDim text-[10px] md:text-xs mb-3">
              Update call volume + failures for each day:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[10px] md:text-xs">
              {LABELS.map((label, idx) => (
                <div
                  key={label}
                  className="
                    flex flex-col bg-black/40 rounded-xl p-3
                    border border-borderDim
                  "
                >
                  <div className="text-white font-semibold text-xs flex items-center gap-2">
                    <span>{label}</span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <label className="text-textDim text-[10px] mb-1">
                        Calls
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="
                          rounded-lg bg-black/60
                          border border-borderDim
                          text-white text-[10px] px-2 py-1
                          outline-none
                          focus:border-mint focus:ring-0
                          transition-colors
                        "
                        value={callsArr[idx] ?? 0}
                        onChange={(e) => handleCallsChange(idx, e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-textDim text-[10px] mb-1">
                        Fail
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="
                          rounded-lg bg-black/60
                          border border-borderDim
                          text-white text-[10px] px-2 py-1
                          outline-none
                          focus:border-mint focus:ring-0
                          transition-colors
                        "
                        value={failsArr[idx] ?? 0}
                        onChange={(e) => handleFailsChange(idx, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* insights */}
        <div className="text-[10px] md:text-xs text-textMuted mt-4 border-t border-borderDim/40 pt-3 leading-relaxed">
          <div>
            Peak load:{" "}
            <span className="text-mint font-semibold">
              {peak.day} ({peak.calls} calls)
            </span>
            . {failDirection}.
          </div>
          <div>
            This is where you staff / autoscale. Failures proxy escalation
            pressure.
          </div>
          <div className="mt-2">
            *Your call volume + failure data is saved per email in Supabase.
          </div>
        </div>
      </div>
    </>
  );
}
