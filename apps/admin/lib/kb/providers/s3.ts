import "server-only";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { KBItem, KBProvider, KBSearchResult } from "../types";

const bucket = process.env.S3_BUCKET;

function createClient(): S3Client | null {
  if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !bucket) {
    return null;
  }

  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
}

async function streamToString(body: any): Promise<string> {
  if (typeof body === "string") return body;
  if (!body) return "";

  const chunks: Uint8Array[] = [];
  for await (const chunk of body) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function listMatches(
  client: S3Client,
  query: string,
  limit: number
): Promise<KBSearchResult[]> {
  const { Contents } = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: Math.min(limit * 3, 50),
    })
  );

  if (!Contents?.length) return [];

  return Contents.filter((item) =>
    query ? item.Key?.toLowerCase().includes(query.toLowerCase()) : true
  )
    .slice(0, limit)
    .map((item) => ({
      id: item.Key || "",
      title: item.Key || "File",
      snippet: "Stored in S3/Wasabi (content fetched on demand).",
      source: "s3",
      url: undefined,
    }));
}

async function fetchObject(client: S3Client, key: string): Promise<KBItem | null> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const content = await streamToString(response.Body);
  return {
    id: key,
    title: key,
    content,
    source: "s3",
    url: undefined,
    metadata: {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
    },
  };
}

export const s3Provider: KBProvider = {
  name: "s3Provider",
  async search(query, options) {
    const limit = options?.limit ?? 6;
    const client = createClient();
    if (!client) return [];

    try {
      return await listMatches(client, query, limit);
    } catch (error) {
      console.warn("[kb][s3] search failed", error);
      return [];
    }
  },
  async get(id: string) {
    const client = createClient();
    if (!client) return null;
    try {
      return await fetchObject(client, id);
    } catch (error) {
      console.warn("[kb][s3] get failed", error);
      return null;
    }
  },
};


