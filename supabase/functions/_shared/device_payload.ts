import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type PatientRow = {
  id: string;
  display_name: string;
  timezone: string;
  notifications_enabled: boolean;
  reminder_interval_minutes: number;
};

export async function buildDevicePayload(
  supabase: SupabaseClient,
  patient: PatientRow,
  deviceId?: string,
) {
  const { data: medications, error: medsError } = await supabase
    .from("medications")
    .select("id, name, dose, sort_order")
    .eq("patient_id", patient.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (medsError) {
    throw medsError;
  }

  const { data: pendingMessages, error: messagesError } = await supabase
    .from("caregiver_messages")
    .select("id, message, sent_at")
    .eq("patient_id", patient.id)
    .is("delivered_at", null)
    .order("sent_at", { ascending: true });

  if (messagesError) {
    throw messagesError;
  }

  const messages = pendingMessages ?? [];

  if (deviceId && messages.length > 0) {
    const now = new Date().toISOString();
    const messageIds = messages.map((entry) => entry.id);
    const { error: deliverError } = await supabase
      .from("caregiver_messages")
      .update({
        delivered_at: now,
        delivered_device_id: deviceId,
      })
      .in("id", messageIds)
      .is("delivered_at", null);

    if (deliverError) {
      throw deliverError;
    }
  }

  return {
    patient: {
      id: patient.id,
      displayName: patient.display_name,
      timezone: patient.timezone,
    },
    medications: (medications ?? []).map((med) => ({
      id: med.id,
      name: med.name,
      dose: med.dose,
      sortOrder: med.sort_order,
    })),
    notifications: {
      enabled: patient.notifications_enabled,
      reminderIntervalMinutes: patient.reminder_interval_minutes,
    },
    messages: messages.map((entry) => ({
      id: entry.id,
      message: entry.message,
      sentAt: entry.sent_at,
    })),
  };
}

export const patientSelectFields =
  "id, display_name, timezone, active, notifications_enabled, reminder_interval_minutes";
