ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_interval_minutes int NOT NULL DEFAULT 120;

ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_reminder_interval_range;

ALTER TABLE patients
  ADD CONSTRAINT patients_reminder_interval_range
  CHECK (reminder_interval_minutes BETWEEN 15 AND 1440);

CREATE TABLE caregiver_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  message      text NOT NULL CHECK (char_length(trim(message)) > 0),
  sent_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  delivered_device_id uuid REFERENCES devices(id) ON DELETE SET NULL
);

CREATE INDEX caregiver_messages_patient_pending_idx
  ON caregiver_messages (patient_id, sent_at DESC)
  WHERE delivered_at IS NULL;

CREATE INDEX caregiver_messages_patient_sent_idx
  ON caregiver_messages (patient_id, sent_at DESC);

ALTER TABLE caregiver_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caregiver_messages_authenticated_all"
  ON caregiver_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON caregiver_messages TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE caregiver_messages;
