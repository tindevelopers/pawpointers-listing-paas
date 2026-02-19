-- AI assistant drafts and notes for bookings
-- Used by webhook-driven assistant: confirmation drafts, reminders, summaries, conflict flags

CREATE TABLE IF NOT EXISTS booking_ai_assistant_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,

  -- Type: confirmation_draft, reminder_draft, followup_draft, summary, conflict_flag
  note_type text NOT NULL CHECK (note_type IN (
    'confirmation_draft',
    'reminder_draft',
    'followup_draft',
    'summary',
    'conflict_flag'
  )),

  -- AI-generated content
  content text NOT NULL,

  -- Optional structured metadata (e.g. { flag: "missing_contact", severity: "warning" })
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Trigger that created this note (e.g. "BOOKING_CREATED", "BOOKING_RESCHEDULED")
  trigger_event text,

  created_at timestamptz DEFAULT now(),

  UNIQUE(booking_id, note_type)
);

CREATE INDEX IF NOT EXISTS idx_booking_ai_assistant_notes_booking
  ON booking_ai_assistant_notes(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_ai_assistant_notes_tenant
  ON booking_ai_assistant_notes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_booking_ai_assistant_notes_type
  ON booking_ai_assistant_notes(note_type);
