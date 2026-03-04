-- ===================================
-- BOOKING NOTIFICATIONS
-- ===================================

CREATE OR REPLACE FUNCTION public.notify_merchant_on_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_title text;
  v_recipient uuid;
BEGIN
  SELECT title INTO v_listing_title
  FROM listings
  WHERE id = NEW.listing_id;

  FOR v_recipient IN
    SELECT DISTINCT recipient_id
    FROM (
      SELECT l.owner_id AS recipient_id
      FROM listings l
      WHERE l.id = NEW.listing_id

      UNION

      SELECT lm.user_id AS recipient_id
      FROM listing_members lm
      WHERE lm.listing_id = NEW.listing_id
        AND lm.status = 'active'
        AND (
          lm.role IN ('owner', 'admin', 'support')
          OR lm.permissions && ARRAY['bookings.read', 'bookings.write', 'bookings.*']::text[]
        )
    ) recipients
    WHERE recipient_id IS NOT NULL
      AND recipient_id <> NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, tenant_id, type, title, message, data, action_url)
    VALUES (
      v_recipient,
      NEW.tenant_id,
      'booking',
      'New booking request',
      COALESCE(v_listing_title, 'A listing') || ' has a new booking request.',
      jsonb_build_object(
        'bookingId', NEW.id,
        'listingId', NEW.listing_id,
        'status', NEW.status
      ),
      '/bookings'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_merchant_on_booking_insert ON bookings;
CREATE TRIGGER trigger_notify_merchant_on_booking_insert
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_merchant_on_booking_insert();

CREATE OR REPLACE FUNCTION public.notify_on_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_title text;
  v_consumer_title text;
  v_consumer_message text;
  v_recipient uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_listing_title
  FROM listings
  WHERE id = NEW.listing_id;

  -- Notify consumer when booking status changes
  IF NEW.user_id IS NOT NULL AND NEW.status IN ('confirmed', 'cancelled', 'completed') THEN
    IF NEW.status = 'confirmed' THEN
      v_consumer_title := 'Booking confirmed';
      v_consumer_message := COALESCE(v_listing_title, 'Your booking') || ' has been confirmed.';
    ELSIF NEW.status = 'completed' THEN
      v_consumer_title := 'Booking completed';
      v_consumer_message := 'Your booking has been marked as completed.';
    ELSE
      v_consumer_title := 'Booking cancelled';
      v_consumer_message := COALESCE(v_listing_title, 'Your booking') || ' has been cancelled.';
    END IF;

    INSERT INTO notifications (user_id, tenant_id, type, title, message, data, action_url)
    VALUES (
      NEW.user_id,
      NEW.tenant_id,
      'booking',
      v_consumer_title,
      v_consumer_message,
      jsonb_build_object(
        'bookingId', NEW.id,
        'listingId', NEW.listing_id,
        'status', NEW.status
      ),
      '/account/bookings'
    );
  END IF;

  -- Notify merchant team when a consumer cancellation is detected
  IF NEW.status = 'cancelled' AND (NEW.cancelled_by IS NULL OR NEW.cancelled_by = NEW.user_id) THEN
    FOR v_recipient IN
      SELECT DISTINCT recipient_id
      FROM (
        SELECT l.owner_id AS recipient_id
        FROM listings l
        WHERE l.id = NEW.listing_id

        UNION

        SELECT lm.user_id AS recipient_id
        FROM listing_members lm
        WHERE lm.listing_id = NEW.listing_id
          AND lm.status = 'active'
          AND (
            lm.role IN ('owner', 'admin', 'support')
            OR lm.permissions && ARRAY['bookings.read', 'bookings.write', 'bookings.*']::text[]
          )
      ) recipients
      WHERE recipient_id IS NOT NULL
        AND recipient_id <> COALESCE(NEW.cancelled_by, NEW.user_id)
    LOOP
      INSERT INTO notifications (user_id, tenant_id, type, title, message, data, action_url)
      VALUES (
        v_recipient,
        NEW.tenant_id,
        'booking',
        'Booking cancelled by customer',
        COALESCE(v_listing_title, 'A booking') || ' was cancelled by the customer.',
        jsonb_build_object(
          'bookingId', NEW.id,
          'listingId', NEW.listing_id,
          'status', NEW.status
        ),
        '/bookings'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_booking_status_change ON bookings;
CREATE TRIGGER trigger_notify_on_booking_status_change
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_booking_status_change();
