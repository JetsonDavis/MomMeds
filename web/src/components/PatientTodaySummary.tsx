"use client";

import { SummaryCards } from "@/components/SummaryCards";
import { usePatientLive } from "@/components/PatientLiveProvider";

export function PatientTodaySummary() {
  const { todayEvents } = usePatientLive();

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Today&apos;s summary</h2>
      <SummaryCards events={todayEvents} />
    </div>
  );
}
