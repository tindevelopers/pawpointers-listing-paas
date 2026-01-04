export type KBSource = "db" | "s3" | "vector";

export type KBItem = {
  id: string;
  title: string;
  content: string;
  source: KBSource;
  url?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  updatedAt?: string | null;
};

export type KBSearchResult = {
  id: string;
  title: string;
  snippet: string;
  source: KBSource;
  url?: string | null;
  score?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type KBIngestInput = {
  id?: string;
  title: string;
  content: string;
  source: KBSource;
  url?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type KBProvider = {
  name: string;
  search: (
    query: string,
    options?: { limit?: number }
  ) => Promise<KBSearchResult[]>;
  get?: (id: string) => Promise<KBItem | null>;
  ingest?: (item: KBIngestInput) => Promise<void>;
};


