INSERT INTO patients (id, display_name, phone, timezone, notes)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Margaret Demo',
  '+1-555-0100',
  'America/New_York',
  'Demo patient for local development'
);

INSERT INTO medications (patient_id, name, dose, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Aspirin', '81 mg daily', 0),
  ('11111111-1111-1111-1111-111111111111', 'Lisinopril', '10 mg daily', 1),
  ('11111111-1111-1111-1111-111111111111', 'Metformin', '500 mg twice daily', 2);

INSERT INTO events (patient_id, type, recorded_at, client_event_id)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'feel_great'::event_type,
  now() - (d || ' days')::interval - (h || ' hours')::interval,
  gen_random_uuid()
FROM generate_series(0, 6) AS d,
     generate_series(8, 20, 4) AS h;

INSERT INTO events (patient_id, type, recorded_at, client_event_id)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'dizzy'::event_type,
  now() - (d || ' days')::interval - ((h + 1) || ' hours')::interval,
  gen_random_uuid()
FROM generate_series(0, 6) AS d,
     generate_series(10, 18, 6) AS h;

INSERT INTO events (patient_id, type, pain_level, recorded_at, client_event_id)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'pain'::event_type,
  1 + (random() * 9)::int,
  now() - (d || ' days')::interval - (h || ' hours')::interval,
  gen_random_uuid()
FROM generate_series(0, 6) AS d,
     generate_series(12, 16, 4) AS h;

INSERT INTO events (patient_id, type, medication_id, recorded_at, client_event_id)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'med_taken'::event_type,
  m.id,
  now() - (d || ' days')::interval - interval '9 hours',
  gen_random_uuid()
FROM generate_series(0, 6) AS d
CROSS JOIN medications m
WHERE m.patient_id = '11111111-1111-1111-1111-111111111111'
  AND m.name IN ('Aspirin', 'Lisinopril');
