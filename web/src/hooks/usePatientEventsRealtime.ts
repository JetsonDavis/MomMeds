"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventWithMedication } from "@/lib/types";

export type RealtimeConnectionStatus = "connecting" | "connected" | "error";

export function usePatientEventsRealtime(
  patientId: string,
  onInsert: (event: EventWithMedication) => void,
) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`patient-events:${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `patient_id=eq.${patientId}`,
        },
        async (payload) => {
          const inserted = payload.new as { id: string };
          const { data, error } = await supabase
            .from("events")
            .select("*, medications(name)")
            .eq("id", inserted.id)
            .maybeSingle();

          if (!error && data) {
            onInsertRef.current(data as EventWithMedication);
          }
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          setStatus("connected");
        } else if (
          subscriptionStatus === "CHANNEL_ERROR" ||
          subscriptionStatus === "TIMED_OUT"
        ) {
          setStatus("error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  return { status };
}
