import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import EmailGateModal from "../EmailGateModal";
import ConfirmModal from "../ConfirmModal";
import { ToastType } from "../Toast";

type DailyMetric = {
  day: string;
  avgResolution: number;
};

interface Props {
  notify: (msg: string, type: ToastType) => void;
}

const DEFAULT_DATA: DailyMetric[] = [
  { day: "Mon", avgResolution: 44 },
  { day: "Tue", avgResolution: 39 },
  { day: "Wed", avgResolution: 42 },
  { day: "Thu", avgResolution: 47 },
  { day: "Fri", avgResolution: 41 },
  { day: "Sat", avgResolution: 38 },
  { day: "Sun", avgResolution: 36 },
];

const DEFAULT_SLA = 45;

export default function ResolutionTimeEditableChart({ notify }: Props) {
  // chart data (what's rendered)
  const [data, setData] = useState<DailyMetric[]>(DEFAULT_DATA);

  // editable per-day values
  const [inputs, setInputs] = useState<number[]>(
    DEFAULT_DATA.map((d) => d.avgResolution)
  );

  // SLA target
  const [slaTarget, setSlaTarget] = useState<number>(DEFAULT_SLA);

  // edit mode
  const [isEditing, setIsEditing] = useState(false);

  // email gating / auth
  const [email, setEmail] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // confirm modal for overwrite
  const [showConfirm, setShowConfirm] = useState(false);

  // saved values pulled from Supabase before user confirms overwrite
  const pendingPrevResolutionTimes = useRef<number[] | null>(null);
  const pendingPrevSla = useRef<number | null>(null);

  // loading overlay
  const [loading, setLoading] = useState(false);

  // hydrate from localStorage on mount
  useEffect(() => {
    const cachedEmail = window.localStorage.getItem("voiq-email");
    if (!cachedEmail) return;

    setEmail(cachedEmail);

    (async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from("custom_metrics")
        .select("resolution_times, target_resolution_sla")
        .eq("email", cachedEmail)
        .maybeSingle();

      if (row && row.resolution_times) {
        const arr: number[] = row.resolution_times;
        const hydrated = DEFAULT_DATA.map((d, i) => ({
          ...d,
          avgResolution: arr[i] ?? d.avgResolution,
        }));
        setData(hydrated);
        setInputs(arr);
      }

      if (row && row.target_resolution_sla != null) {
        setSlaTarget(Number(row.target_resolution_sla));
      }

      setLoading(false);
    })();
  }, []);

  // STEP 1: user clicks "Edit Values"
  async function handleStartEdit() {
    if (!email) {
      setShowEmailModal(true);
    } else {
      await hydrateAndMaybeAskOverwrite(email);
    }
  }

  // STEP 2: load user's previous values from Supabase
  async function hydrateAndMaybeAskOverwrite(userEmail: string) {
    setLoading(true);

    const { data: row } = await supabase
      .from("custom_metrics")
      .select("resolution_times, target_resolution_sla")
      .eq("email", userEmail)
      .maybeSingle();

    if (row && row.resolution_times) {
      pendingPrevResolutionTimes.current = row.resolution_times || null;
      pendingPrevSla.current =
        row.target_resolution_sla != null
          ? Number(row.target_resolution_sla)
          : DEFAULT_SLA;

      setShowConfirm(true);
      setLoading(false);
      return;
    }

    // otherwise preload what's currently on screen
    setInputs(data.map((d) => d.avgResolution));
    setSlaTarget(slaTarget ?? DEFAULT_SLA);

    setIsEditing(true);
    setLoading(false);
  }

  // STEP 3a: confirm overwrite
  function handleConfirmOverwrite() {
    if (pendingPrevResolutionTimes.current) {
      setInputs(pendingPrevResolutionTimes.current);
    }
    if (pendingPrevSla.current != null) {
      setSlaTarget(pendingPrevSla.current);
    }

    pendingPrevResolutionTimes.current = null;
    pendingPrevSla.current = null;

    setShowConfirm(false);
    setIsEditing(true);
  }

  // STEP 3b: cancel overwrite
  function handleCancelOverwrite() {
    pendingPrevResolutionTimes.current = null;
    pendingPrevSla.current = null;
    setShowConfirm(false);
  }

  // from EmailGateModal
  async function handleEmailSubmitted(userEmail: string) {
    setEmail(userEmail);
    window.localStorage.setItem("voiq-email", userEmail);
    setShowEmailModal(false);
    await hydrateAndMaybeAskOverwrite(userEmail);
  }

  function handleInputChange(index: number, newVal: string) {
    const numVal = Number(newVal);
    const clone = [...inputs];
    clone[index] = isNaN(numVal) ? 0 : numVal;
    setInputs(clone);
  }

  function handleSlaChange(newVal: string) {
    const numVal = Number(newVal);
    setSlaTarget(isNaN(numVal) ? DEFAULT_SLA : numVal);
  }

  // SAVE updated values
  async function handleSave() {
    if (!email) return;

    // apply new inputs to the chart data visually
    const newData: DailyMetric[] = data.map((d, idx) => ({
      ...d,
      avgResolution: inputs[idx] ?? d.avgResolution,
    }));
    setData(newData);

    setLoading(true);

    // also fetch call_metrics_* so we don't blow them away
    const { data: existingRow } = await supabase
      .from("custom_metrics")
      .select("call_metrics_calls, call_metrics_fail")
      .eq("email", email)
      .maybeSingle();

    const { error: writeError } = await supabase.from("custom_metrics").upsert(
      {
        email,
        resolution_times: inputs,
        target_resolution_sla: slaTarget,
        call_metrics_calls: existingRow?.call_metrics_calls ?? null,
        call_metrics_fail: existingRow?.call_metrics_fail ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    setLoading(false);
    setIsEditing(false);

    if (writeError) {
      notify("Error saving resolution data", "error");
    } else {
      notify("Resolution data saved", "success");
    }
  }

  // derived insight values
  const maxDay = data.reduce(
    (acc, cur) =>
      cur.avgResolution > acc.value
        ? { day: cur.day, value: cur.avgResolution }
        : acc,
    { day: data[0].day, value: data[0].avgResolution }
  );

  const minDay = data.reduce(
    (acc, cur) =>
      cur.avgResolution < acc.value
        ? { day: cur.day, value: cur.avgResolution }
        : acc,
    { day: data[0].day, value: data[0].avgResolution }
  );

  const avgAll =
    data.reduce((sum, d) => sum + d.avgResolution, 0) / data.length;

  const breaching = data.filter((d) => d.avgResolution > slaTarget);
  const inBreach = breaching.length > 0;

  return (
    <>
      {/* email capture modal */}
      <EmailGateModal
        visible={showEmailModal}
        onSubmitEmail={handleEmailSubmitted}
        onClose={() => setShowEmailModal(false)}
      />

      {/* confirm overwrite modal */}
      <ConfirmModal
        visible={showConfirm}
        title="Load your saved values?"
        body="We found your previously saved resolution times and SLA target. Do you want to load them into the editor? (This will replace what's currently shown.)"
        confirmLabel="Yes, load mine"
        cancelLabel="No, keep current"
        onConfirm={handleConfirmOverwrite}
        onCancel={handleCancelOverwrite}
      />

      {/* CARD WRAPPER */}
      <div
        className="
          card-glass relative flex flex-col
          border border-borderDim rounded-xl3 shadow-cardGlow
          bg-[radial-gradient(circle_at_20%_0%,rgba(167,243,208,0.08)_0%,rgba(0,0,0,0)_60%)]
          p-0
          h-[520px]
          animate-fade-up opacity-0
        "
      >
        {/* loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="h-8 w-8 rounded-full border border-mint/40 flex items-center justify-center shadow-[0_0_30px_rgba(167,243,208,0.5)]">
              <div className="h-2 w-2 rounded-full bg-mint animate-pulse shadow-[0_0_20px_rgba(167,243,208,0.8)]" />
            </div>
            <div className="text-textDim text-[11px] md:text-sm mt-3">
              Loading…
            </div>
          </div>
        )}

        {/* HEADER */}
        <div
          className="
            flex flex-col md:flex-row md:items-start md:justify-between
            p-4 md:p-5
            border-b border-borderDim/60
            bg-black/30 backdrop-blur-md rounded-t-xl3
          "
        >
          {/* left side: title / chips / desc */}
          <div className="flex-1 mb-4 md:mb-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-white font-semibold text-sm md:text-base tracking-tight">
                Avg Resolution Time (sec) by Day
              </div>

              {/* SLA status chip */}
              <span
                className={`
                  text-[9px] md:text-[10px] font-medium
                  px-2 py-[2px] rounded-pill leading-none
                  ${inBreach ? "text-black bg-red-400" : "text-black bg-mint"}
                `}
              >
                {inBreach ? "SLA Breach" : "Within SLA"}
              </span>

              {/* SLA numeric chip */}
              <span className="text-[9px] md:text-[10px] text-black bg-mint/20 text-mint border border-mint/30 rounded-pill px-2 py-[2px] font-medium leading-none">
                SLA {slaTarget}s
              </span>
            </div>

            <div className="text-textMuted text-[10px] md:text-xs mt-2 leading-relaxed max-w-md">
              “Lower is better.” This is how long a caller waits for a real
              answer, day by day.
            </div>
          </div>

          {/* right side: edit controls */}
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

        {/* CHART */}
        <div className="flex-1 w-full px-4 md:px-5 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
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
              <ReferenceLine
                y={slaTarget}
                stroke={inBreach ? "#ff4d4d" : "#a7f3d0"}
                strokeDasharray="4 4"
                label={{
                  value: `SLA ${slaTarget}s`,
                  fill: inBreach ? "#ff4d4d" : "#a7f3d0",
                  fontSize: 10,
                }}
              />
              <Bar
                dataKey="avgResolution"
                name="Avg Resolution (sec)"
                fill="#a7f3d0"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* EDIT MODE PANEL */}
        {isEditing && (
          <div className="border-t border-borderDim/40 bg-black/20 px-4 md:px-5 pb-4 pt-4">
            {/* SLA Config Section */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="text-white font-medium text-xs md:text-sm flex items-center flex-wrap gap-2">
                  SLA Target (sec)
                  <span className="text-[9px] text-black bg-mint rounded-pill px-2 py-[2px] font-medium leading-none">
                    Alert line
                  </span>
                </div>

                <div className="text-textDim text-[10px] md:text-xs leading-relaxed mt-1 max-w-md">
                  Anything above this is considered too slow / bad caller
                  experience. This is the red line in the chart.
                </div>
              </div>

              <div className="flex flex-col w-full lg:w-auto lg:min-w-[130px] lg:max-w-[150px]">
                <label className="text-[10px] md:text-xs text-textDim mb-1.5 leading-none font-medium text-left lg:text-center">
                  Target (sec)
                </label>
                <input
                  type="number"
                  min={1}
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
                  value={slaTarget}
                  onChange={(e) => handleSlaChange(e.target.value)}
                />
              </div>
            </div>

            {/* Per-day Resolution Table */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
              <div>
                <div className="text-white font-medium text-xs md:text-sm flex items-center gap-2 flex-wrap">
                  Per-day Resolution Time
                  <span className="text-[9px] text-black bg-mint/20 text-mint border border-mint/30 rounded-pill px-2 py-[2px] font-medium leading-none">
                    sec
                  </span>
                </div>
                <div className="text-textDim text-[10px] md:text-xs leading-relaxed max-w-md mt-1">
                  Edit how long it took to actually resolve the caller’s issue
                  each day.
                </div>
              </div>

              <div className="text-[10px] md:text-xs text-textDim leading-relaxed">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_8px_rgba(167,243,208,0.8)]" />
                    <span className="text-[10px] text-mint font-medium">
                      OK
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,77,77,0.6)]" />
                    <span className="text-[10px] text-red-400 font-medium">
                      Above SLA
                    </span>
                  </span>
                </div>
                <div className="text-[9px] text-textDim mt-1 leading-snug max-w-xs">
                  We compare each day’s avg to your SLA line.
                </div>
              </div>
            </div>

            <div
              className="
                rounded-xl border border-borderDim bg-black/30 backdrop-blur-sm
                shadow-inner overflow-hidden
              "
            >
              {/* header row (hidden on mobile to save space) */}
              <div
                className="
                  hidden sm:grid grid-cols-[auto_1fr_auto]
                  px-4 py-2
                  text-xs font-medium tracking-tight
                  text-textDim uppercase
                  bg-black/40 border-b border-borderDim/60
                "
              >
                <div>Day</div>
                <div className="text-center">Avg Resolution (sec)</div>
                <div className="text-right">Status</div>
              </div>

              <div className="divide-y divide-borderDim/40">
                {data.map((d, idx) => {
                  const val = inputs[idx] ?? 0;
                  const slow = val > slaTarget;

                  return (
                    <div
                      key={d.day}
                      className="
                        grid grid-cols-1 sm:grid-cols-[auto_1fr_auto]
                        gap-3 sm:gap-4
                        px-4 py-4
                        text-xs items-center
                        bg-black/20 hover:bg-black/30 transition-colors
                      "
                    >
                      {/* Day + mobile status pill */}
                      <div className="text-white font-semibold flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-sm md:text-base leading-none">
                          {d.day}
                        </span>

                        <div className="sm:hidden">
                          {slow ? (
                            <span
                              className="
                                inline-flex items-center gap-1
                                text-[10px] font-semibold
                                text-red-400 bg-red-400/10 border border-red-400/40
                                px-2 py-1 rounded-pill leading-none
                              "
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,77,77,0.8)]" />
                              <span>{val}s</span>
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
                              <span>{val}s</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Editable input */}
                      <div className="sm:col-span-1 flex justify-start sm:justify-center">
                        <div className="flex flex-col w-full sm:w-auto sm:min-w-[90px] sm:max-w-[110px]">
                          <label className="text-[10px] md:text-xs text-textDim mb-1.5 leading-none text-left sm:text-center font-medium">
                            Avg (sec)
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
                            value={val}
                            onChange={(e) =>
                              handleInputChange(idx, e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* Desktop status pill */}
                      <div className="hidden sm:flex justify-end">
                        {slow ? (
                          <span
                            className="
                              inline-flex items-center gap-1
                              text-[10px] font-semibold
                              text-red-400 bg-red-400/10 border border-red-400/40
                              px-2 py-1 rounded-pill leading-none
                            "
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,77,77,0.8)]" />
                            <span>{val}s</span>
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
                            <span>{val}s</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[9px] md:text-[10px] text-textDim leading-relaxed mt-3">
              Slow days mean callers are waiting longer to get resolution.
              That’s where experience degrades first.
            </div>
          </div>
        )}

        {/* INSIGHT STRIP */}
        <div className="px-4 md:px-5 py-4 border-t border-borderDim/40 bg-black/10 text-[10px] md:text-[11px] leading-relaxed grid gap-3 md:grid-cols-3 text-textMuted">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-textDim font-medium">
              Slowest Day
            </span>
            <span className="text-white font-semibold">
              {maxDay.day} <span className="text-red-400">{maxDay.value}s</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-textDim font-medium">
              Fastest Day
            </span>
            <span className="text-white font-semibold">
              {minDay.day} <span className="text-mint">{minDay.value}s</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-textDim font-medium">
              SLA Status
            </span>
            {inBreach ? (
              <span className="text-red-400 font-semibold">
                {breaching.length} day(s) above {slaTarget}s SLA
              </span>
            ) : (
              <span className="text-mint font-semibold">
                All days within {slaTarget}s SLA
              </span>
            )}
          </div>

          <div className="md:col-span-3 text-[9px] md:text-[10px] text-textDim mt-1">
            *Custom values and SLA target persist per email in Supabase.
          </div>
        </div>
      </div>
    </>
  );
}
