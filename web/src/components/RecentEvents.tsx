"use client";

import { formatDateTime, formatEventLabel } from "@/lib/utils";
import type { EventWithMedication } from "@/lib/types";

type Props = {
  events: EventWithMedication[];
  timezone: string;
};

export function RecentEvents({ events, timezone }: Props) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-semibold">Recent events</h2>
      <ul className="mt-4 divide-y divide-[var(--border)]">
        {events.length === 0 ? (
          <li className="py-4 text-sm text-[var(--muted)]">No events yet.</li>
        ) : (
          events.map((event) => (
            <li key={event.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">
                  {event.type === "med_taken" && event.medications?.name
                    ? `Took ${event.medications.name}`
                    : formatEventLabel(event.type, event.pain_level)}
                </p>
                <p className="text-[var(--muted)]">
                  {formatDateTime(event.recorded_at, timezone)}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
