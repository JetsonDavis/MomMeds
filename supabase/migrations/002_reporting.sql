CREATE OR REPLACE FUNCTION events_hourly(
  p_patient_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  bucket timestamptz,
  feel_great_count bigint,
  dizzy_count bigint,
  pain_count bigint,
  med_taken_count bigint,
  avg_pain numeric,
  max_pain int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (
      date_trunc(
        'hour',
        e.recorded_at AT TIME ZONE COALESCE(p.timezone, 'UTC')
      ) AT TIME ZONE COALESCE(p.timezone, 'UTC')
    )::timestamptz AS bucket,
    count(*) FILTER (WHERE e.type = 'feel_great') AS feel_great_count,
    count(*) FILTER (WHERE e.type = 'dizzy') AS dizzy_count,
    count(*) FILTER (WHERE e.type = 'pain') AS pain_count,
    count(*) FILTER (WHERE e.type = 'med_taken') AS med_taken_count,
    round(avg(e.pain_level) FILTER (WHERE e.type = 'pain'), 2) AS avg_pain,
    max(e.pain_level) FILTER (WHERE e.type = 'pain')::int AS max_pain
  FROM events e
  JOIN patients p ON p.id = e.patient_id
  WHERE e.patient_id = p_patient_id
    AND e.recorded_at >= p_from
    AND e.recorded_at < p_to
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION events_daily(
  p_patient_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  bucket timestamptz,
  feel_great_count bigint,
  dizzy_count bigint,
  pain_count bigint,
  med_taken_count bigint,
  avg_pain numeric,
  max_pain int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (
      date_trunc(
        'day',
        e.recorded_at AT TIME ZONE COALESCE(p.timezone, 'UTC')
      ) AT TIME ZONE COALESCE(p.timezone, 'UTC')
    )::timestamptz AS bucket,
    count(*) FILTER (WHERE e.type = 'feel_great') AS feel_great_count,
    count(*) FILTER (WHERE e.type = 'dizzy') AS dizzy_count,
    count(*) FILTER (WHERE e.type = 'pain') AS pain_count,
    count(*) FILTER (WHERE e.type = 'med_taken') AS med_taken_count,
    round(avg(e.pain_level) FILTER (WHERE e.type = 'pain'), 2) AS avg_pain,
    max(e.pain_level) FILTER (WHERE e.type = 'pain')::int AS max_pain
  FROM events e
  JOIN patients p ON p.id = e.patient_id
  WHERE e.patient_id = p_patient_id
    AND e.recorded_at >= p_from
    AND e.recorded_at < p_to
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION events_hourly(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION events_daily(uuid, timestamptz, timestamptz) TO authenticated;
