CREATE TABLE IF NOT EXISTS fraud_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_phone text NOT NULL,
  reported_entity text,
  description text,
  call_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fraud_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on fraud_reports"
  ON fraud_reports FOR ALL
  USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  caller_phone text NOT NULL,
  language text DEFAULT 'eng',
  action text,
  duration_seconds int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on voice_sessions"
  ON voice_sessions FOR ALL
  USING (auth.role() = 'service_role');
