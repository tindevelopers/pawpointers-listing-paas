---
name: Telnyx Voice Layer + Abacus Brain
overview: Add a Telnyx-powered voice assistant layer (STT/TTS) on top of the existing portal chat while keeping Abacus as the sole reasoning/response backend. Voice will be additive (typed chat unchanged) and implemented with a stateful frontend controller plus new backend voice routes.
todos: []
isProject: false
---

# Telnyx Voice Layer + Abacus Brain

## Phase 1 — Repo audit (what exists today)

- **Abacus is already integrated** via `@listing-platform/ai` provider factory.
  - Provider selection happens in `[/Users/developer/Projects/pawpointers-listing-paas/packages/@listing-platform/ai/src/providers/factory.ts](/Users/developer/Projects/pawpointers-listing-paas/packages/@listing-platform/ai/src/providers/factory.ts)`. `AI_CHAT_PROVIDER=abacus` routes to Abacus; otherwise gateway/openai flows.
  - Abacus HTTP + conversation streaming logic lives in `[/Users/developer/Projects/pawpointers-listing-paas/packages/@listing-platform/ai/src/providers/abacus.ts](/Users/developer/Projects/pawpointers-listing-paas/packages/@listing-platform/ai/src/providers/abacus.ts)`.
- `**/api/chat` is implemented and is the backend “brain entrypoint”.**
  - `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/chat/route.ts](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/chat/route.ts)` authenticates the user, then calls `chat()` or `streamChat()` from `@listing-platform/ai`.
  - This is what we will reuse for voice as well (Telnyx will never be the LLM).
- **Chat UI lives in two portal components and already has mic + browser STT/TTS.**
  - `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/AIChat.tsx](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/AIChat.tsx)`
  - `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/ChatWidget.tsx](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/ChatWidget.tsx)`
  - Both currently use:
    - **Browser STT**: `SpeechRecognition` / `webkitSpeechRecognition`
    - **Browser TTS**: `window.speechSynthesis` + `SpeechSynthesisUtterance`
- **Telnyx integration code does not exist yet.**
  - Only admin UI placeholders/plans mention Telnyx; no runtime Telnyx API client/routes are present.

### What we can reuse

- **Reuse** `POST /api/chat` (and `@listing-platform/ai` `chat()/streamChat()`) as the *single* Abacus-backed response generator.
- **Reuse** existing chat UI layout, message history, and the `shouldSpeakRef` flow as the trigger to speak after assistant response.
- **Refactor** voice-specific logic into shared modules/hooks so we don’t duplicate between `AIChat` and `ChatWidget`.

### What we must add

- New **voice API routes** in `apps/portal/app/api/voice/`*.
- A **Telnyx voice service module** (server-side) that encapsulates Telnyx STT/TTS.
- A **frontend voice assistant controller** that implements the voice state machine and barge-in.

---

## Phase 2 — Architecture choice (best-fit for a web portal assistant)

Because Next.js route handlers don’t reliably host custom WebSocket servers in typical serverless deployments, the most production-sensible “web portal” implementation is:

- **Mic capture in browser** (MediaRecorder) → send audio to backend over HTTP
- Backend uses **Telnyx for STT and TTS** (voice layer)
- Backend uses **Abacus via existing `/api/chat` logic** (brain)
- Frontend plays returned audio and manages turn-taking + interruption

This keeps:

- **Telnyx = voice layer** (STT/TTS + voice configuration)
- **Abacus = reasoning and text response**
- **Backend = orchestration and state continuity**

If you later want full duplex “phone/VoIP transport” via Telnyx Call Control/WebRTC, we’ll already have the orchestration module boundaries to swap the transport in without changing Abacus.

---

## Phase 3 — Implement Telnyx ↔ Abacus bridge (backend)

### 3.1 Telnyx voice service module

Create server-only module(s), e.g.

- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/lib/voice/telnyx.ts](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/lib/voice/telnyx.ts)`

Responsibilities:

- `telnyxTranscribe({ audioBytes, contentType, language? }) -> { text }`
  - Use Telnyx’s OpenAPI-described transcription endpoint `POST /ai/audio/transcriptions` (multipart/form-data) (Telnyx OpenAPI indicates OpenAI-compatible semantics).
- `telnyxSpeak({ text, voice, format }) -> { audioBytes, contentType }`
  - Use Telnyx `POST /text-to-speech/speech` returning binary audio (OpenAPI indicates default output is binary audio).

### 3.2 New API routes (portal)

Add:

- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/voice/transcribe/route.ts](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/voice/transcribe/route.ts)`
  - **Auth first** (same Supabase pattern as `/api/chat`).
  - Accept `multipart/form-data` with `audio` file/blob.
  - Return JSON: `{ success: true, transcript: string }`.
- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/voice/speak/route.ts](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/voice/speak/route.ts)`
  - **Auth first**.
  - Accept JSON `{ text: string }`.
  - Call Telnyx TTS with configured voice.
  - Return **binary audio** (`Content-Type: audio/mpeg` by default) so the browser can play it.
- (Optional but recommended) `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/voice/health/route.ts](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/app/api/voice/health/route.ts)`
  - Returns which env vars are present (masked booleans), similar to `/api/chat` GET.

### 3.3 Orchestration boundary

Do **not** move Abacus logic into Telnyx. Voice routes will:

- Use Telnyx only for STT/TTS.
- Forward transcript to existing `POST /api/chat` or directly call `@listing-platform/ai` `chat()/streamChat()`.

For maintainability, add a small orchestration helper, e.g.

- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/lib/voice/orchestrateTurn.ts](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/lib/voice/orchestrateTurn.ts)`

---

## Phase 4 — Frontend “talking assistant” UX + barge-in

### 4.1 Shared voice controller hook

Create a reusable controller, e.g.

- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/useVoiceAssistant.ts](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/useVoiceAssistant.ts)`

It will manage:

- **States**: `idle | listening | transcribing | thinking | speaking`
- **MediaRecorder** capture and stop
- **Abort/cancellation** for:
  - in-flight transcription
  - in-flight chat request
  - in-flight TTS fetch
  - currently playing HTMLAudioElement

Barge-in behavior:

- If user starts listening while `speaking`:
  - stop audio playback immediately
  - abort pending TTS fetch
  - switch to `listening`

### 4.2 Integrate into both chat UIs

Update:

- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/AIChat.tsx](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/AIChat.tsx)`
- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/ChatWidget.tsx](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/components/chat/ChatWidget.tsx)`

Changes:

- Replace current `SpeechRecognition` (browser STT) with `MediaRecorder` → `/api/voice/transcribe`.
- Replace `speechSynthesis` (browser TTS) with `/api/voice/speak` playback.
- Keep typed chat path unchanged.
- Keep `shouldSpeakRef` semantics: only speak after mic-driven turns (unless you want “always speak” as a future option).

---

## Phase 5 — Preserve Abacus as source of truth

- Keep `/api/chat` as-is and reuse it.
- Ensure `sessionId` / `conversationId` continuity:
  - Voice turns will pass along existing `sessionId`/`conversationId` already tracked by `ChatWidget` and supported by `/api/chat`.

---

## Phase 6 — Configuration

Add env vars (server-side only):

- `TELNYX_API_KEY` (**required**)
- `TELNYX_TTS_VOICE` (optional default; e.g. `telnyx.NaturalHD.`* voice shorthand)
- `TELNYX_TTS_AUDIO_FORMAT` (optional, default `mp3`)
- `TELNYX_STT_LANGUAGE` (optional)

Document them in:

- `[/Users/developer/Projects/pawpointers-listing-paas/.env.example](/Users/developer/Projects/pawpointers-listing-paas/.env.example)`
- `[/Users/developer/Projects/pawpointers-listing-paas/apps/portal/.env.example](/Users/developer/Projects/pawpointers-listing-paas/apps/portal/.env.example)`

---

## Phase 7 — Testing / validation

### Automated (lightweight)

- Add unit tests for the orchestration/service module(s) using mocked fetch:
  - Telnyx STT request formation
  - Telnyx TTS request formation
  - Error mapping to stable `{ code, message }`

### Manual smoke checklist (must pass)

- One complete voice turn:
  - listen → transcribe → thinking → speaking → idle
- One interrupted assistant turn:
  - while speaking, start listening → audio stops immediately → new transcript processed
- Typed message after voice interaction:
  - typed chat still streams/renders correctly
- Continuity:
  - follow-up voice or typed message continues with same `sessionId` / `conversationId`
- Failure cases:
  - missing `TELNYX_API_KEY` → voice feature fails gracefully; typed chat still works
  - Telnyx errors → show assistant text; skip audio; state resets cleanly

---

## Phase 8 — Deliverables

- **Exact files changed/created** (listed in plan sections above)
- **Architecture summary** (Telnyx voice services + orchestration + Abacus chat)
- **How Telnyx and Abacus interact** (Telnyx STT/TTS only; Abacus produces text)
- **Env vars** (required/optional)
- **Local testing instructions**
- **Known limitations**
  - This initial web-portal implementation is request/response “turn-based”; truly continuous duplex streaming can be added later (Telnyx WebSocket STT/TTS or Telnyx Call Control/WebRTC), without changing Abacus.

