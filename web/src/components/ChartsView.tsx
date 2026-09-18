"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatEventLabel } from "@/lib/utils";
import { EVENT_COLORS, EVENT_LABELS } from "@/lib/types";
import type { BucketReport, EventType, EventWithMedication } from "@/lib/types";

type Props = {
  patientId: string;
  timezone: string;
};

type Granularity = "hourly" | "daily";

const CHART_MARGIN = { top: 12, right: 16, left: 4, bottom: 8 };

function formatAxisTime(value: string, granularity: Granularity) {
  return format(parseISO(value), granularity === "hourly" ? "MMM d ha" : "MMM d");
}

function eventDetail(event: EventWithMedication) {
  if (event.type === "med_taken" && event.medications?.name) {
    return event.medications.name;
  }
  if (event.type === "pain" && event.pain_level != null) {
    return `Level ${event.pain_level}/10`;
  }
  return "—";
}

export function ChartsView({ patientId, timezone }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("hourly");
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [buckets, setBuckets] = useState<BucketReport[]>([]);
  const [events, setEvents] = useState<EventWithMedication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const from = new Date(`${fromDate}T00:00:00`).toISOString();
      const to = new Date(`${toDate}T23:59:59.999`).toISOString();
      const fn = granularity === "hourly" ? "events_hourly" : "events_daily";

      const [{ data: bucketData, error: bucketError }, { data: eventData, error: eventError }] =
        await Promise.all([
          supabase.rpc(fn, {
            p_patient_id: patientId,
            p_from: from,
            p_to: to,
          }),
          supabase
            .from("events")
            .select("*, medications(name)")
            .eq("patient_id", patientId)
            .gte("recorded_at", from)
            .lte("recorded_at", to)
            .order("recorded_at", { ascending: true }),
        ]);

      if (bucketError || eventError) {
        setError(bucketError?.message ?? eventError?.message ?? "Failed to load chart data");
        setLoading(false);
        return;
      }

      setBuckets((bucketData ?? []) as BucketReport[]);
      setEvents((eventData ?? []) as EventWithMedication[]);
      setLoading(false);
    }

    load();
  }, [patientId, granularity, fromDate, toDate]);

  const barChartData = useMemo(
    () =>
      buckets.map((bucket) => ({
        bucket: bucket.bucket,
        label: formatAxisTime(bucket.bucket, granularity),
        feel_great: bucket.feel_great_count,
        dizzy: bucket.dizzy_count,
        pain: bucket.pain_count,
        med_taken: bucket.med_taken_count,
      })),
    [buckets, granularity],
  );

  const painLineData = useMemo(
    () =>
      events
        .filter((event) => event.type === "pain" && event.pain_level != null)
        .map((event) => ({
          bucket: event.recorded_at,
          label: formatAxisTime(event.recorded_at, granularity),
          time: formatDateTime(event.recorded_at, timezone),
          pain_level: event.pain_level as number,
        })),
    [events, granularity, timezone],
  );

  const eventGrid = useMemo(
    () => [...events].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)),
    [events],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <label className="block">
          <span className="text-sm font-medium">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] px-3 py-2"
          />
        </label>
        <div className="flex rounded-lg border border-[var(--border)] p-1">
          {(["hourly", "daily"] as Granularity[]).map((option) => (
            <button
              key={option}
              onClick={() => setGranularity(option)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                granularity === option
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        {(Object.keys(EVENT_COLORS) as EventType[]).map((type) => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: EVENT_COLORS[type] }}
              aria-hidden
            />
            <span>{EVENT_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading charts...</p>}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Pain level over time</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each point is a pain check-in (1–10).
        </p>
        <div className="mt-4 h-80">
          {painLineData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
              No pain readings in this date range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={painLineData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  minTickGap={28}
                  tick={{ fontSize: 12 }}
                  angle={-25}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 12 }}
                  label={{ value: "Pain level", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}/10`, "Pain level"]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.time ?? ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="pain_level"
                  name="Pain level"
                  stroke={EVENT_COLORS.pain}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: EVENT_COLORS.pain, strokeWidth: 0 }}
                  activeDot={{ r: 7 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Check-in counts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Grouped bar chart by {granularity === "hourly" ? "hour" : "day"}.
        </p>
        <div className="mt-4 h-80">
          {barChartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
              No check-ins in this date range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={CHART_MARGIN} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  minTickGap={28}
                  tick={{ fontSize: 12 }}
                  angle={-25}
                  textAnchor="end"
                  height={56}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="feel_great"
                  name="Feel great"
                  fill={EVENT_COLORS.feel_great}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="dizzy"
                  name="Dizzy"
                  fill={EVENT_COLORS.dizzy}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="pain"
                  name="Pain"
                  fill={EVENT_COLORS.pain}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="med_taken"
                  name="Meds taken"
                  fill={EVENT_COLORS.med_taken}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Check-in log</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every button press in the selected range, color-coded to match the iPhone app.
        </p>

        {eventGrid.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No check-ins in this date range.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th className="py-2 pr-4 font-medium">Color</th>
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Check-in</th>
                  <th className="py-2 pr-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {eventGrid.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-[var(--border)] last:border-b-0"
                  >
                    <td className="py-3 pr-4">
                      <span
                        className="inline-block h-8 w-8 rounded-md border border-black/5 shadow-sm"
                        style={{ backgroundColor: EVENT_COLORS[event.type] }}
                        title={EVENT_LABELS[event.type]}
                        aria-label={EVENT_LABELS[event.type]}
                      />
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-[var(--muted)]">
                      {formatDateTime(event.recorded_at, timezone)}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {event.type === "med_taken" && event.medications?.name
                        ? `Took ${event.medications.name}`
                        : formatEventLabel(event.type, event.pain_level)}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted)]">{eventDetail(event)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
