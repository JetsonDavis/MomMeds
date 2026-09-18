"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EventLiveNotifier,
  type LiveEventNotification,
} from "@/components/EventLiveNotifier";
import { usePatientEventsRealtime } from "@/hooks/usePatientEventsRealtime";
import { formatDateTime, formatEventLabel, isEventToday } from "@/lib/utils";
import type { Event, EventWithMedication } from "@/lib/types";

type PatientLiveContextValue = {
  todayEvents: Event[];
  recentEvents: EventWithMedication[];
  connectionStatus: "connecting" | "connected" | "error";
  refreshNonce: number;
};

const PatientLiveContext = createContext<PatientLiveContextValue | null>(null);

export function usePatientLive() {
  const context = useContext(PatientLiveContext);
  if (!context) {
    throw new Error("usePatientLive must be used within PatientLiveProvider");
  }
  return context;
}

type Props = {
  patientId: string;
  timezone: string;
  initialTodayEvents: Event[];
  initialRecentEvents: EventWithMedication[];
  children: ReactNode;
};

function notificationFromEvent(
  event: EventWithMedication,
  timezone: string,
): LiveEventNotification {
  const message =
    event.type === "med_taken" && event.medications?.name
      ? `Took ${event.medications.name}`
      : formatEventLabel(event.type, event.pain_level);

  return {
    id: event.id,
    type: event.type,
    message,
    detail: formatDateTime(event.recorded_at, timezone),
  };
}

export function PatientLiveProvider({
  patientId,
  timezone,
  initialTodayEvents,
  initialRecentEvents,
  children,
}: Props) {
  const [todayEvents, setTodayEvents] = useState(initialTodayEvents);
  const [recentEvents, setRecentEvents] = useState(initialRecentEvents);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [notification, setNotification] = useState<LiveEventNotification | null>(
    null,
  );

  const handleInsert = useCallback(
    (event: EventWithMedication) => {
      setRecentEvents((current) => {
        if (current.some((item) => item.id === event.id)) {
          return current;
        }
        return [event, ...current].slice(0, 20);
      });

      if (isEventToday(event.recorded_at, timezone)) {
        setTodayEvents((current) => {
          if (current.some((item) => item.id === event.id)) {
            return current;
          }
          return [event, ...current];
        });
      }

      setRefreshNonce((value) => value + 1);
      setNotification(notificationFromEvent(event, timezone));
    },
    [timezone],
  );

  const { status } = usePatientEventsRealtime(patientId, handleInsert);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = window.setTimeout(() => setNotification(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const value = useMemo(
    () => ({
      todayEvents,
      recentEvents,
      connectionStatus: status,
      refreshNonce,
    }),
    [todayEvents, recentEvents, status, refreshNonce],
  );

  return (
    <PatientLiveContext.Provider value={value}>
      <div className="flex justify-end">
        <EventLiveNotifier
          notification={notification}
          onDismiss={() => setNotification(null)}
          connectionStatus={status}
        />
      </div>
      {children}
    </PatientLiveContext.Provider>
  );
}
