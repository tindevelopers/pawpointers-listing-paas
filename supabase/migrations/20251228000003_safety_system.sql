-- ===================================
-- TRUST & SAFETY SYSTEM
-- ===================================
-- Safety escalation, reports, and platform protection features

-- Safety reports/escalations
CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reporter
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_type TEXT DEFAULT 'user' CHECK (reporter_type IN ('user', 'provider', 'guest', 'anonymous', 'system')),
  reporter_email TEXT, -- For anonymous reports
  
  -- Subject of report
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id UUID, -- Reference to bookings table
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  listing_id UUID, -- Reference to listings table
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN (
    'harassment', 'fraud', 'safety_concern', 'policy_violation', 
    'emergency', 'inappropriate_content', 'discrimination', 
    'spam', 'impersonation', 'other'
  )),
  severity TEXT DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical', 'emergency')),
  description TEXT NOT NULL,
  
  -- Evidence
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{url, type, name, uploaded_at}]
  related_message_ids UUID[], -- Related message IDs if from conversation
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'acknowledged', 'under_review', 'investigating', 
    'resolved', 'escalated', 'dismissed', 'referred'
  )),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN (
    'warning_issued', 'account_suspended', 'account_banned',
    'no_action', 'content_removed', 'refund_issued', 
    'referred_to_authorities', 'mediated'
  )),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Urgency handling
  is_urgent BOOLEAN DEFAULT FALSE,
  requires_immediate_action BOOLEAN DEFAULT FALSE,
  emergency_contacted BOOLEAN DEFAULT FALSE,
  emergency_contact_details TEXT,
  
  -- SLA tracking
  first_response_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety report notes/comments (internal)
CREATE TABLE IF NOT EXISTS safety_report_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
  
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE, -- Internal notes not visible to reporter
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety actions taken
CREATE TABLE IF NOT EXISTS safety_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_report_id UUID REFERENCES safety_reports(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Target
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'warning', 'content_removal', 'temporary_suspension', 
    'permanent_ban', 'feature_restriction', 'investigation',
    'refund', 'account_review', 'appeal_accepted'
  )),
  description TEXT,
  
  -- Duration for temporary actions
  duration_days INTEGER,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,
  
  -- Performer
  performed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User safety status (aggregate view of user's safety standing)
CREATE TABLE IF NOT EXISTS user_safety_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Suspension status
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_until TIMESTAMPTZ,
  suspended_by UUID REFERENCES users(id),
  
  -- Ban status
  is_banned BOOLEAN DEFAULT FALSE,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  banned_by UUID REFERENCES users(id),
  
  -- Warning history
  warning_count INTEGER DEFAULT 0,
  last_warning_at TIMESTAMPTZ,
  
  -- Trust score (0-100)
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  trust_score_updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Reports
  reports_filed INTEGER DEFAULT 0,
  reports_received INTEGER DEFAULT 0,
  reports_substantiated INTEGER DEFAULT 0,
  
  -- Restrictions
  feature_restrictions JSONB DEFAULT '{}'::jsonb,
  -- Format: {messaging: {restricted: true, until: '2025-01-01'}, booking: {...}}
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety escalation contacts (24/7 support)
CREATE TABLE IF NOT EXISTS safety_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  contact_type TEXT NOT NULL CHECK (contact_type IN ('emergency', 'support', 'legal', 'abuse', 'fraud')),
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Contact methods
  phone TEXT,
  email TEXT,
  chat_url TEXT,
  
  -- Availability
  available_hours TEXT DEFAULT '24/7',
  timezone TEXT DEFAULT 'UTC',
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block/mute list (user-to-user)
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  block_type TEXT DEFAULT 'full' CHECK (block_type IN ('full', 'messages_only', 'hidden')),
  reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(blocker_id, blocked_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_safety_reports_tenant ON safety_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter ON safety_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reported_user ON safety_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON safety_reports(status);
CREATE INDEX IF NOT EXISTS idx_safety_reports_severity ON safety_reports(severity);
CREATE INDEX IF NOT EXISTS idx_safety_reports_type ON safety_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_safety_reports_assigned ON safety_reports(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_safety_reports_urgent ON safety_reports(is_urgent, created_at) WHERE is_urgent = TRUE;
CREATE INDEX IF NOT EXISTS idx_safety_reports_created ON safety_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_safety_report_notes_report ON safety_report_notes(report_id);

CREATE INDEX IF NOT EXISTS idx_safety_actions_report ON safety_actions(safety_report_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_target ON safety_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_active ON safety_actions(is_active, expires_at) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_safety_contacts_tenant ON safety_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_contacts_type ON safety_contacts(contact_type);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_safety_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety reports
CREATE POLICY "Users can view their own reports"
  ON safety_reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON safety_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() OR reporter_type = 'anonymous');

CREATE POLICY "Tenant admins can view all reports"
  ON safety_reports FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage reports"
  ON safety_reports FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for report notes (admin only)
CREATE POLICY "Tenant admins can manage report notes"
  ON safety_report_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM safety_reports r
      WHERE r.id = safety_report_notes.report_id
      AND r.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- RLS Policies for safety actions (admin only)
CREATE POLICY "Tenant admins can view actions"
  ON safety_actions FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can create actions"
  ON safety_actions FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for user safety status
CREATE POLICY "Users can view their own safety status"
  ON user_safety_status FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can view safety status"
  ON user_safety_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_safety_status.user_id
      AND u.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Tenant admins can manage safety status"
  ON user_safety_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_safety_status.user_id
      AND u.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- RLS Policies for safety contacts (public read)
CREATE POLICY "Anyone can view active safety contacts"
  ON safety_contacts FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Tenant admins can manage safety contacts"
  ON safety_contacts FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for user blocks
CREATE POLICY "Users can view their blocks"
  ON user_blocks FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can manage their blocks"
  ON user_blocks FOR ALL
  USING (blocker_id = auth.uid());

-- Function to update user safety status on action
CREATE OR REPLACE FUNCTION update_user_safety_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Create or update safety status record
  INSERT INTO user_safety_status (user_id)
  VALUES (NEW.target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Handle specific action types
  IF NEW.action_type = 'warning' THEN
    UPDATE user_safety_status
    SET warning_count = warning_count + 1,
        last_warning_at = NOW(),
        trust_score = GREATEST(trust_score - 10, 0),
        trust_score_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.target_user_id;
    
  ELSIF NEW.action_type = 'temporary_suspension' THEN
    UPDATE user_safety_status
    SET is_suspended = TRUE,
        suspension_reason = NEW.description,
        suspended_at = NOW(),
        suspended_until = NEW.expires_at,
        suspended_by = NEW.performed_by,
        trust_score = GREATEST(trust_score - 25, 0),
        trust_score_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.target_user_id;
    
  ELSIF NEW.action_type = 'permanent_ban' THEN
    UPDATE user_safety_status
    SET is_banned = TRUE,
        ban_reason = NEW.description,
        banned_at = NOW(),
        banned_by = NEW.performed_by,
        trust_score = 0,
        trust_score_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.target_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_safety_status
  AFTER INSERT ON safety_actions
  FOR EACH ROW EXECUTE FUNCTION update_user_safety_status();

-- Function to set SLA due date based on severity
CREATE OR REPLACE FUNCTION set_safety_report_sla()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_due_at := CASE NEW.severity
    WHEN 'emergency' THEN NOW() + INTERVAL '1 hour'
    WHEN 'critical' THEN NOW() + INTERVAL '4 hours'
    WHEN 'high' THEN NOW() + INTERVAL '24 hours'
    WHEN 'normal' THEN NOW() + INTERVAL '48 hours'
    WHEN 'low' THEN NOW() + INTERVAL '7 days'
  END;
  
  IF NEW.severity IN ('emergency', 'critical') THEN
    NEW.is_urgent := TRUE;
    NEW.requires_immediate_action := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_safety_report_sla
  BEFORE INSERT ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION set_safety_report_sla();

-- Function to expire temporary actions
CREATE OR REPLACE FUNCTION expire_safety_actions()
RETURNS void AS $$
BEGIN
  -- Mark expired actions as inactive
  UPDATE safety_actions
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  -- Lift suspensions that have expired
  UPDATE user_safety_status
  SET is_suspended = FALSE,
      suspension_reason = NULL,
      suspended_until = NULL,
      updated_at = NOW()
  WHERE is_suspended = TRUE
    AND suspended_until IS NOT NULL
    AND suspended_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment report counts
CREATE OR REPLACE FUNCTION update_report_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reporter's filed count
  IF NEW.reporter_id IS NOT NULL THEN
    INSERT INTO user_safety_status (user_id, reports_filed)
    VALUES (NEW.reporter_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET reports_filed = user_safety_status.reports_filed + 1,
        updated_at = NOW();
  END IF;
  
  -- Update reported user's received count
  IF NEW.reported_user_id IS NOT NULL THEN
    INSERT INTO user_safety_status (user_id, reports_received)
    VALUES (NEW.reported_user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET reports_received = user_safety_status.reports_received + 1,
        updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_report_counts
  AFTER INSERT ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION update_report_counts();

-- Insert default safety contacts (can be customized per tenant)
INSERT INTO safety_contacts (tenant_id, contact_type, display_name, description, email, available_hours, display_order)
VALUES 
  (NULL, 'emergency', 'Emergency Safety Line', 'For immediate safety concerns', 'emergency@platform.com', '24/7', 1),
  (NULL, 'support', 'General Support', 'For general questions and help', 'support@platform.com', '24/7', 2),
  (NULL, 'abuse', 'Report Abuse', 'Report harassment or abuse', 'abuse@platform.com', '24/7', 3),
  (NULL, 'fraud', 'Report Fraud', 'Report suspicious activity or scams', 'fraud@platform.com', '24/7', 4)
ON CONFLICT DO NOTHING;

