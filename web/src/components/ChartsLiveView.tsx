"use client";

import { ChartsView } from "@/components/ChartsView";
import { usePatientLive } from "@/components/PatientLiveProvider";

type Props = {
  patientId: string;
  timezone: string;
};

export function ChartsLiveView({ patientId, timezone }: Props) {
  const { refreshNonce } = usePatientLive();

  return (
    <ChartsView
      patientId={patientId}
      timezone={timezone}
      refreshNonce={refreshNonce}
    />
  );
}
