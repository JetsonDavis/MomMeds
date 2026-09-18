"use client";

import { EVENT_COLORS, EVENT_LABELS, type EventType } from "@/lib/types";

export type LiveEventNotification = {
  id: string;
  type: EventType;
  message: string;
  detail?: string;
};

type Props = {
  notification: LiveEventNotification | null;
  onDismiss: () => void;
  connectionStatus?: "connecting" | "connected" | "error";
};

export function EventLiveNotifier({
  notification,
  onDismiss,
  connectionStatus = "connecting",
}: Props) {
  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            connectionStatus === "connected"
              ? "bg-green-50 text-green-800"
              : connectionStatus === "error"
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500 animate-pulse"
                : connectionStatus === "error"
                  ? "bg-red-500"
                  : "bg-gray-400"
            }`}
            aria-hidden
          />
          {connectionStatus === "connected"
            ? "Live"
            : connectionStatus === "error"
              ? "Live disconnected"
              : "Connecting…"}
        </span>
      </div>

      {notification && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
              style={{ backgroundColor: EVENT_COLORS[notification.type] }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">New check-in received</p>
              <p className="mt-1 text-sm">{notification.message}</p>
              {notification.detail && (
                <p className="mt-0.5 text-xs text-[var(--muted)]">{notification.detail}</p>
              )}
              <p className="mt-1 text-xs text-[var(--muted)]">
                {EVENT_LABELS[notification.type]}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
