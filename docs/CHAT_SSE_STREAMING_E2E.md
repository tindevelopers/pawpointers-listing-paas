# Chat SSE Streaming – E2E Verification

This document describes the Playwright E2E tests used to verify whether SSE streaming for `/api/chat` is **consumed and rendered progressively** in a real browser (not just that the backend streams).

## Running the tests

From the repo root, with the portal running on `http://localhost:3030` (or set `PLAYWRIGHT_BASE_URL`):

```bash
pnpm exec playwright test e2e/chat-streaming.spec.ts --project=chromium
```

To run with the default config (starts portal if needed, all browsers):

```bash
pnpm exec playwright test e2e/chat-streaming.spec.ts
```

## What the tests do

1. **Hero AIChat**
   - Go to `/`, switch to "AI Chat", send a short message.
   - **SSE observation:** A script in the page clones the `/api/chat` response and records each time a chunk is received from the stream (timestamp and length). This does not consume the app’s response body.
   - **UI observation:** Poll the assistant message text length every 100ms until loading finishes.
   - **Assertions:** At least one SSE chunk is recorded; the assistant message eventually has content.

2. **ChatWidget**
   - Open the floating chat ("Need help?"), type a message, send.
   - Waits for the assistant reply and checks that at least one SSE chunk was recorded for `/api/chat`.

## How to interpret results

- **`sse_chunk_count`**  
  Number of times the browser received data from the response body.  
  - **1 chunk** → The entire stream was delivered in a single buffer. The frontend will only process events once (or in one batch), so users will not see token-by-token updates.  
  - **Multiple chunks** → Data arrived over time; the frontend can update the UI incrementally as each chunk is parsed.

- **`First chunk preview`**  
  If the first (or only) chunk contains both `data: {"text":"..."}` and `event: done`, the full response was buffered and delivered together.

- **`content_length_samples`**  
  Assistant message length at each 100ms poll.  
  - All zeros then a single jump → No incremental UI updates (consistent with a single buffered chunk).  
  - Increasing values (e.g. 0, 5, 12, 20, …) → UI is updating as tokens arrive.

## Current behavior (as observed)

- **Backend:** Smoke tests confirm the API sends SSE token events and `event: done` correctly.
- **Browser:** The E2E test sees **one chunk** (e.g. 137 bytes) containing both the token line and the done event. So the stream is **not** reaching the browser as multiple incremental chunks.
- **UI:** With a single chunk, the frontend’s `reader.read()` loop runs until the whole buffer is there, then parses and updates state once or twice. Users see the full reply at once, not token-by-token.

So the issue is not that the frontend ignores the stream: it’s that **the response is being buffered before it reaches the client** (e.g. by Next.js, the runtime, or the network). The tests are intended to **analyze and verify** this behavior; they do not implement a fix.
