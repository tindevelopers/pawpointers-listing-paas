-- ===================================
-- Webhook Trigger for AI Moderation
-- ===================================
-- Creates a function to invoke the Edge Function via HTTP

-- Function to invoke moderation Edge Function (called from application layer)
CREATE OR REPLACE FUNCTION public.invoke_moderation_function(p_review_id UUID)
RETURNS void AS $$
BEGIN
  -- This function is called from the application layer after review creation
  -- The actual HTTP call to the Edge Function happens in the API route
  -- This is a placeholder to ensure the function exists for future pg_net integration
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.invoke_moderation_function(UUID) TO authenticated;

-- Create a pg_cron job to process pending moderation queue entries
-- This runs every minute to process reviews that need AI moderation
-- Note: Requires pg_cron extension to be enabled
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule job to process pending moderation queue entries
    PERFORM cron.schedule(
      'process-review-moderation',
      '* * * * *', -- Every minute
      $cron$
      SELECT public.process_pending_moderations();
      $cron$
    );
  END IF;
END $$;

-- Function to process pending moderation queue entries
CREATE OR REPLACE FUNCTION public.process_pending_moderations()
RETURNS void AS $$
DECLARE
  queue_record RECORD;
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get configuration (these should be set as database settings or env vars)
  edge_function_url := current_setting('app.settings.edge_function_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If not configured, skip processing
  IF edge_function_url IS NULL OR service_role_key IS NULL THEN
    RETURN;
  END IF;
  
  -- Process up to 10 pending moderation queue entries
  FOR queue_record IN
    SELECT rmq.id, rmq.review_id, r.content, r.rating, r.user_id, r.listing_id
    FROM public.review_moderation_queue rmq
    JOIN public.reviews r ON r.id = rmq.review_id
    WHERE rmq.ai_moderation_status = 'pending'
      AND rmq.edge_function_invoked_at IS NULL
    ORDER BY rmq.created_at ASC
    LIMIT 10
  LOOP
    -- Mark as invoked (to prevent duplicate processing)
    UPDATE public.review_moderation_queue
    SET edge_function_invoked_at = NOW()
    WHERE id = queue_record.id;
    
    -- Note: Actual HTTP call would happen here if pg_net is available
    -- For now, this is handled by the API route layer
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
