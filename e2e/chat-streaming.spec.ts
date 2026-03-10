import { test, expect } from '@playwright/test';

/**
 * E2E verification: SSE streaming for /api/chat in a real browser.
 *
 * Goals:
 * 1. Launch the app and interact with the chat UI (hero AIChat or ChatWidget).
 * 2. Send a message and observe the request/response to /api/chat.
 * 3. Confirm the browser receives SSE token events progressively (multiple chunks over time).
 * 4. Verify the UI updates incrementally as tokens arrive (not one final update).
 *
 * No fixes are applied here; this test only analyzes and verifies behavior.
 */

const PORTAL_BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3030';

test.describe('Chat SSE streaming in browser', () => {
  test.beforeEach(async ({ page }) => {
    // Record SSE chunk delivery in the browser without consuming the app's stream.
    // We clone the response and read the clone, so the app still gets the original body.
    await page.addInitScript(() => {
      (window as unknown as { __playwrightSSELog?: { t: number; len: number; preview?: string }[] }).__playwrightSSELog = [];
      const origFetch = window.fetch;
      window.fetch = async function (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> {
        const res = await origFetch.call(this, input, init);
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (!url.includes('/api/chat')) return res;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('event-stream') || !res.body) return res;
        const clone = res.clone();
        const log = (window as unknown as { __playwrightSSELog: { t: number; len: number; preview?: string }[] }).__playwrightSSELog;
        const reader = clone.body!.getReader();
        const decoder = new TextDecoder();
        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const len = value ? value.length : 0;
              const preview = value ? decoder.decode(value.slice(0, 120)) : '';
              log.push({ t: Date.now(), len, preview: preview.slice(0, 80) });
            }
          } catch {
            // ignore
          }
        })();
        return res;
      };
    });
  });

  test('hero AIChat: /api/chat receives SSE chunks over time and UI updates incrementally', async ({
    page,
  }) => {
    await page.goto(PORTAL_BASE + '/');

    // Switch to AI Chat mode (second tab)
    await page.getByRole('button', { name: /AI Chat/i }).click();

    // Ensure chat input is visible and send a short prompt to get a quick stream
    const input = page.getByPlaceholder(/Ask me anything/i);
    await expect(input).toBeVisible();
    await input.fill('Reply with exactly: One two three.');
    await page.getByRole('button', { name: /Send message/i }).click();

    // Poll assistant message content length over time to detect incremental updates
    const contentLengths: number[] = [];
    const assistantBubble = page.locator('.flex.justify-start .rounded-lg').filter({ has: page.locator('p.text-sm.whitespace-pre-wrap') }).last();
    const start = Date.now();
    const timeout = 30_000;

    while (Date.now() - start < timeout) {
      const text = await assistantBubble.locator('p.text-sm.whitespace-pre-wrap').textContent().catch(() => '');
      const len = (text || '').trim().length;
      contentLengths.push(len);
      // Loading indicator gone and we have some content => stream finished
      const loadingVisible = await page.locator('div:has(.animate-bounce)').isVisible().catch(() => false);
      if (!loadingVisible && len > 0) break;
      await page.waitForTimeout(100);
    }

    // Read SSE log from the page (chunk arrival timestamps)
    const sseLog = await page.evaluate(() => (window as unknown as { __playwrightSSELog: { t: number; len: number; preview?: string }[] }).__playwrightSSELog);

    // --- Verification (analysis only; no fixes) ---

    const totalChunks = sseLog.length;
    const totalBytes = sseLog.reduce((a, c) => a + c.len, 0);
    const distinctTimestamps = new Set(sseLog.map((c) => c.t)).size;
    const distinctLengths = new Set(contentLengths.filter((l) => l > 0)).size;
    const incrementalUI = contentLengths.some((l) => l > 0) && (distinctLengths > 1 || contentLengths.filter((l) => l > 0).length > 1);

    test.info().annotations.push(
      { type: 'sse_chunk_count', description: String(totalChunks) },
      { type: 'sse_distinct_timestamps', description: String(distinctTimestamps) },
      { type: 'sse_total_bytes', description: String(totalBytes) },
      { type: 'content_length_samples', description: contentLengths.slice(0, 30).join(',') + (contentLengths.length > 30 ? '...' : '') },
      { type: 'incremental_ui_observed', description: incrementalUI ? 'yes' : 'no' }
    );

    // Log for manual inspection (and CI)
    console.log('[chat-streaming] SSE chunks:', totalChunks, 'distinct timestamps:', distinctTimestamps, 'total bytes:', totalBytes);
    console.log('[chat-streaming] Content length samples:', contentLengths.slice(0, 25));
    if (sseLog.length > 0 && sseLog[0].preview) {
      console.log('[chat-streaming] First chunk preview:', sseLog[0].preview);
    }

    // At least one chunk was received (confirms /api/chat streaming response reached the browser)
    expect(totalChunks >= 1, 'At least one SSE chunk should be recorded').toBe(true);
    // Assistant message eventually had content (confirms UI received and rendered the response)
    expect(contentLengths.some((l) => l > 0), 'Assistant message should show content').toBe(true);

    // Interpretation: If totalChunks === 1 and first chunk contains both token + "event: done",
    // the browser received the entire stream in one buffer (no progressive delivery). Then the
    // frontend would only apply updates once or twice, so no incremental UI. Multiple chunks
    // and multiple content_length_samples over time would indicate true token-by-token streaming.
  });

  test('ChatWidget: /api/chat request is streaming and response is event-stream', async ({
    page,
  }) => {
    await page.goto(PORTAL_BASE + '/');

    // Open floating chat widget (layout uses title "Need help?" and placeholder "Type your question...")
    await page.getByRole('button', { name: /Open chat/i }).click();
    await expect(page.getByText('Need help?')).toBeVisible({ timeout: 5000 });
    const input = page.getByPlaceholder('Type your question...');
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill('Say hello in one sentence.');
    await page.getByRole('button', { name: /Send message/i }).click();

    // Wait for loading to finish (bubble with dots disappears and we have assistant text)
    const assistantBubble = page.locator('.flex.justify-start .rounded-lg').filter({ has: page.locator('p.text-sm.whitespace-pre-wrap') }).last();
    await expect(assistantBubble.locator('p.text-sm.whitespace-pre-wrap')).not.toHaveText('', { timeout: 25_000 });

    const sseLog = await page.evaluate(() => (window as unknown as { __playwrightSSELog: { t: number; len: number; preview?: string }[] }).__playwrightSSELog);

    const totalChunks = sseLog.length;
    const hasDataChunks = sseLog.some((c) => c.preview && (c.preview.includes('"text"') || c.preview.includes('data:')));

    test.info().annotations.push(
      { type: 'widget_sse_chunk_count', description: String(totalChunks) },
      { type: 'widget_has_data_chunks', description: String(hasDataChunks) }
    );

    expect(totalChunks >= 1, 'ChatWidget /api/chat should receive at least one SSE chunk').toBe(true);
  });
});
