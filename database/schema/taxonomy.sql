-- ===================================
-- TAXONOMY SYSTEM (Configuration-driven)
-- ===================================
-- Flexible taxonomy system that supports:
-- - Industry taxonomies (Legal > Lawyers > Family Law)
-- - Location taxonomies (USA > California > San Francisco)
-- - Product categories, tags, and more

-- Define taxonomy types (industry, location, hybrid)
CREATE TABLE IF NOT EXISTS taxonomy_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL, -- 'industry', 'location', 'category', 'tag'
  slug text NOT NULL,
  description text,
  hierarchical bool DEFAULT true, -- Can terms have parent-child relationships?
  config jsonb DEFAULT '{}'::jsonb, -- Configuration for this taxonomy type
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Taxonomy hierarchy (e.g., Countries > Regions > Cities OR Legal > Lawyers > Family Law)
CREATE TABLE IF NOT EXISTS taxonomy_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  taxonomy_type_id uuid REFERENCES taxonomy_types(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES taxonomy_terms(id) ON DELETE CASCADE, -- For hierarchical taxonomies
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb, -- Store type-specific data (coordinates, certifications, etc.)
  display_order int DEFAULT 0,
  seo_metadata jsonb, -- {title, description, keywords}
  featured_image text,
  icon text,
  count int DEFAULT 0, -- Cache of how many listings use this term
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, taxonomy_type_id, slug)
);

-- Index for hierarchical queries
CREATE INDEX idx_taxonomy_types_tenant ON taxonomy_types(tenant_id);
CREATE INDEX idx_taxonomy_types_slug ON taxonomy_types(slug);

CREATE INDEX idx_taxonomy_terms_tenant ON taxonomy_terms(tenant_id);
CREATE INDEX idx_taxonomy_terms_type ON taxonomy_terms(taxonomy_type_id);
CREATE INDEX idx_taxonomy_terms_parent ON taxonomy_terms(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_taxonomy_terms_slug ON taxonomy_terms(tenant_id, slug);

-- Enable RLS
ALTER TABLE taxonomy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_terms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view taxonomy types"
  ON taxonomy_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage taxonomy types"
  ON taxonomy_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      WHERE utr.user_id = auth.uid()
      AND utr.tenant_id = taxonomy_types.tenant_id
      AND utr.role_name IN ('admin', 'platform_admin')
    )
  );

CREATE POLICY "Public can view taxonomy terms"
  ON taxonomy_terms FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage taxonomy terms"
  ON taxonomy_terms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      WHERE utr.user_id = auth.uid()
      AND utr.tenant_id = taxonomy_terms.tenant_id
      AND utr.role_name IN ('admin', 'platform_admin')
    )
  );

-- Function to update term count
CREATE OR REPLACE FUNCTION update_taxonomy_term_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE taxonomy_terms
    SET count = count + 1
    WHERE id = NEW.taxonomy_term_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE taxonomy_terms
    SET count = GREATEST(0, count - 1)
    WHERE id = OLD.taxonomy_term_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

