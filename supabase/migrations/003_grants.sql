GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON patients TO authenticated, service_role;
GRANT ALL ON medications TO authenticated, service_role;
GRANT ALL ON pairing_codes TO authenticated, service_role;
GRANT SELECT, UPDATE ON devices TO authenticated;
GRANT ALL ON devices TO service_role;
GRANT ALL ON events TO authenticated, service_role;

GRANT SELECT ON devices_public TO authenticated, service_role;

GRANT USAGE ON TYPE event_type TO authenticated, service_role;
