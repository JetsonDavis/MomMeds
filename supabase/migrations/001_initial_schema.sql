CREATE TYPE event_type AS ENUM ('feel_great', 'dizzy', 'pain', 'med_taken');

CREATE TABLE patients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  phone        text,
  timezone     text NOT NULL DEFAULT 'America/New_York',
  notes        text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE medications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name         text NOT NULL,
  dose         text,
  instructions text,
  active       boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX medications_patient_sort_idx ON medications (patient_id, sort_order);

CREATE TABLE pairing_codes (
  code       char(6) PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pairing_codes_patient_idx ON pairing_codes (patient_id);

CREATE TABLE devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  label        text,
  paired_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX devices_patient_idx ON devices (patient_id);

CREATE TABLE events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  device_id       uuid REFERENCES devices(id) ON DELETE SET NULL,
  type            event_type NOT NULL,
  pain_level      int CHECK (pain_level >= 1 AND pain_level <= 10),
  medication_id   uuid REFERENCES medications(id) ON DELETE SET NULL,
  recorded_at     timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  client_event_id uuid NOT NULL UNIQUE,
  CONSTRAINT pain_level_required CHECK (
    (type = 'pain' AND pain_level IS NOT NULL)
    OR (type <> 'pain' AND pain_level IS NULL)
  ),
  CONSTRAINT medication_required CHECK (
    (type = 'med_taken' AND medication_id IS NOT NULL)
    OR (type <> 'med_taken' AND medication_id IS NULL)
  )
);

CREATE INDEX events_patient_recorded_idx ON events (patient_id, recorded_at DESC);
CREATE INDEX events_patient_type_recorded_idx ON events (patient_id, type, recorded_at DESC);

CREATE VIEW devices_public AS
SELECT
  id,
  patient_id,
  label,
  paired_at,
  last_seen_at,
  revoked_at,
  created_at
FROM devices;

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_authenticated_all"
  ON patients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "medications_authenticated_all"
  ON medications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "pairing_codes_authenticated_all"
  ON pairing_codes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "events_authenticated_all"
  ON events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "devices_authenticated_select"
  ON devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "devices_authenticated_update"
  ON devices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON devices_public TO authenticated;
