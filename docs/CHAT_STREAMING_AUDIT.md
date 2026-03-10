# Chat Streaming Implementation – Audit & Cleanup

## Intended architecture (single flow)

```
Frontend (AIChat / ChatWidget)
  → POST /api/chat with stream: true, conversationId?
  → Portal API route (apps/portal/app/api/chat/route.ts)
  → streamChat(message, streamOpts) from @listing-platform/ai
  → getChatProvider().stream(request)  [Abacus: streamAppChatResponse]
  → SSE: data: {"text":"..."} + event: done
  → Frontend consumes stream, updates UI incrementally
```

---

## 1. Abacus provider (`packages/@listing-platform/ai/src/providers/abacus.ts`)

| Code | Status | Notes |
|------|--------|--------|
| `streamAppChatResponse` | **Active** | Only streaming path used; called from `stream()`. |
| `stream()` | **Active** | Tries `streamAppChatResponse`, on failure falls back to `completeAbacus` + chunked yield. |
| `completeAbacus` | **Active** | Non-streaming and fallback for streaming. |
| `complete()` | **Active** | Non-streaming API. |
| `createConversation` | **Stale – REMOVED** | Legacy conversation API; never called (stream() no longer uses it). |
| `streamConversation` | **Stale – REMOVED** | Legacy conversation stream; never called. |
| `resolveConversationBaseUrl` | **Stale – REMOVED** | Only used by removed conversation helpers. |
| `getConversationHeaders` | **Stale – REMOVED** | Only used by removed conversation helpers. |
| `CONVERSATION_BASE_URL`, `ABACUS_WORKSPACE` | **Stale – REMOVED** | Only used by removed code. |

**Cleanup applied:** Removed conversation API path (createConversation, streamConversation, resolveConversationBaseUrl, getConversationHeaders, and related constants). Single streaming path: `streamAppChatResponse` with fallback to `completeAbacus` + chunked yield.

---

## 2. Chatbot (`packages/@listing-platform/ai/src/chatbot.ts`)

| Code | Status | Notes |
|------|--------|--------|
| `streamChat` | **Active** | Single entry for streaming; yields context → token → done. |
| `chatProvider.stream(request)` | **Active** | Used when provider has stream (Abacus, AI-SDK). |
| `chatProvider.complete(request)` | **Active** | Used when provider has no stream. |
| `conversationId` in options/request | **Active** | Passed through to provider and in done payload; frontend stores it. Abacus does not use it for apps.abacus.ai API; kept for contract and future use. |
| `yield { type: 'context', data }` | **Active** | RAG context; not forwarded by route (server-side only). No change. |

No dead code; no cleanup required.

---

## 3. Portal API route (`apps/portal/app/api/chat/route.ts`)

| Code | Status | Notes |
|------|--------|--------|
| `stream` branch (streamChat, ReadableStream) | **Active** | Only streaming path. |
| `event.type === 'token' \| 'done' \| 'error'` | **Active** | Matches streamChat output; context events intentionally not sent to client. |
| Non-streaming branch (`chat()`) | **Active** | Used when stream is false. |
| `conversationId` in body/streamOpts | **Active** | Passed through; part of public contract. |

No dead code; no cleanup required.

---

## 4. Frontend consumers

| File | Status | Notes |
|------|--------|--------|
| `AIChat.tsx` | **Active** | Single path: fetch with stream: true, parse SSE, update messages. |
| `ChatWidget.tsx` | **Active** | Same pattern; no duplicate or stale logic. |

No cleanup required.

---

## 5. Other references

| Item | Status |
|------|--------|
| `conversationId` in types (providers/types.ts) | **Keep** – part of request/response contract. |
| `conversationId` in messaging package | **Unrelated** – inbox conversations, not chat streaming. |
| Admin/dashboard streaming (apps/admin) | **Separate** – admin chat; not part of portal streaming flow. |
| E2E (e2e/chat-streaming.spec.ts), smoke (scripts/smoke-test-chat-streaming.mjs) | **Keep** – validation only. |

---

## Summary

- **Removed:** Conversation API path in Abacus provider (createConversation, streamConversation, resolveConversationBaseUrl, getConversationHeaders, CONVERSATION_BASE_URL, ABACUS_WORKSPACE). This path was unused and could cause confusion or 404s if env vars were set.
- **Preserved:** Single streaming flow: provider `stream()` → `streamAppChatResponse` (with fallback) → `streamChat` → route → frontend. conversationId remains in types and API for compatibility and future use.
