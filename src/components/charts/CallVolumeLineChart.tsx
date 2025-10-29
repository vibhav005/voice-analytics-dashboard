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

  // stash prev values from Supabase before confirming overwrite
  const pendingPrevCalls = useRef<number[] | null>(null);
  const pendingPrevFails = useRef<number[] | null>(null);

  // hydrate from localStorage + Supabase
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

  // load previous values from Supabase and maybe ask to overwrite
  async function hydrateAndMaybeAskOverwrite(userEmail: string) {
    setLoading(true);

    const { data: row } = await supabase
      .from("custom_metrics")
      .select("call_metrics_calls, call_metrics_fail")
      .eq("email", userEmail)
      .maybeSingle();

    if (row && (row.call_metrics_calls || row.call_metrics_fail)) {
      pendingPrevCalls.current = row.call_metrics_calls ?? DEFAULT_CALLS;
      pendingPrevFails.current = row.call_metrics_fail ?? DEFAULT_FAILS;

      setShowConfirm(true);
      setLoading(false);
      return;
    }

    // no previous row, so preload current chart numbers
    setCallsArr(chartData.map((p) => p.calls));
    setFailsArr(chartData.map((p) => p.fail));
    setIsEditing(true);
    setLoading(false);
  }

  function handleConfirmOverwrite() {
    if (pendingPrevCalls.current && pendingPrevFails.current) {
      setCallsArr(pendingPrevCalls.current);
      setFailsArr(pendingPrevFails.current);
    }
    pendingPrevCalls.current = null;
    pendingPrevFails.current = null;

    setShowConfirm(false);
    setIsEditing(true);
  }

  function handleCancelOverwrite() {
    pendingPrevCalls.current = null;
    pendingPrevFails.current = null;
    setShowConfirm(false);
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

    // reflect visually in chart
    const updatedData = combineData(LABELS, callsArr, failsArr);
    setChartData(updatedData);

    setLoading(true);

    // keep other columns from Supabase row so we don't blow them away
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
        ], // fallback resolution data
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

  // derived info for insight block
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
      {/* email gate modal */}
      <EmailGateModal
        visible={showEmailModal}
        onSubmitEmail={handleEmailSubmitted}
        onClose={() => setShowEmailModal(false)}
      />

      {/* overwrite confirm modal */}
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
          card-glass relative flex flex-col
          border border-borderDim rounded-xl3 shadow-cardGlow
          p-4 md:p-5 h-[460px]
          animate-fade-up opacity-0
        "
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white/80 text-xs md:text-sm">
            <div className="h-8 w-8 rounded-full border border-mint/40 flex items-center justify-center shadow-[0_0_30px_rgba(167,243,208,0.4)]">
              <div className="h-2 w-2 rounded-full bg-mint animate-pulse shadow-[0_0_20px_rgba(167,243,208,0.8)]" />
            </div>
            <div className="text-textDim mt-3">Loading…</div>
          </div>
        )}

        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          {/* left side (title + description) */}
          <div className="flex flex-col">
            <div className="text-white font-semibold text-sm md:text-base tracking-tight flex items-center gap-2 flex-wrap">
              <span>Call Volume vs Failures</span>
              <span className="text-[9px] md:text-[10px] text-black bg-mint rounded-pill px-2 py-[2px] font-medium leading-none">
                live
              </span>
            </div>

            <div className="text-textMuted text-[10px] md:text-xs mt-1 leading-relaxed">
              Last 7 days of production traffic. We're watching total call load
              and failure outcomes.
            </div>
          </div>

          {/* right side (edit controls) */}
          <div className="flex flex-col items-start gap-2 text-[10px] md:text-xs min-w-[160px]">
            {!isEditing ? (
              <button
                className="btn-pill w-full flex items-center justify-center px-4 py-2"
                onClick={handleStartEdit}
              >
                Edit Values
              </button>
            ) : (
              <div className="flex w-full gap-2">
                <button
                  className="
                    flex-1 rounded-pill border border-borderDim bg-black/40
                    text-white/80 hover:text-white hover:border-white/60
                    px-3 py-2 transition-colors text-[10px] md:text-xs
                  "
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>

                <button
                  className="btn-pill flex-1 flex items-center justify-center px-3 py-2 text-[10px] md:text-xs"
                  onClick={handleSave}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            )}

            <div className="text-textDim text-[10px] leading-snug">
              Your edits are saved per-email in Supabase.
            </div>
          </div>
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

        {/* editing panel */}
        {isEditing && (
          <div className="mt-6 text-white/80 border-t border-borderDim/40 pt-4">
            {/* header / legend for editor */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
              <div>
                <div className="text-white font-medium text-xs md:text-sm flex items-center gap-2">
                  Edit Call Load & Failures
                  <span className="text-[9px] text-black bg-mint rounded-pill px-2 py-[2px] font-medium leading-none">
                    last 7d
                  </span>
                </div>
                <div className="text-textDim text-[10px] md:text-xs leading-relaxed max-w-md">
                  Update traffic and failure counts. These changes will update
                  the chart and persist to Supabase for your email.
                </div>
              </div>

              <div className="text-[10px] md:text-xs text-textDim leading-relaxed">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_8px_rgba(167,243,208,0.8)]" />
                    <span className="text-[10px] text-mint font-medium">
                      Good
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,77,77,0.6)]" />
                    <span className="text-[10px] text-red-400 font-medium">
                      Spike
                    </span>
                  </span>
                </div>
                <div className="text-[9px] text-textDim mt-1 leading-snug max-w-xs">
                  Spike = high failure rate % for that day.
                </div>
              </div>
            </div>

            {/* table-like editor */}
            <div
              className="
                rounded-xl border border-borderDim bg-black/30 backdrop-blur-sm
                shadow-inner overflow-hidden
              "
            >
              {/* header row - hidden on mobile for cleaner look */}
              <div
                className="
                  hidden sm:grid grid-cols-[auto_1fr_1fr_auto]
                  px-4 py-2
                  text-xs font-medium tracking-tight
                  text-textDim uppercase
                  bg-black/40 border-b border-borderDim/60
                "
              >
                <div>Day</div>
                <div className="text-center">Calls</div>
                <div className="text-center">Failures</div>
                <div className="text-right">Status</div>
              </div>

              {/* rows */}
              <div className="divide-y divide-borderDim/40">
                {LABELS.map((label, idx) => {
                  const callsVal = callsArr[idx] ?? 0;
                  const failsVal = failsArr[idx] ?? 0;
                  const failRate =
                    callsVal > 0 ? (failsVal / callsVal) * 100 : 0;
                  const isSpiky = failRate > 10; // >10% fail -> spike

                  return (
                    <div
                      key={label}
                      className="
                        grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto]
                        gap-3 sm:gap-4
                        px-4 py-4
                        text-xs items-center
                        bg-black/20 hover:bg-black/30 transition-colors
                      "
                    >
                      {/* Day label */}
                      <div className="text-white font-semibold flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-sm md:text-base leading-none">
                          {label}
                        </span>
                        {/* Status pill on mobile - shown inline with day */}
                        <div className="sm:hidden">
                          {isSpiky ? (
                            <span
                              className="
                                inline-flex items-center gap-1
                                text-[10px] font-semibold
                                text-red-400 bg-red-400/10 border border-red-400/40
                                px-2 py-1 rounded-pill leading-none
                              "
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,77,77,0.8)]" />
                              <span>{failRate.toFixed(0)}%</span>
                            </span>
                          ) : (
                            <span
                              className="
                                inline-flex items-center gap-1
                                text-[10px] font-semibold
                                text-mint bg-mint/10 border border-mint/40
                                px-2 py-1 rounded-pill leading-none
                              "
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(167,243,208,0.8)]" />
                              <span>{failRate.toFixed(0)}%</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Inputs container - side by side on mobile, centered on desktop */}
                      <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
                        {/* Calls input */}
                        <div className="flex justify-start sm:justify-center">
                          <div className="flex flex-col w-full sm:w-auto sm:min-w-[90px] sm:max-w-[110px]">
                            <label className="text-[10px] md:text-xs text-textDim mb-1.5 leading-none text-left sm:text-center font-medium">
                              Calls
                            </label>
                            <input
                              type="number"
                              min={0}
                              className="
                                rounded-lg bg-black/60
                                border border-borderDim
                                text-white text-sm md:text-base
                                px-3 py-2.5 md:py-3 text-center
                                outline-none
                                focus:border-mint focus:ring-1 focus:ring-mint/50
                                transition-all
                                hover:border-mint/30
                              "
                              value={callsVal}
                              onChange={(e) =>
                                handleCallsChange(idx, e.target.value)
                              }
                            />
                          </div>
                        </div>

                        {/* Fail input */}
                        <div className="flex justify-end sm:justify-center">
                          <div className="flex flex-col w-full sm:w-auto sm:min-w-[90px] sm:max-w-[110px]">
                            <label className="text-[10px] md:text-xs text-textDim mb-1.5 leading-none text-right sm:text-center font-medium">
                              Failures
                            </label>
                            <input
                              type="number"
                              min={0}
                              className="
                                rounded-lg bg-black/60
                                border border-borderDim
                                text-white text-sm md:text-base
                                px-3 py-2.5 md:py-3 text-center
                                outline-none
                                focus:border-mint focus:ring-1 focus:ring-mint/50
                                transition-all
                                hover:border-mint/30
                              "
                              value={failsVal}
                              onChange={(e) =>
                                handleFailsChange(idx, e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Status pill - desktop only */}
                      <div className="hidden sm:flex justify-end">
                        {isSpiky ? (
                          <span
                            className="
                              inline-flex items-center gap-1
                              text-[10px] font-semibold
                              text-red-400 bg-red-400/10 border border-red-400/40
                              px-2 py-1 rounded-pill leading-none
                            "
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,77,77,0.8)]" />
                            <span>{failRate.toFixed(0)}%</span>
                          </span>
                        ) : (
                          <span
                            className="
                              inline-flex items-center gap-1
                              text-[10px] font-semibold
                              text-mint bg-mint/10 border border-mint/40
                              px-2 py-1 rounded-pill leading-none
                            "
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(167,243,208,0.8)]" />
                            <span>{failRate.toFixed(0)}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* helper note */}
            <div className="text-[9px] md:text-[10px] text-textDim leading-relaxed mt-3">
              High failure % means escalation pressure and possible intent / ASR
              issues. These are the days you investigate first.
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
            This is where you staff / autoscale. Failures = escalation pressure.
          </div>
          <div className="mt-2">
            *Your call volume + failure data is saved per email in Supabase.
          </div>
        </div>
      </div>
    </>
  );
}
