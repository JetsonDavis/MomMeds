"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { EventWithMedication } from "@/lib/types";

export type RealtimeConnectionStatus = "connecting" | "connected" | "error";

type InsertedEventRow = {
  id: string;
  patient_id: string;
};

export function usePatientEventsRealtime(
  patientId: string,
  onInsert: (event: EventWithMedication) => void,
) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function handleInsert(inserted: InsertedEventRow) {
      if (inserted.patient_id !== patientId) {
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*, medications(name)")
        .eq("id", inserted.id)
        .maybeSingle();

      if (!error && data) {
        onInsertRef.current(data as EventWithMedication);
      }
    }

    async function subscribeWithToken(accessToken: string) {
      if (cancelled) {
        return;
      }

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      // Required for postgres_changes with RLS on supabase-js < 2.58.
      await supabase.realtime.setAuth(accessToken);

      channel = supabase
        .channel(`patient-events:${patientId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "events",
          },
          async (payload) => {
            await handleInsert(payload.new as InsertedEventRow);
          },
        )
        .subscribe((subscriptionStatus, err) => {
          if (cancelled) {
            return;
          }

          if (subscriptionStatus === "SUBSCRIBED") {
            setStatus("connected");
            return;
          }

          if (
            subscriptionStatus === "CHANNEL_ERROR" ||
            subscriptionStatus === "TIMED_OUT" ||
            subscriptionStatus === "CLOSED"
          ) {
            setStatus("error");
            if (err) {
              console.error("MomMeds realtime subscription error:", err);
            }
          }
        });
    }

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) {
        return;
      }

      if (!session?.access_token) {
        setStatus("error");
        if (channel) {
          await supabase.removeChannel(channel);
          channel = null;
        }
        return;
      }

      setStatus("connecting");
      await subscribeWithToken(session.access_token);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) {
        return;
      }

      if (!session?.access_token) {
        setStatus("error");
        return;
      }

      subscribeWithToken(session.access_token);
    });

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [patientId]);

  return { status };
}
