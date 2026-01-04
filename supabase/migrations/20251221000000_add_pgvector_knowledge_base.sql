-- =============================================================================
-- Add pgvector extension and knowledge base tables for AI chatbot
-- =============================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- Knowledge Documents Table
-- Stores documents and their embeddings for RAG chatbot
-- =============================================================================

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Document content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  
  -- Vector embedding (1536 dimensions for OpenAI ada-002)
  embedding vector(1536),
  
  -- Source information
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  source_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_idx 
ON knowledge_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for tenant filtering
CREATE INDEX IF NOT EXISTS knowledge_documents_tenant_id_idx 
ON knowledge_documents(tenant_id);

-- Index for active documents
CREATE INDEX IF NOT EXISTS knowledge_documents_active_idx 
ON knowledge_documents(is_active) 
WHERE is_active = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_knowledge_documents_updated_at ON knowledge_documents;
CREATE TRIGGER trigger_knowledge_documents_updated_at
BEFORE UPDATE ON knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_documents_updated_at();

-- =============================================================================
-- Chat Sessions Table
-- Stores chat conversation history for context
-- =============================================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Session metadata
  title TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user sessions
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx 
ON chat_sessions(user_id);

-- Index for tenant sessions
CREATE INDEX IF NOT EXISTS chat_sessions_tenant_id_idx 
ON chat_sessions(tenant_id);

-- =============================================================================
-- Chat Messages Table
-- Stores individual messages in chat sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Context documents used for this message (for RAG)
  context_document_ids UUID[] DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session messages
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx 
ON chat_messages(session_id);

-- Index for recent messages
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx 
ON chat_messages(created_at DESC);

-- =============================================================================
-- Function to find similar documents using vector similarity
-- =============================================================================

CREATE OR REPLACE FUNCTION search_knowledge_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5,
  filter_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  source_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.tenant_id,
    kd.title,
    kd.content,
    kd.excerpt,
    kd.source_type,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM knowledge_documents kd
  WHERE 
    kd.is_active = true
    AND (filter_tenant_id IS NULL OR kd.tenant_id = filter_tenant_id)
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Knowledge documents: Platform admins can manage all, tenant admins their own
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'knowledge_documents' 
    AND policyname = 'knowledge_documents_select_policy'
  ) THEN
    CREATE POLICY knowledge_documents_select_policy ON knowledge_documents
      FOR SELECT
      USING (
        is_active = true
        AND (
          tenant_id IS NULL 
          OR tenant_id = (SELECT current_setting('app.current_tenant_id', true))::uuid
        )
      );
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'knowledge_documents' 
    AND policyname = 'knowledge_documents_admin_policy'
  ) THEN
    CREATE POLICY knowledge_documents_admin_policy ON knowledge_documents
      FOR ALL
      USING (
        -- Platform admins can manage all
        public.is_platform_admin()
        OR
        -- Tenant admins can manage their own tenant's documents
        auth.uid() IN (
          SELECT utr.user_id FROM user_tenant_roles utr
          JOIN roles r ON r.id = utr.role_id
          WHERE r.name IN ('Tenant Admin', 'Workspace Admin')
            AND utr.tenant_id = knowledge_documents.tenant_id
        )
      );
  END IF;
END $$;

-- Chat sessions: Users can only see their own sessions
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' 
    AND policyname = 'chat_sessions_user_policy'
  ) THEN
    CREATE POLICY chat_sessions_user_policy ON chat_sessions
      FOR ALL
      USING (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;

-- Chat messages: Users can only see messages from their sessions
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'chat_messages_user_policy'
  ) THEN
    CREATE POLICY chat_messages_user_policy ON chat_messages
      FOR ALL
      USING (
        session_id IN (
          SELECT id FROM chat_sessions WHERE user_id = auth.uid() OR user_id IS NULL
        )
      );
  END IF;
END $$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE knowledge_documents IS 'Stores documents and embeddings for AI RAG chatbot';
COMMENT ON TABLE chat_sessions IS 'Stores chat conversation sessions';
COMMENT ON TABLE chat_messages IS 'Stores individual chat messages';
COMMENT ON FUNCTION search_knowledge_documents IS 'Vector similarity search for RAG context retrieval';
