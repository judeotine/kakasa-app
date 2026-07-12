ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token text,
  ADD COLUMN IF NOT EXISTS notification_loan_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_payment_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_credit_score boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_sound boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_vibration boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_promotions boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = false;
