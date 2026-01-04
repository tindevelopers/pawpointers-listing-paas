-- ===================================
-- MESSAGING SYSTEM
-- ===================================
-- In-app chat tied to bookings with real-time support via Supabase Realtime
-- Supports photo/video sharing during service

-- Conversation threads (tied to bookings or general inquiries)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID, -- Will reference bookings if they exist
  listing_id UUID, -- Will reference listings if they exist
  
  -- Participants
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  subject TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'resolved')),
  conversation_type TEXT DEFAULT 'inquiry' CHECK (conversation_type IN ('inquiry', 'booking', 'support', 'general')),
  
  -- Safety & moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES users(id),
  
  -- Read status
  initiator_last_read_at TIMESTAMPTZ,
  recipient_last_read_at TIMESTAMPTZ,
  initiator_unread_count INTEGER DEFAULT 0,
  recipient_unread_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'file', 'system')),
  
  -- Attachments (photos/videos during service)
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{id, type, url, name, size, thumbnail_url, width, height, duration}]
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'deleted')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  
  -- System message metadata (for automated messages)
  system_message_type TEXT, -- booking_confirmed, booking_cancelled, escalation, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message attachments storage (detailed tracking)
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'audio')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  mime_type TEXT,
  thumbnail_url TEXT,
  
  -- For images/videos
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- seconds for videos/audio
  
  -- Storage info
  storage_key TEXT, -- For deletion/management
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Typing indicators (ephemeral, but tracked for consistency)
CREATE TABLE IF NOT EXISTS typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_initiator ON conversations(initiator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_recipient ON conversations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(initiator_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Participants can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- RLS Policies for messages
CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
      AND c.status = 'active'
    )
  );

CREATE POLICY "Senders can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- RLS Policies for attachments
CREATE POLICY "Conversation participants can view attachments"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Conversation participants can add attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
      AND m.sender_id = auth.uid()
    )
  );

-- RLS Policies for typing indicators
CREATE POLICY "Conversation participants can view typing"
  ON typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = typing_indicators.conversation_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their typing status"
  ON typing_indicators FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for read receipts
CREATE POLICY "Conversation participants can view read receipts"
  ON message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_read_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update conversation last_message_at and unread counts
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW(),
    -- Increment unread count for the recipient
    initiator_unread_count = CASE 
      WHEN NEW.sender_id != initiator_id THEN initiator_unread_count + 1 
      ELSE initiator_unread_count 
    END,
    recipient_unread_count = CASE 
      WHEN NEW.sender_id != recipient_id THEN recipient_unread_count + 1 
      ELSE recipient_unread_count 
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Function to reset unread count when user reads messages
CREATE OR REPLACE FUNCTION reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    initiator_unread_count = CASE WHEN NEW.user_id = initiator_id THEN 0 ELSE initiator_unread_count END,
    recipient_unread_count = CASE WHEN NEW.user_id = recipient_id THEN 0 ELSE recipient_unread_count END,
    initiator_last_read_at = CASE WHEN NEW.user_id = initiator_id THEN NOW() ELSE initiator_last_read_at END,
    recipient_last_read_at = CASE WHEN NEW.user_id = recipient_id THEN NOW() ELSE recipient_last_read_at END
  WHERE id = (SELECT conversation_id FROM messages WHERE id = NEW.message_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_reset_unread_count
  AFTER INSERT ON message_read_receipts
  FOR EACH ROW EXECUTE FUNCTION reset_unread_count();

-- Enable Supabase Realtime for messages and typing indicators
-- Note: This requires the table to be added to the realtime publication
-- Run this in Supabase dashboard or via: ALTER PUBLICATION supabase_realtime ADD TABLE messages;
COMMENT ON TABLE messages IS 'Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE messages;';
COMMENT ON TABLE typing_indicators IS 'Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;';
COMMENT ON TABLE conversations IS 'Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE conversations;';

