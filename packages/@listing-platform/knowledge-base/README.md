## Knowledge Base Package

Pluggable knowledge base utilities (CRUD, search, and listing → knowledge sync) with an embedding provider interface.

### Features
- Add, update, delete knowledge documents
- Vector similarity search via Supabase (pgvector RPC)
- Sync listings into knowledge documents
- Pluggable embeddings via `EmbeddingProvider`

### API Surface
- Types: `KnowledgeDocument`, `KnowledgeSearchResult`, `EmbeddingProvider`
- Functions: `addDocument`, `updateDocument`, `deleteDocument`, `searchDocuments`, `syncListingsToKnowledge`

### Usage
```ts
import { createClient } from '@supabase/supabase-js';
import { addDocument, searchDocuments } from '@listing-platform/knowledge-base';
import { createOpenAIEmbeddingProvider } from '@listing-platform/ai'; // or your own provider

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const embeddings = createOpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY! });

await addDocument(supabase, embeddings, {
  title: 'FAQ',
  content: 'How to list an item...',
  sourceType: 'manual',
});

const results = await searchDocuments(supabase, embeddings, 'list my property');
```

### Notes
- Requires `@supabase/supabase-js` as a peer dependency.
- Embedding provider is pluggable; AI package provides an OpenAI-based provider.


