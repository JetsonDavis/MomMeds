"use client";

import { RecentEvents } from "@/components/RecentEvents";
import { usePatientLive } from "@/components/PatientLiveProvider";

type Props = {
  timezone: string;
};

export function PatientRecentEvents({ timezone }: Props) {
  const { recentEvents } = usePatientLive();

  return <RecentEvents events={recentEvents} timezone={timezone} />;
}
