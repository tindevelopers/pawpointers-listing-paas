import "server-only";

import { dbProvider } from "./providers/db";
import { s3Provider } from "./providers/s3";
import { vectorProvider } from "./providers/vector";
import { KBProvider } from "./types";

const providers: Record<string, KBProvider> = {
  db: dbProvider,
  s3: s3Provider,
  vector: vectorProvider,
};

export function getProvider(name: keyof typeof providers): KBProvider {
  return providers[name];
}

export function getProviders(): KBProvider[] {
  return Object.values(providers);
}


