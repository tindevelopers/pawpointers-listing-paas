# Environment variables

Set these in your runtime (e.g. `.env.local`) before running the admin app.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

AI_GATEWAY_URL=
AI_GATEWAY_API_KEY=
AI_MODEL=openai/gpt-4.1
EMBEDDING_MODEL=openai/text-embedding-3-small

AI_CHAT_PROVIDER=gateway     # Choose between `abacus`, `gateway`, `openai`, or `ghl`
AI_EMBEDDING_PROVIDER=gateway  # Optional override for embeddings provider (defaults to AI_PROVIDER)
ABACUS_DEPLOYMENT_ID=        # Required when AI_CHAT_PROVIDER=abacus
ABACUS_DEPLOYMENT_TOKEN=     # Required when AI_CHAT_PROVIDER=abacus
ABACUS_API_KEY=              # Optional Abacus API key for workloads outside deployments

PGVECTOR_TABLE=kb_chunks

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```


