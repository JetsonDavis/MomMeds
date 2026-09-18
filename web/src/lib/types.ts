export type EventType = "feel_great" | "dizzy" | "pain" | "med_taken";

export type Patient = {
  id: string;
  display_name: string;
  phone: string | null;
  timezone: string;
  notes: string | null;
  active: boolean;
  notifications_enabled: boolean;
  reminder_interval_minutes: number;
  created_at: string;
};

export type CaregiverMessage = {
  id: string;
  patient_id: string;
  message: string;
  sent_by: string | null;
  sent_at: string;
  delivered_at: string | null;
  delivered_device_id: string | null;
};

export type Medication = {
  id: string;
  patient_id: string;
  name: string;
  dose: string | null;
  instructions: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type DevicePublic = {
  id: string;
  patient_id: string;
  label: string | null;
  paired_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type PairingCode = {
  code: string;
  patient_id: string;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type Event = {
  id: string;
  patient_id: string;
  device_id: string | null;
  type: EventType;
  pain_level: number | null;
  medication_id: string | null;
  recorded_at: string;
  received_at: string;
  client_event_id: string;
};

export type EventWithMedication = Event & {
  medications: { name: string } | null;
};

export type BucketReport = {
  bucket: string;
  feel_great_count: number;
  dizzy_count: number;
  pain_count: number;
  med_taken_count: number;
  avg_pain: number | null;
  max_pain: number | null;
};

export const EVENT_LABELS: Record<EventType, string> = {
  feel_great: "Feel great",
  dizzy: "Dizzy / unstable",
  pain: "Pain",
  med_taken: "Medication taken",
};

export const EVENT_COLORS: Record<EventType, string> = {
  feel_great: "#16a34a",
  dizzy: "#d97706",
  pain: "#dc2626",
  med_taken: "#2563eb",
};
