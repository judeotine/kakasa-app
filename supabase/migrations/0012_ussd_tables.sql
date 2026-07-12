ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ussd_pin_hash text,
  ADD COLUMN IF NOT EXISTS ussd_pin_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ussd_locked_until timestamptz;

CREATE TABLE IF NOT EXISTS ussd_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  phone_number text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  input_chain text,
  language text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ussd_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ussd_sessions"
  ON ussd_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS sms_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  reminder_type text NOT NULL CHECK (reminder_type IN ('pre_7d', 'pre_1d', 'overdue_3d', 'payment_confirmation')),
  phone_number text NOT NULL,
  message_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(loan_id, reminder_type)
);

ALTER TABLE sms_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sms_reminders_sent"
  ON sms_reminders_sent FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION clear_sms_reminders_on_loan_paid()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    DELETE FROM sms_reminders_sent WHERE loan_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clear_sms_reminders
  AFTER UPDATE ON loans
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION clear_sms_reminders_on_loan_paid();
