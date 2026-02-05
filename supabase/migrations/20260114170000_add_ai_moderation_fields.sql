-- ===================================
-- AI Review Moderation System
-- ===================================
-- Adds AI moderation fields and updates triggers to process ALL reviews

-- Add AI moderation fields to review_moderation_queue
ALTER TABLE public.review_moderation_queue 
  ADD COLUMN IF NOT EXISTS ai_moderation_status TEXT CHECK (ai_moderation_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  ADD COLUMN IF NOT EXISTS ai_moderation_score NUMERIC(3,2), -- 0.00 to 1.00 confidence score
  ADD COLUMN IF NOT EXISTS ai_moderation_reasons JSONB, -- Detailed AI analysis results
  ADD COLUMN IF NOT EXISTS bot_detection_score NUMERIC(3,2), -- 0.00 to 1.00 bot likelihood
  ADD COLUMN IF NOT EXISTS bot_detection_reasons TEXT[], -- Array of bot detection reasons
  ADD COLUMN IF NOT EXISTS moderation_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edge_function_invoked_at TIMESTAMPTZ;

-- Create index for AI moderation status
CREATE INDEX IF NOT EXISTS idx_moderation_queue_ai_status 
  ON public.review_moderation_queue(ai_moderation_status) 
  WHERE ai_moderation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_queue_ai_processed 
  ON public.review_moderation_queue(ai_processed_at) 
  WHERE ai_processed_at IS NULL;

-- Function to create moderation queue entry for ALL reviews (not just flagged ones)
CREATE OR REPLACE FUNCTION public.create_moderation_queue_entry()
RETURNS TRIGGER AS $$
DECLARE
  flag_reasons TEXT[] := ARRAY[]::TEXT[];
  priority_level TEXT := 'normal';
BEGIN
  -- Basic rule-based flagging (for priority/initial assessment)
  IF NEW.rating <= 2 THEN
    flag_reasons := array_append(flag_reasons, 'low_rating');
    IF NEW.rating = 1 THEN
      priority_level := 'high';
    END IF;
  END IF;
  
  IF NEW.content IS NOT NULL AND length(trim(NEW.content)) < 10 THEN
    flag_reasons := array_append(flag_reasons, 'too_short');
  END IF;
  
  IF NEW.content IS NOT NULL AND length(NEW.content) > 2000 THEN
    flag_reasons := array_append(flag_reasons, 'too_long');
  END IF;
  
  IF NEW.content IS NOT NULL THEN
    IF NEW.content = upper(NEW.content) AND length(NEW.content) > 20 THEN
      flag_reasons := array_append(flag_reasons, 'all_caps');
    END IF;
    
    IF (length(NEW.content) - length(replace(replace(replace(NEW.content, '!', ''), '?', ''), '.', ''))) > 10 THEN
      flag_reasons := array_append(flag_reasons, 'excessive_punctuation');
    END IF;
  END IF;

  -- Create moderation queue entry for ALL reviews
  INSERT INTO public.review_moderation_queue (
    review_id, 
    tenant_id, 
    moderation_status,
    auto_flagged, 
    auto_flag_reasons, 
    priority,
    flagged_reason,
    ai_moderation_status
  )
  VALUES (
    NEW.id,
    NEW.tenant_id,
    'pending',
    array_length(flag_reasons, 1) > 0,
    flag_reasons,
    priority_level,
    CASE WHEN array_length(flag_reasons, 1) > 0 THEN array_to_string(flag_reasons, ', ') ELSE NULL END,
    'pending'
  )
  ON CONFLICT (review_id) DO UPDATE
  SET auto_flag_reasons = EXCLUDED.auto_flag_reasons,
      priority = EXCLUDED.priority,
      flagged_reason = EXCLUDED.flagged_reason,
      updated_at = NOW();

  -- Note: Edge Function will be invoked via webhook/API call from application layer
  -- or via pg_cron scheduled job that processes pending moderation queue entries
  -- This keeps the trigger lightweight and avoids blocking the review insert
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_auto_flag_review ON public.reviews;
DROP TRIGGER IF EXISTS trigger_create_moderation_queue ON public.reviews;

CREATE TRIGGER trigger_create_moderation_queue
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.create_moderation_queue_entry();

-- Function to update review status when AI moderation completes
CREATE OR REPLACE FUNCTION public.update_review_from_ai_moderation()
RETURNS TRIGGER AS $$
BEGIN
  -- When AI moderation status changes, update the review status accordingly
  IF NEW.ai_moderation_status = 'approved' AND OLD.ai_moderation_status != 'approved' THEN
    UPDATE public.reviews 
    SET 
      status = 'approved',
      moderated_at = COALESCE(NEW.ai_processed_at, NOW()),
      moderation_notes = COALESCE(
        NEW.moderation_notes,
        'Auto-approved by AI moderation'
      )
    WHERE id = NEW.review_id;
    
    -- Also update moderation_status in queue
    NEW.moderation_status := 'approved';
    
  ELSIF NEW.ai_moderation_status = 'rejected' AND OLD.ai_moderation_status != 'rejected' THEN
    UPDATE public.reviews 
    SET 
      status = 'rejected',
      moderated_at = COALESCE(NEW.ai_processed_at, NOW()),
      moderation_notes = COALESCE(
        NEW.moderation_notes,
        'Rejected by AI moderation: ' || COALESCE(
          (SELECT string_agg(value::text, ', ') 
           FROM jsonb_each_text(NEW.ai_moderation_reasons)),
          'Content policy violation'
        )
      )
    WHERE id = NEW.review_id;
    
    NEW.moderation_status := 'rejected';
    
  ELSIF NEW.ai_moderation_status = 'needs_review' AND OLD.ai_moderation_status != 'needs_review' THEN
    -- Keep as pending, escalate priority
    NEW.moderation_status := 'pending';
    NEW.priority := 'high';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for AI moderation status updates
DROP TRIGGER IF EXISTS trigger_update_review_from_ai_moderation ON public.review_moderation_queue;
CREATE TRIGGER trigger_update_review_from_ai_moderation
  AFTER UPDATE OF ai_moderation_status, ai_moderation_score ON public.review_moderation_queue
  FOR EACH ROW 
  WHEN (NEW.ai_moderation_status IS DISTINCT FROM OLD.ai_moderation_status)
  EXECUTE FUNCTION public.update_review_from_ai_moderation();

-- Update RLS policies to allow users to see their own reviews regardless of status
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
CREATE POLICY "Users can view their own reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Update policy to allow merchants to see all reviews for their listings (including pending/rejected)
DROP POLICY IF EXISTS "Listing owners can view reviews for their listings" ON public.reviews;
CREATE POLICY "Listing owners can view reviews for their listings"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE public.listings.id = public.reviews.listing_id
      AND public.listings.owner_id = auth.uid()
    )
  );

-- Ensure public only sees approved reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

-- Allow platform admins to see all reviews
DROP POLICY IF EXISTS "Platform admins can view all reviews" ON public.reviews;
CREATE POLICY "Platform admins can view all reviews"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.tenant_id IS NULL
    )
  );

-- Update moderation queue RLS to allow platform admins full access
DROP POLICY IF EXISTS "Platform admins can manage moderation queue" ON public.review_moderation_queue;
CREATE POLICY "Platform admins can manage moderation queue"
  ON public.review_moderation_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.tenant_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.tenant_id IS NULL
    )
  );

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.create_moderation_queue_entry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_review_from_ai_moderation() TO authenticated;
