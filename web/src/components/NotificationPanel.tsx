"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { CaregiverMessage, Patient } from "@/lib/types";

const INTERVAL_OPTIONS = [
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every 1 hour" },
  { value: 120, label: "Every 2 hours" },
  { value: 240, label: "Every 4 hours" },
  { value: 360, label: "Every 6 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Every 24 hours" },
];

type Props = {
  patient: Patient;
  timezone: string;
  initialMessages: CaregiverMessage[];
};

export function NotificationPanel({ patient, timezone, initialMessages }: Props) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    patient.notifications_enabled,
  );
  const [reminderIntervalMinutes, setReminderIntervalMinutes] = useState(
    patient.reminder_interval_minutes,
  );
  const [messages, setMessages] = useState(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveSettings(nextEnabled: boolean, nextInterval: number) {
    setSavingSettings(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("patients")
      .update({
        notifications_enabled: nextEnabled,
        reminder_interval_minutes: nextInterval,
      })
      .eq("id", patient.id);

    setSavingSettings(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Notification settings saved. The iPhone will pick these up on its next sync.");
  }

  async function handleToggle(enabled: boolean) {
    setNotificationsEnabled(enabled);
    await saveSettings(enabled, reminderIntervalMinutes);
  }

  async function handleIntervalChange(minutes: number) {
    setReminderIntervalMinutes(minutes);
    await saveSettings(notificationsEnabled, minutes);
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed) {
      return;
    }

    setSendingMessage(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("caregiver_messages")
      .insert({
        patient_id: patient.id,
        message: trimmed,
        sent_by: user?.id ?? null,
      })
      .select("*")
      .single();

    setSendingMessage(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Failed to send message");
      return;
    }

    setMessages((current) => [data as CaregiverMessage, ...current]);
    setMessageText("");
    setSuccess("Message sent. It will appear on the iPhone on the next sync.");
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-semibold">Notifications &amp; messages</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Control check-in reminders on the patient&apos;s iPhone and send a message.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      <div className="mt-6 space-y-5">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Check-in reminders</span>
          <button
            type="button"
            role="switch"
            aria-checked={notificationsEnabled}
            disabled={savingSettings}
            onClick={() => handleToggle(!notificationsEnabled)}
            className={`relative h-7 w-12 rounded-full transition ${
              notificationsEnabled ? "bg-[var(--primary)]" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                notificationsEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Reminder frequency</span>
          <select
            value={reminderIntervalMinutes}
            disabled={!notificationsEnabled || savingSettings}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-[var(--border)] px-3 py-2 disabled:opacity-50"
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={handleSendMessage} className="space-y-3 border-t border-[var(--border)] pt-5">
          <label className="block">
            <span className="text-sm font-medium">Send a message to the iPhone</span>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Hi Mom — remember to take your afternoon meds."
              className="mt-1 block w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={sendingMessage || !messageText.trim()}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {sendingMessage ? "Sending..." : "Send message"}
          </button>
        </form>

        <div className="border-t border-[var(--border)] pt-5">
          <h3 className="text-sm font-semibold">Recent messages</h3>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {messages.length === 0 ? (
              <li className="py-3 text-sm text-[var(--muted)]">No messages sent yet.</li>
            ) : (
              messages.map((message) => (
                <li key={message.id} className="py-3 text-sm">
                  <p>{message.message}</p>
                  <p className="mt-1 text-[var(--muted)]">
                    {formatDateTime(message.sent_at, timezone)}
                    {message.delivered_at ? " · Delivered" : " · Pending delivery"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
