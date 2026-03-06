#!/usr/bin/env node
/**
 * End-to-end smoke test for Abacus chat streaming pipeline.
 *
 * Validates:
 * 1. Abacus provider returns streamed tokens (or single chunk fallback)
 * 2. /api/chat emits SSE when stream=true
 * 3. Frontend contract: data: {"text":"..."} and event: done
 * 4. Conversation persistence (sessionId in done; optional second message)
 * 5. Non-streaming fallback returns JSON with message/sessionId
 *
 * Requires: portal running (default http://localhost:3030), Supabase env in apps/portal/.env.local
 * Run: node scripts/smoke-test-chat-streaming.mjs
 * Optional: PORTAL_URL=http://localhost:3030 SMOKE_TEST_EMAIL=... SMOKE_TEST_PASSWORD=...
 */

import dotenv from 'dotenv';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
dotenv.config({ path: join(root, 'apps/portal/.env.local') });

const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3030';
const API_CHAT = `${PORTAL_URL}/api/chat`;

const results = {
  '1_abacus_streaming_tokens': { pass: false, detail: '' },
  '2_api_sse_emitted': { pass: false, detail: '' },
  '3_frontend_sse_contract': { pass: false, detail: '' },
  '4_persistence_and_continuity': { pass: false, detail: '' },
  '5_non_streaming_fallback': { pass: false, detail: '' },
};

function pass(name, detail = '') {
  results[name].pass = true;
  results[name].detail = detail;
}

function fail(name, detail) {
  results[name].pass = false;
  results[name].detail = detail || 'Unknown error';
}

async function ensureAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  let email = process.env.SMOKE_TEST_EMAIL || 'alice@example.com';
  let password = process.env.SMOKE_TEST_PASSWORD || 'Password123!';

  const cookieJar = new Map();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: async () =>
        Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
      setAll: async (cookies) => {
        for (const { name, value } of cookies) {
          if (value) cookieJar.set(name, value);
          else cookieJar.delete(name);
        }
      },
    },
  });

  let { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error(`Sign-in failed: ${signInError.message}. Set SMOKE_TEST_EMAIL/PASSWORD or SUPABASE_SERVICE_ROLE_KEY to create a test user.`);
    }
    email = `smoke-${Date.now()}@example.com`;
    password = `Smoke${Date.now().toString().slice(-6)}!`;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw new Error(`Create user failed: ${createErr.message}`);
    ({ error: signInError } = await supabase.auth.signInWithPassword({ email, password }));
    if (signInError) throw new Error(`Sign-in after create failed: ${signInError.message}`);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session after sign-in');

  // Build session cookie in the format Next.js + @supabase/ssr expect (base64url, optional chunking)
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const raw = JSON.stringify(session);
  const base64url = Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const value = `base64-${base64url}`;
  const MAX = 3180;
  if (value.length <= MAX) {
    cookieJar.set(storageKey, value);
  } else {
    for (let i = 0; i * MAX < value.length; i++) {
      cookieJar.set(`${storageKey}.${i}`, value.slice(i * MAX, (i + 1) * MAX));
    }
  }

  const cookieHeader = Array.from(cookieJar.entries())
    .map(([name, val]) => `${name}=${val}`)
    .join('; ');
  return { cookieHeader };
}

function parseSSE(buffer) {
  const events = [];
  const parts = buffer.replace(/\r\n/g, '\n').split('\n\n');
  for (const part of parts) {
    if (!part.trim()) continue;
    const lines = part.split('\n');
    let eventType = 'message';
    const dataLines = [];
    for (const line of lines) {
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
        continue;
      }
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) continue;
    const data = dataLines.join('\n');
    events.push({ eventType, data });
  }
  return events;
}

async function runStreamingRequest(requestHeaders, body) {
  const res = await fetch(`${API_CHAT}?stream=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...requestHeaders },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (!contentType.includes('text/event-stream') || !res.body) {
    throw new Error(`Expected text/event-stream with body, got ${contentType}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const allEvents = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const events = parseSSE(part);
      allEvents.push(...events);
    }
  }
  if (buffer.trim()) {
    allEvents.push(...parseSSE(buffer));
  }
  return allEvents;
}

async function runNonStreamingRequest(requestHeaders, body) {
  const res = await fetch(API_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...requestHeaders },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected application/json, got ${contentType}`);
  }
  return res.json();
}

async function main() {
  console.log('Smoke test: Abacus chat streaming pipeline\n');
  console.log('Portal URL:', PORTAL_URL);
  console.log('API chat:  ', API_CHAT, '\n');

  const smokeSecret = process.env.SMOKE_TEST_SECRET;
  const useBypass = smokeSecret && smokeSecret.length > 0;
  let requestHeaders;
  if (useBypass) {
    requestHeaders = { 'x-smoke-test-secret': smokeSecret };
    console.log('Auth: bypass (SMOKE_TEST_SECRET)');
  } else {
    try {
      const auth = await ensureAuth();
      requestHeaders = { Cookie: auth.cookieHeader };
      console.log('Auth: OK');
    } catch (e) {
      console.error('Auth failed:', e.message);
      console.error('Set SMOKE_TEST_SECRET in apps/portal/.env.local to bypass auth for API smoke test.');
      process.exit(2);
    }
  }

  // --- 2 & 3: SSE emitted and frontend contract (data: {"text":"..."}, event: done) ---
  try {
    const events = await runStreamingRequest(requestHeaders, {
      message: 'Reply with exactly: OK',
      stream: true,
    });
    pass('2_api_sse_emitted', `Received ${events.length} SSE events`);

    const tokenEvents = events.filter((e) => e.eventType === 'message' || !e.eventType).filter((e) => {
      try {
        const p = JSON.parse(e.data || '{}');
        return typeof p.text === 'string';
      } catch {
        return false;
      }
    });
    const doneEvents = events.filter((e) => e.eventType === 'done');
    const errorEvents = events.filter((e) => e.eventType === 'error');

    if (errorEvents.length > 0) {
      const errPayload = (() => {
        try {
          return JSON.parse(errorEvents[0].data || '{}');
        } catch {
          return {};
        }
      })();
      fail('3_frontend_sse_contract', `Stream sent event: error - ${errPayload.message || errorEvents[0].data}`);
    } else if (doneEvents.length === 0) {
      fail('3_frontend_sse_contract', 'No event: done received');
    } else {
      pass('3_frontend_sse_contract', `data: {"text":"..."} chunks and event: done present`);
    }

    // 1: Provider returns streamed tokens (at least one chunk; multiple = true streaming)
    const tokenCount = tokenEvents.length;
    const fullText = tokenEvents
      .map((e) => {
        try {
          return JSON.parse(e.data || '{}').text || '';
        } catch {
          return '';
        }
      })
      .join('');
    if (tokenCount >= 1 && fullText.length >= 1) {
      pass('1_abacus_streaming_tokens', `Received ${tokenCount} token chunk(s), ${fullText.length} chars (fallback or stream)`);
    } else {
      fail('1_abacus_streaming_tokens', `Expected at least 1 token chunk; got ${tokenCount} chunks, ${fullText.length} chars`);
    }

    // 4: Persistence and continuity (sessionId in done; second message with sessionId)
    let donePayload = {};
    try {
      donePayload = JSON.parse(doneEvents[0]?.data || '{}');
    } catch {}
    const sessionId = donePayload.sessionId;
    const conversationId = donePayload.conversationId;

    if (sessionId) {
      const secondEvents = await runStreamingRequest(requestHeaders, {
        message: 'Say only: Done',
        stream: true,
        sessionId,
        ...(conversationId ? { conversationId } : {}),
      });
      const secondDone = secondEvents.filter((e) => e.eventType === 'done');
      const secondOk = secondDone.length > 0 && !secondEvents.some((e) => e.eventType === 'error');
      if (secondOk) {
        pass('4_persistence_and_continuity', 'sessionId in done; second message with sessionId succeeded');
      } else {
        fail('4_persistence_and_continuity', 'Second request with sessionId failed or returned error event');
      }
    } else {
      if (useBypass) {
        pass('4_persistence_and_continuity', 'skipped when using auth bypass (no real user for createSession)');
      } else {
        fail('4_persistence_and_continuity', 'sessionId missing from event: done (createSession may be failing)');
      }
    }
  } catch (e) {
    fail('2_api_sse_emitted', e.message);
    fail('3_frontend_sse_contract', e.message);
    fail('1_abacus_streaming_tokens', e.message);
    fail('4_persistence_and_continuity', e.message);
  }

  // --- 5: Non-streaming fallback ---
  try {
    const json = await runNonStreamingRequest(requestHeaders, {
      message: 'Reply with one word: Hi',
    });
    if (json.success === true && typeof json.message === 'string') {
      pass('5_non_streaming_fallback', `JSON response with success and message (sessionId: ${json.sessionId ? 'present' : 'absent'})`);
    } else {
      fail('5_non_streaming_fallback', `Unexpected shape: success=${json.success}, message type=${typeof json.message}`);
    }
  } catch (e) {
    fail('5_non_streaming_fallback', e.message);
  }

  // --- Report ---
  console.log('\n--- Results ---');
  let allPass = true;
  for (const [name, { pass: p, detail }] of Object.entries(results)) {
    const status = p ? 'PASS' : 'FAIL';
    if (!p) allPass = false;
    console.log(`  ${status}  ${name}: ${detail}`);
  }
  console.log('');
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
