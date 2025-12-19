-- ===================================
-- DYNAMIC FIELD DEFINITIONS
-- ===================================
-- Define custom fields per taxonomy or listing type
-- This allows each cloned instance to have different field schemas

CREATE TABLE IF NOT EXISTS field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  taxonomy_type_id uuid REFERENCES taxonomy_types(id), -- Optional: fields specific to taxonomy
  field_key text NOT NULL, -- e.g., 'bedrooms', 'years_experience', 'amenities'
  field_label text NOT NULL,
  field_type text NOT NULL, -- 'text', 'number', 'boolean', 'select', 'multiselect', 'date', 'location', 'rich_text'
  field_config jsonb DEFAULT '{}'::jsonb, -- Options for select, validation rules, etc.
  required bool DEFAULT false,
  searchable bool DEFAULT false, -- Should this field be searchable?
  filterable bool DEFAULT false, -- Should this field appear in filters?
  display_in_card bool DEFAULT false, -- Show in listing card/preview?
  display_order int DEFAULT 0,
  help_text text,
  placeholder text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, field_key)
);

CREATE INDEX idx_field_definitions_tenant ON field_definitions(tenant_id);
CREATE INDEX idx_field_definitions_taxonomy ON field_definitions(taxonomy_type_id);
CREATE INDEX idx_field_definitions_searchable ON field_definitions(searchable) WHERE searchable = true;

-- Enable RLS
ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view field definitions"
  ON field_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage field definitions"
  ON field_definitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      WHERE utr.user_id = auth.uid()
      AND utr.tenant_id = field_definitions.tenant_id
      AND utr.role_name IN ('admin', 'platform_admin')
    )
  );

-- Function to validate custom field data against field definitions
CREATE OR REPLACE FUNCTION validate_custom_fields(
  p_tenant_id uuid,
  p_custom_fields jsonb
) RETURNS boolean AS $$
DECLARE
  field_def RECORD;
  field_value jsonb;
BEGIN
  -- Check all required fields are present
  FOR field_def IN 
    SELECT field_key, field_type, required, field_config
    FROM field_definitions
    WHERE tenant_id = p_tenant_id AND required = true
  LOOP
    field_value := p_custom_fields -> field_def.field_key;
    
    IF field_value IS NULL OR field_value = 'null'::jsonb THEN
      RAISE EXCEPTION 'Required field % is missing', field_def.field_key;
    END IF;
    
    -- Add type validation here if needed
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

