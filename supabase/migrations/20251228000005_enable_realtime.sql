-- ===================================
-- ENABLE SUPABASE REALTIME
-- ===================================
-- Enable realtime for messaging and related tables

-- Enable realtime for messages table (for real-time chat)
DO $$
BEGIN
  -- Check if publication exists and add tables
  -- Note: This may need to be run manually in Supabase dashboard
  -- as ALTER PUBLICATION requires specific permissions
  
  -- Messages - real-time chat updates
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication
    NULL;
  WHEN undefined_object THEN
    -- Publication doesn't exist (local dev)
    NULL;
END $$;

DO $$
BEGIN
  -- Conversations - for unread counts and status updates
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE conversations';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Typing indicators - for real-time typing status
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Safety reports - for admin notifications
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE safety_reports';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Add comments for manual setup if needed
COMMENT ON TABLE messages IS 'Realtime enabled for instant messaging. If not working, run: ALTER PUBLICATION supabase_realtime ADD TABLE messages;';
COMMENT ON TABLE conversations IS 'Realtime enabled for conversation updates';
COMMENT ON TABLE typing_indicators IS 'Realtime enabled for typing indicators';

