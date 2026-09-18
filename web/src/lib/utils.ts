import { format, parseISO } from "date-fns";
import { EVENT_LABELS, type EventType } from "@/lib/types";

export function formatDateTime(value: string, timezone?: string) {
  const date = parseISO(value);
  if (timezone) {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date);
  }
  return format(date, "MMM d, yyyy h:mm a");
}

export function isEventToday(recordedAt: string, timezone: string) {
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dayFormatter.format(new Date(recordedAt)) === dayFormatter.format(new Date());
}

export function formatEventLabel(type: EventType, painLevel?: number | null) {
  if (type === "pain" && painLevel != null) {
    return `${EVENT_LABELS[type]} (${painLevel}/10)`;
  }
  return EVENT_LABELS[type];
}

export function generatePairingCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
