-- ===================================
-- BOOKING & RESERVATION SYSTEM
-- ===================================
-- For location-based listings (tourism, rentals, events)

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Booking details
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  
  -- Guests/participants
  guest_count int DEFAULT 1,
  guest_details jsonb, -- Names, ages, special requirements
  
  -- Pricing
  base_price numeric(10,2) NOT NULL,
  service_fee numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  
  -- Payment
  payment_status text DEFAULT 'pending', -- pending, processing, paid, failed, refunded
  payment_intent_id text, -- Stripe payment intent ID
  payment_method text, -- card, paypal, etc.
  paid_at timestamptz,
  
  -- Status
  status text DEFAULT 'pending', -- pending, confirmed, cancelled, completed, no_show
  confirmation_code text UNIQUE,
  
  -- Cancellation
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id),
  cancellation_reason text,
  refund_amount numeric(10,2),
  
  -- Communication
  special_requests text,
  internal_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CHECK (end_date >= start_date),
  CHECK (total_amount >= 0)
);

-- Availability calendar
CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Date/time
  date date NOT NULL,
  start_time time,
  end_time time,
  
  -- Availability
  available bool DEFAULT true,
  max_bookings int DEFAULT 1, -- For events/tours that allow multiple bookings
  current_bookings int DEFAULT 0,
  
  -- Pricing (can vary by date)
  price numeric(10,2),
  min_duration int, -- Minimum booking duration in minutes/days
  max_duration int,
  
  -- Metadata
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, date, start_time)
);

-- Booking calendar view (read-only, for display)
CREATE OR REPLACE VIEW booking_calendar AS
SELECT 
  a.listing_id,
  a.date,
  a.available,
  a.max_bookings,
  a.current_bookings,
  a.price,
  CASE 
    WHEN a.current_bookings >= a.max_bookings THEN 'full'
    WHEN a.available = false THEN 'unavailable'
    ELSE 'available'
  END as availability_status,
  COUNT(b.id) as confirmed_bookings
FROM availability_slots a
LEFT JOIN bookings b ON b.listing_id = a.listing_id 
  AND b.start_date <= a.date 
  AND b.end_date >= a.date
  AND b.status IN ('confirmed', 'pending')
GROUP BY a.listing_id, a.date, a.available, a.max_bookings, a.current_bookings, a.price;

-- Indexes
CREATE INDEX idx_bookings_listing ON bookings(listing_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_confirmation ON bookings(confirmation_code);

CREATE INDEX idx_availability_listing ON availability_slots(listing_id);
CREATE INDEX idx_availability_date ON availability_slots(date);
CREATE INDEX idx_availability_listing_date ON availability_slots(listing_id, date);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Listing owners can view bookings for their listings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = bookings.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Public can view availability"
  ON availability_slots FOR SELECT
  USING (available = true);

CREATE POLICY "Listing owners can manage availability"
  ON availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = availability_slots.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Function to generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS trigger AS $$
BEGIN
  NEW.confirmation_code := UPPER(substring(md5(random()::text) from 1 for 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_generate_confirmation_code ON bookings;
CREATE TRIGGER trigger_generate_confirmation_code
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_confirmation_code();

-- Function to update availability slot bookings count
CREATE OR REPLACE FUNCTION update_availability_bookings()
RETURNS TRIGGER AS $$
DECLARE
  slot_date date;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update for each date in the booking range
    FOR slot_date IN 
      SELECT generate_series(NEW.start_date, NEW.end_date, '1 day'::interval)::date
    LOOP
      UPDATE availability_slots
      SET current_bookings = (
        SELECT COUNT(*) FROM bookings
        WHERE bookings.listing_id = NEW.listing_id
        AND bookings.start_date <= slot_date
        AND bookings.end_date >= slot_date
        AND bookings.status IN ('confirmed', 'pending')
      )
      WHERE listing_id = NEW.listing_id AND date = slot_date;
    END LOOP;
  ELSIF TG_OP = 'DELETE' THEN
    FOR slot_date IN 
      SELECT generate_series(OLD.start_date, OLD.end_date, '1 day'::interval)::date
    LOOP
      UPDATE availability_slots
      SET current_bookings = GREATEST(0, current_bookings - 1)
      WHERE listing_id = OLD.listing_id AND date = slot_date;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_availability_bookings ON bookings;
CREATE TRIGGER trigger_update_availability_bookings
  AFTER INSERT OR UPDATE OF status OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_availability_bookings();

