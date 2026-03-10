#!/usr/bin/env node
/**
 * Smoke test: portal chat API streaming (SSE).
 * Run with portal dev server up: pnpm --filter portal dev (or from apps/portal: pnpm dev)
 * Usage: node scripts/smoke-test-chat-streaming.mjs [baseUrl]
 * Example: node scripts/smoke-test-chat-streaming.mjs http://localhost:3030
 */

const BASE = process.argv[2] || process.env.PORTAL_BASE_URL || 'http://localhost:3030';

async function main() {
  const results = { passed: 0, failed: 0, details: [] };

  function pass(name, detail = '') {
    results.passed++;
    results.details.push({ name, ok: true, detail });
    console.log(`  ✓ ${name}${detail ? ` (${detail})` : ''}`);
  }
  function fail(name, detail = '') {
    results.failed++;
    results.details.push({ name, ok: false, detail });
    console.log(`  ✗ ${name}${detail ? `: ${detail}` : ''}`);
  }

  console.log('=== Smoke test: Chat streaming (SSE) ===');
  console.log('Base URL:', BASE);
  console.log('');

  // 1. GET /api/chat (health)
  try {
    const getRes = await fetch(`${BASE}/api/chat`);
    const getBody = await getRes.json().catch(() => ({}));
    if (!getRes.ok) {
      fail('GET /api/chat', `HTTP ${getRes.status}`);
    } else if (!getBody.enabled) {
      fail('GET /api/chat', 'Chat not enabled');
    } else {
      pass('GET /api/chat (health)', `enabled=true, provider=${getBody.provider ?? 'n/a'}`);
    }
  } catch (e) {
    fail('GET /api/chat', e.message || String(e));
  }

  // 2. POST /api/chat?stream=1 (streaming)
  try {
    const streamRes = await fetch(`${BASE}/api/chat?stream=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Say "smoke test ok" in a short sentence.',
        history: [],
      }),
    });

    const contentType = streamRes.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      fail('Streaming Content-Type', `expected text/event-stream, got ${contentType}`);
    } else {
      pass('Streaming Content-Type', 'text/event-stream');
    }

    if (!streamRes.body) {
      fail('Streaming body', 'no body');
    } else {
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokenCount = 0;
      let donePayload = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          let eventType = '';
          const dataLines = [];
          for (const line of part.split('\n')) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
          }
          const dataStr = dataLines.join('\n');
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'error' && data.error) {
              donePayload = { _error: data.error };
            } else if (eventType === 'done') {
              donePayload = data;
            } else if (data.text != null) {
              tokenCount++;
            }
          } catch (_) {}
        }
      }
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.text != null) tokenCount++;
          if (data.message != null && !donePayload) donePayload = data;
          if (data.error && !donePayload) donePayload = { _error: data.error };
        } catch (_) {}
      }

      if (tokenCount > 0) {
        pass('SSE token chunks', `received ${tokenCount} chunk(s)`);
      } else if (donePayload?._error) {
        fail('SSE token chunks', `provider error (e.g. 404): ${String(donePayload._error).slice(0, 80)}...`);
      } else {
        fail('SSE token chunks', 'no data: {"text":"..."} events');
      }
      if (donePayload && (donePayload.message != null || donePayload.sessionId != null)) {
        pass('SSE event:done', `message length=${(donePayload.message || '').length}`);
      } else if (donePayload?._error) {
        fail('SSE event:done', `stream returned error (check ABACUS_* env): ${String(donePayload._error).slice(0, 60)}...`);
      } else {
        fail('SSE event:done', 'missing or empty done payload');
      }
    }
  } catch (e) {
    fail('POST /api/chat stream', e.message || String(e));
  }

  // 3. POST /api/chat (non-streaming fallback)
  try {
    const jsonRes = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Reply with one word: OK',
        history: [],
      }),
    });
    const jsonBody = await jsonRes.json().catch(() => ({}));
    if (!jsonRes.ok) {
      fail('Non-streaming POST', `HTTP ${jsonRes.status}`);
    } else if (!jsonBody.success || jsonBody.message == null) {
      fail('Non-streaming POST', 'success or message missing');
    } else {
      pass('Non-streaming POST', `message length=${(jsonBody.message || '').length}`);
    }
  } catch (e) {
    fail('Non-streaming POST', e.message || String(e));
  }

  console.log('');
  console.log(`Result: ${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
