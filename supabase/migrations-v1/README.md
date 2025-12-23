# V1 Consolidated Migrations

This folder contains consolidated migrations for new forks/deployments.

## Options for Database Setup

### Option 1: Use Consolidated Migration (Recommended for New Projects)

Use the single `001_v1_complete_schema.sql` file which contains the complete
database schema for V1:

```bash
# Copy to migrations folder
cp supabase/migrations-v1/001_v1_complete_schema.sql supabase/migrations/

# Then push to your Supabase project
pnpm supabase db push
```

### Option 2: Use Incremental Migrations (For Existing Projects)

The original 29 incremental migrations are in `supabase/migrations/`.
These are useful if you need to understand the evolution of the schema
or if you're upgrading an existing deployment.

```bash
pnpm supabase db push
```

### Option 3: Use Combined SQL File (Manual Setup)

The `supabase/combined_migrations.sql` file contains all migrations
combined. You can run this directly in the Supabase SQL Editor.

## Schema Overview

The V1 schema includes:

1. **Core Tables**
   - `tenants` - Multi-tenant organizations
   - `users` - User accounts linked to auth.users
   - `roles` - Role definitions (Platform Admin, Tenant Admin, etc.)
   - `user_roles` - User-to-role assignments

2. **Workspaces**
   - `workspaces` - Multiple workspaces per tenant
   - `workspace_members` - Workspace membership

3. **Audit & Security**
   - `audit_logs` - Action logging
   - Row Level Security (RLS) policies on all tables

4. **Features**
   - `white_label_settings` - Branding customization
   - `stripe_*` tables - Payment integration
   - `crm_*` tables - Contacts, companies, deals

5. **AI & Search**
   - `knowledge_documents` - Vector embeddings for RAG chatbot
   - `chat_sessions` / `chat_messages` - Conversation history

## Functions

Key database functions included:
- `is_platform_admin()` - Check if user is platform admin
- `get_current_tenant_id()` - Get tenant from session
- `increment_view_count()` - Atomic counter updates
- `search_knowledge_documents()` - Vector similarity search
