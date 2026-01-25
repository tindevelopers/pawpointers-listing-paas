-- =============================================================================
-- Add optional fields to knowledge_documents table
-- =============================================================================
-- Adds category, tags, view_count, and helpful_count for better organization 
-- and analytics
--
-- NOTE: This migration must run after the knowledge base schema exists.

-- Add fields (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
    -- Add category field
    ALTER TABLE knowledge_documents
    ADD COLUMN IF NOT EXISTS category TEXT;

    -- Add tags array field
    ALTER TABLE knowledge_documents 
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

    -- Add view count field
    ALTER TABLE knowledge_documents 
    ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

    -- Add helpful count field
    ALTER TABLE knowledge_documents 
    ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

    -- Create index on category for filtering
    CREATE INDEX IF NOT EXISTS knowledge_documents_category_idx 
    ON knowledge_documents(category) 
    WHERE category IS NOT NULL;

    -- Create GIN index on tags for array queries
    CREATE INDEX IF NOT EXISTS knowledge_documents_tags_idx 
    ON knowledge_documents USING GIN(tags);

    -- Create index on view_count for sorting popular documents
    CREATE INDEX IF NOT EXISTS knowledge_documents_view_count_idx 
    ON knowledge_documents(view_count DESC) 
    WHERE is_active = true;
  END IF;
END $$;

-- Function to increment view count (only if table exists)
CREATE OR REPLACE FUNCTION increment_knowledge_document_views(document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
    UPDATE knowledge_documents
    SET view_count = view_count + 1
    WHERE id = document_id AND is_active = true;
  END IF;
END;
$$;

-- Function to increment helpful count (only if table exists)
CREATE OR REPLACE FUNCTION increment_knowledge_document_helpful(document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
    UPDATE knowledge_documents
    SET helpful_count = helpful_count + 1
    WHERE id = document_id AND is_active = true;
  END IF;
END;
$$;

-- Comments (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
    COMMENT ON COLUMN knowledge_documents.category IS 'Category for organizing knowledge documents';
    COMMENT ON COLUMN knowledge_documents.tags IS 'Array of tags for filtering and organization';
    COMMENT ON COLUMN knowledge_documents.view_count IS 'Number of times this document has been viewed';
    COMMENT ON COLUMN knowledge_documents.helpful_count IS 'Number of times users marked this document as helpful';
  END IF;
END $$;
