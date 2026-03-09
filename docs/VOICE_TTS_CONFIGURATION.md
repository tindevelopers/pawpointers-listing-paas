# Voice & TTS Configuration in the Portal AI Chat Widget

This document describes how voice input (STT) and spoken responses (TTS) are implemented in the portal AI chat widget, and which voice model is used for TTS.

## Summary

| Aspect | Current implementation |
|--------|------------------------|
| **TTS engine** | Browser-native **Web Speech API** (`window.speechSynthesis`) |
| **Voice profile** | **None set** — the browser/OS default voice is used |
| **Provider** | Client-side only; no third-party TTS service or custom AI voice |

---

## 1. Text-to-speech (TTS) engine and provider

Spoken AI responses are generated entirely in the browser using the **Web Speech API**:

- **API:** `window.speechSynthesis` and `SpeechSynthesisUtterance`
- **Location:**  
  - `apps/portal/components/chat/AIChat.tsx` (hero chat)  
  - `apps/portal/components/chat/ChatWidget.tsx` (floating widget)

There is **no** server-side TTS route (e.g. no `/api/voice/speak`), and **no** third-party TTS provider (e.g. OpenAI TTS, Telnyx TTS) in the current implementation.

Relevant code pattern:

```ts
if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
window.speechSynthesis.cancel();
const utterance = new SpeechSynthesisUtterance(text);
utterance.onend = () => setIsSpeaking(false);
utterance.onerror = () => setIsSpeaking(false);
window.speechSynthesis.speak(utterance);
```

---

## 2. Voice profile (voice ID / language / default)

**No voice profile is configured.** The code does **not** set:

- `utterance.voice` (no voice ID or `SpeechSynthesisVoice` chosen)
- `utterance.lang`
- `utterance.rate` or `utterance.pitch`

So the **default voice** is used: whatever the browser (or OS) selects as default. That is typically:

- The first voice in `speechSynthesis.getVoices()` that matches the browser’s default language, or  
- A system default (e.g. on macOS, often “Samantha” or the OS default voice).

The actual voice therefore depends on:

- **Browser** (Chrome, Safari, Firefox, etc.)
- **OS** and its installed TTS voices
- **User’s system language / browser language**

To lock a specific voice (e.g. a preferred language or voice ID), you would set `utterance.voice` from `window.speechSynthesis.getVoices()` and optionally `utterance.lang`, `utterance.rate`, and `utterance.pitch`.

---

## 3. Source of the voice (a/b/c)

**Answer: (a) Browser-native Web Speech API voice.**

- **(a) Browser-native Web Speech API voice** — **Yes.** TTS is done with `speechSynthesis.speak(utterance)` and no `utterance.voice` is set, so the browser’s default voice is used.
- **(b) Third-party TTS service** — **No.** No external TTS API is called.
- **(c) Custom AI voice configuration in the chat system** — **No.** The chat backend (e.g. Abacus/OpenAI/Gateway) only returns text; the portal does not use any custom AI voice pipeline for playback.

---

## 4. Flow (microphone → response → TTS)

1. User clicks the **microphone** → `handleMicClick()` uses **Web Speech API** `SpeechRecognition` / `webkitSpeechRecognition` for **STT** (client-side).
2. Transcript is sent to **`POST /api/chat`** (no voice; only text).
3. Backend returns **text** (`data.message`).
4. If the user had used the mic, `shouldSpeakRef.current` is true and the front end calls **`speakText(data.message)`**, which uses **`speechSynthesis.speak(utterance)`** with **no** `voice`/`lang`/`rate`/`pitch` set → **browser default voice**.

---

## 5. Optional: making the voice configurable

To make the TTS voice explicit and configurable you could:

1. **Use a specific browser voice**  
   Call `speechSynthesis.getVoices()`, pick a voice (e.g. by `name` or `lang`), and set `utterance.voice = chosenVoice`. Optionally set `utterance.lang`, `utterance.rate`, `utterance.pitch`.

2. **Use a server TTS provider**  
   Add e.g. `POST /api/voice/speak` that calls a third-party TTS API (OpenAI TTS, Telnyx, etc.) and returns audio; the client would play that audio instead of using `speechSynthesis`. The multi-agent / voice plan (e.g. `ai_agent_integrations.tts_provider` / `tts_settings`) in the codebase is the intended place for such configuration once implemented.

For the **current** portal build, the only thing that “configures” the voice is the **browser and OS default**; there is no app-level voice ID or TTS provider setting.

---

## 6. AI model and multi-agent configuration

**Model:** The chat model is chosen via environment variables, resolved in `packages/@listing-platform/ai/src/gateway.ts`:

- `AI_MODEL` (primary)
- `OPENAI_MODEL`
- `ABACUS_AI_MODEL` (when `AI_PROVIDER=abacus`)

The resolved string (e.g. `gpt-4o-mini`, or a gateway model name like `opus-4.6`) is passed to the AI client as-is. Any model name your provider (OpenAI, Abacus, or the AI gateway) supports will work; the app does not validate or restrict model names.

**Multi-agent:** There is no multi-agent or per-agent configuration in the codebase yet. The design in `.cursor/plans/multi-agent_chat_platform_adapter_f8269a43.plan.md` (e.g. `ai_agent_integrations`, separate STT/TTS per agent) is not implemented. Today there is a single chat path: one provider and one model per environment.
