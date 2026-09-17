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
import { EVENT_COLORS } from "@/lib/types";
import type { BucketReport, EventWithMedication } from "@/lib/types";

type Props = {
  patientId: string;
  timezone: string;
};

type Granularity = "hourly" | "daily";

export function ChartsView({ patientId, timezone }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("hourly");
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [buckets, setBuckets] = useState<BucketReport[]>([]);
  const [medEvents, setMedEvents] = useState<EventWithMedication[]>([]);
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

      const [{ data: bucketData, error: bucketError }, { data: medData, error: medError }] =
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
            .eq("type", "med_taken")
            .gte("recorded_at", from)
            .lte("recorded_at", to)
            .order("recorded_at", { ascending: true }),
        ]);

      if (bucketError || medError) {
        setError(bucketError?.message ?? medError?.message ?? "Failed to load chart data");
        setLoading(false);
        return;
      }

      setBuckets((bucketData ?? []) as BucketReport[]);
      setMedEvents((medData ?? []) as EventWithMedication[]);
      setLoading(false);
    }

    load();
  }, [patientId, granularity, fromDate, toDate]);

  const chartData = useMemo(
    () =>
      buckets.map((bucket) => ({
        label: format(
          parseISO(bucket.bucket),
          granularity === "hourly" ? "MMM d ha" : "MMM d",
        ),
        feel_great: bucket.feel_great_count,
        dizzy: bucket.dizzy_count,
        pain: bucket.pain_count,
        med_taken: bucket.med_taken_count,
        avg_pain: bucket.avg_pain ?? 0,
        max_pain: bucket.max_pain ?? 0,
      })),
    [buckets, granularity],
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

      {loading && <p className="text-sm text-[var(--muted)]">Loading charts...</p>}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Pain level</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={24} />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avg_pain"
                name="Average pain"
                stroke={EVENT_COLORS.pain}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="max_pain"
                name="Max pain"
                stroke="#991b1b"
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Event counts</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={24} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="feel_great" stackId="events" fill={EVENT_COLORS.feel_great} name="Feel great" />
              <Bar dataKey="dizzy" stackId="events" fill={EVENT_COLORS.dizzy} name="Dizzy" />
              <Bar dataKey="pain" stackId="events" fill={EVENT_COLORS.pain} name="Pain" />
              <Bar dataKey="med_taken" stackId="events" fill={EVENT_COLORS.med_taken} name="Meds taken" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Medications taken</h2>
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {medEvents.length === 0 ? (
            <li className="py-3 text-sm text-[var(--muted)]">No medication events in this range.</li>
          ) : (
            medEvents.map((event) => (
              <li key={event.id} className="flex justify-between py-3 text-sm">
                <span>{event.medications?.name ?? "Unknown medication"}</span>
                <span className="text-[var(--muted)]">
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: timezone,
                  }).format(parseISO(event.recorded_at))}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold">Data table</h2>
        <table className="mt-4 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)]">
              <th className="py-2 pr-4">Period</th>
              <th className="py-2 pr-4">Feel great</th>
              <th className="py-2 pr-4">Dizzy</th>
              <th className="py-2 pr-4">Pain</th>
              <th className="py-2 pr-4">Meds</th>
              <th className="py-2 pr-4">Avg pain</th>
              <th className="py-2 pr-4">Max pain</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.label} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 pr-4">{row.feel_great}</td>
                <td className="py-2 pr-4">{row.dizzy}</td>
                <td className="py-2 pr-4">{row.pain}</td>
                <td className="py-2 pr-4">{row.med_taken}</td>
                <td className="py-2 pr-4">{row.avg_pain}</td>
                <td className="py-2 pr-4">{row.max_pain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
