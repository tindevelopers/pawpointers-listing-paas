-- ===================================
-- REVIEW SYSTEM ENHANCEMENTS
-- ===================================
-- Extends existing reviews table with verified booking badge,
-- owner response capability improvements, and moderation queue

-- Add booking verification columns to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id UUID;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS verified_booking BOOLEAN DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_completed_at TIMESTAMPTZ;

-- Add index for booking-linked reviews
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(verified_booking) WHERE verified_booking = TRUE;

-- Review moderation queue
CREATE TABLE IF NOT EXISTS review_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Moderation details
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'escalated')),
  flagged_reason TEXT,
  auto_flagged BOOLEAN DEFAULT FALSE,
  auto_flag_reasons TEXT[], -- Array of reasons: profanity, spam, too_short, low_rating, etc.
  
  -- Moderator info
  moderator_id UUID REFERENCES users(id),
  moderation_notes TEXT,
  moderated_at TIMESTAMPTZ,
  
  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(review_id)
);

-- Review response templates (for owners)
CREATE TABLE IF NOT EXISTS review_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  response_type TEXT DEFAULT 'general' CHECK (response_type IN ('general', 'positive', 'negative', 'neutral')),
  
  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_tenant ON review_moderation_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON review_moderation_queue(moderation_status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON review_moderation_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON review_moderation_queue(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_response_templates_tenant ON review_response_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_user ON review_response_templates(user_id);

-- Enable RLS
ALTER TABLE review_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_response_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation queue (admin only via tenant)
CREATE POLICY "Tenant admins can view moderation queue"
  ON review_moderation_queue FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage moderation queue"
  ON review_moderation_queue FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for response templates
CREATE POLICY "Users can view their own templates"
  ON review_response_templates FOR SELECT
  USING (user_id = auth.uid() OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage their own templates"
  ON review_response_templates FOR ALL
  USING (user_id = auth.uid());

-- Function to auto-verify reviews linked to completed bookings
CREATE OR REPLACE FUNCTION verify_review_booking()
RETURNS TRIGGER AS $$
DECLARE
  booking_status TEXT;
  booking_user_id UUID;
  booking_completed TIMESTAMPTZ;
BEGIN
  -- Only process if booking_id is provided
  IF NEW.booking_id IS NOT NULL THEN
    -- Check if booking exists, is completed, and belongs to the reviewer
    SELECT status, user_id, 
           CASE WHEN status = 'completed' THEN updated_at ELSE NULL END
    INTO booking_status, booking_user_id, booking_completed
    FROM bookings 
    WHERE id = NEW.booking_id;
    
    -- Verify the booking belongs to this user and is completed
    IF booking_user_id = NEW.user_id AND booking_status = 'completed' THEN
      NEW.verified_booking := TRUE;
      NEW.booking_completed_at := booking_completed;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-verification
DROP TRIGGER IF EXISTS trigger_verify_review_booking ON reviews;
CREATE TRIGGER trigger_verify_review_booking
  BEFORE INSERT OR UPDATE OF booking_id ON reviews
  FOR EACH ROW EXECUTE FUNCTION verify_review_booking();

-- Function to auto-flag reviews for moderation
CREATE OR REPLACE FUNCTION auto_flag_review_for_moderation()
RETURNS TRIGGER AS $$
DECLARE
  flag_reasons TEXT[] := ARRAY[]::TEXT[];
  priority_level TEXT := 'normal';
BEGIN
  -- Check for low rating (1-2 stars)
  IF NEW.rating <= 2 THEN
    flag_reasons := array_append(flag_reasons, 'low_rating');
    IF NEW.rating = 1 THEN
      priority_level := 'high';
    END IF;
  END IF;
  
  -- Check for very short content
  IF NEW.content IS NOT NULL AND length(trim(NEW.content)) < 10 THEN
    flag_reasons := array_append(flag_reasons, 'too_short');
  END IF;
  
  -- Check for very long content (potential spam)
  IF NEW.content IS NOT NULL AND length(NEW.content) > 2000 THEN
    flag_reasons := array_append(flag_reasons, 'too_long');
  END IF;
  
  -- Check for potential spam patterns (all caps, excessive punctuation)
  IF NEW.content IS NOT NULL THEN
    IF NEW.content = upper(NEW.content) AND length(NEW.content) > 20 THEN
      flag_reasons := array_append(flag_reasons, 'all_caps');
    END IF;
    
    IF (length(NEW.content) - length(replace(replace(replace(NEW.content, '!', ''), '?', ''), '.', ''))) > 10 THEN
      flag_reasons := array_append(flag_reasons, 'excessive_punctuation');
    END IF;
  END IF;
  
  -- If any flags, add to moderation queue
  IF array_length(flag_reasons, 1) > 0 THEN
    INSERT INTO review_moderation_queue (
      review_id, 
      tenant_id, 
      auto_flagged, 
      auto_flag_reasons, 
      priority,
      flagged_reason
    )
    VALUES (
      NEW.id,
      NEW.tenant_id,
      TRUE,
      flag_reasons,
      priority_level,
      array_to_string(flag_reasons, ', ')
    )
    ON CONFLICT (review_id) DO UPDATE
    SET auto_flag_reasons = EXCLUDED.auto_flag_reasons,
        priority = EXCLUDED.priority,
        updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-flagging
DROP TRIGGER IF EXISTS trigger_auto_flag_review ON reviews;
CREATE TRIGGER trigger_auto_flag_review
  AFTER INSERT OR UPDATE OF content, rating ON reviews
  FOR EACH ROW EXECUTE FUNCTION auto_flag_review_for_moderation();

-- Function to update review status when moderated
CREATE OR REPLACE FUNCTION sync_review_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.moderation_status = 'approved' THEN
    UPDATE reviews SET status = 'approved', moderated_at = NOW(), moderated_by = NEW.moderator_id
    WHERE id = NEW.review_id;
  ELSIF NEW.moderation_status = 'rejected' THEN
    UPDATE reviews SET status = 'rejected', moderated_at = NOW(), moderated_by = NEW.moderator_id, moderation_notes = NEW.moderation_notes
    WHERE id = NEW.review_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_review_moderation
  AFTER UPDATE OF moderation_status ON review_moderation_queue
  FOR EACH ROW EXECUTE FUNCTION sync_review_moderation_status();

