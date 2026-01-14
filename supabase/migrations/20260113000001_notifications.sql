-- ===================================
-- NOTIFICATIONS (IN-APP + PREFERENCES + PUSH)
-- ===================================

-- -----------------------------
-- Core notifications table
-- -----------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,

  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'message', 'booking', 'review', 'payment')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  action_url text,
  image_url text,

  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(user_id, type);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update their own notifications (read/unread)
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;
CREATE POLICY "Users can delete their notifications"
  ON notifications FOR DELETE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Platform admins can manage all notifications
DROP POLICY IF EXISTS "Platform admins can manage all notifications" ON notifications;
CREATE POLICY "Platform admins can manage all notifications"
  ON notifications FOR ALL
  USING (auth.uid() IS NOT NULL AND is_platform_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND is_platform_admin());

-- -----------------------------
-- Notification preferences
-- -----------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{
    "email": { "enabled": true, "messages": true, "bookings": true, "reviews": true, "marketing": false, "systemUpdates": true },
    "push":  { "enabled": true, "messages": true, "bookings": true, "reviews": true, "marketing": false, "systemUpdates": true },
    "sms":   { "enabled": false, "messages": false, "bookings": false, "reviews": false, "marketing": false, "systemUpdates": false },
    "inApp": { "enabled": true, "messages": true, "bookings": true, "reviews": true, "marketing": true, "systemUpdates": true }
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notification preferences" ON notification_preferences;
CREATE POLICY "Users can view their notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- -----------------------------
-- Web push subscriptions (optional)
-- -----------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view their push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- -----------------------------
-- Review notifications (DB-side so it works from any app)
-- -----------------------------

CREATE OR REPLACE FUNCTION public.notify_on_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_title text;
  v_message text;
  v_action_url text;
BEGIN
  -- Find listing owner
  SELECT owner_id INTO v_owner_id FROM listings WHERE id = NEW.listing_id;
  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Do not notify self-reviews to owner
  IF NEW.user_id = v_owner_id THEN
    RETURN NEW;
  END IF;

  v_title := CASE
    WHEN NEW.reviewer_type = 'expert' THEN 'New expert review'
    ELSE 'New review'
  END;

  v_message := CASE
    WHEN NEW.reviewer_type = 'expert' THEN 'A PawPointers Expert posted a new review on your listing.'
    ELSE 'A Pet Parent posted a new review on your listing.'
  END;

  v_action_url := '/reviews';

  INSERT INTO notifications (user_id, tenant_id, type, title, message, data, action_url)
  VALUES (
    v_owner_id,
    NEW.tenant_id,
    'review',
    v_title,
    v_message,
    jsonb_build_object('reviewId', NEW.id, 'listingId', NEW.listing_id, 'reviewerType', NEW.reviewer_type),
    v_action_url
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_review_insert ON reviews;
CREATE TRIGGER trigger_notify_on_review_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_review_insert();

-- Extend the existing owner-response RPC to notify the reviewer
CREATE OR REPLACE FUNCTION public.respond_to_review(
  p_review_id uuid,
  p_response text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_owner uuid;
  v_reviewer uuid;
  v_listing_id uuid;
BEGIN
  -- Fetch listing owner + reviewer for the review
  SELECT l.owner_id, r.user_id, r.listing_id
  INTO v_listing_owner, v_reviewer, v_listing_id
  FROM reviews r
  JOIN listings l ON l.id = r.listing_id
  WHERE r.id = p_review_id;

  IF v_listing_owner IS NULL THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  IF v_listing_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE reviews
  SET owner_response = p_response,
      owner_response_at = NOW()
  WHERE id = p_review_id;

  -- Notify the reviewer (if not the owner)
  IF v_reviewer IS NOT NULL AND v_reviewer <> v_listing_owner THEN
    INSERT INTO notifications (user_id, type, title, message, data, action_url)
    VALUES (
      v_reviewer,
      'review',
      'Business responded to your review',
      'The business replied to your review.',
      jsonb_build_object('reviewId', p_review_id, 'listingId', v_listing_id),
      '/listings/' || v_listing_id::text
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_review(uuid, text) TO authenticated;

