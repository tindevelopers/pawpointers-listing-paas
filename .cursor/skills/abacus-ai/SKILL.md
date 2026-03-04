---
name: abacus-ai
description: Query and integrate with Abacus.AI APIs including RouteLLM (chat completions, tool calling, image generation), platform concepts (datasets, feature groups, document retrievers, projects, deployments), and knowledge bases. Use when working with Abacus.AI, RouteLLM, Abacus API, ChatLLM, or when the user asks to call Abacus.AI or query Abacus knowledge bases.
---

# Abacus.AI API & Platform Skill

Use this skill when integrating or querying Abacus.AI: RouteLLM APIs, platform data structures (projects, datasets, document retrievers), and knowledge bases.

## Official status

Abacus.AI does **not** publish official Cursor/Codex skills. This skill is a project-level reference for the API and platform so you can efficiently communicate and query the API and any required knowledge bases.

## Authentication & base URLs

- **Auth**: `Authorization: Bearer <api_key>`. Get the key from [RouteLLM API](https://abacus.ai/app/route-llm-apis).
- **Base URL**:
  - Self-serve: `https://routellm.abacus.ai/v1`
  - Enterprise: `https://<workspace>.abacus.ai/v1`

Use the same base URL for chat completions (e.g. `POST /chat/completions`).

## RouteLLM (primary API)

OpenAI-compatible chat completions. Use `route-llm` as the model to let Abacus route by cost/speed/performance, or specify a model ID.

### Request shape (chat completions)

- **Required**: `messages` — array of `{ role, content }`. `role`: `system` | `user` | `assistant`. `content`: string or array (multimodal).
- **Optional**: `model` (default `route-llm`), `max_tokens`, `temperature`, `stream`, `tools`, `tool_choice`, `response_format`, `modalities` (e.g. `["image"]` for image gen), `image_config`.

### Response shape

- `choices[].message`: `role`, `content`, optional `tool_calls`.
- `usage`: `prompt_tokens`, `completion_tokens`, `total_tokens`.
- For image generation, `content` can include `type: "image_url"` with `image_url.url`.

### Tool calling

- Send `tools` (OpenAI-style function definitions with `name`, `description`, `parameters`).
- When the model calls a tool, `finish_reason` is `tool_calls` and `message.tool_calls` has `id`, `function.name`, `function.arguments` (JSON string).
- Continue by appending the assistant message and a `role: "tool"` message per call with `tool_call_id` and `content` (result). Resend the same `tools` in follow-up requests.

### Key capabilities

- **Streaming**: `stream: true` for SSE.
- **Structured output**: `response_format: { type: "json_object" }` or `type: "json_schema"` with `json_schema` for strict schema.
- **PDF input**: In a message `content` item use `type: "file"`, `file: { filename, file_data }` where `file_data` is HTTPS URL or base64.
- **Images**: Input via `type: "image_url"` and `image_url.url` (URL or data URI). Image generation: `modalities: ["image"]`, `image_config` (e.g. `num_images`, `aspect_ratio`).

### Models (examples)

- Routing: `route-llm`.
- Text: `gpt-5.1`, `claude-4-5-sonnet`, `gemini-2.5-pro`, and others — use `listRouteLLMModels` for the current list.
- Image: `flux-2-pro`, `seedream`, `dall-e`, `ideogram`, etc.

## Platform concepts (data structures & knowledge)

- **Projects**: Top-level container; list via REST (e.g. list projects API). GenAI vs Structured ML types.
- **Datasets**: Raw data from connectors or uploads; created via platform wizard or API.
- **Feature Groups**: Transformed datasets (SQL/Python); can combine multiple datasets.
- **Document Retrievers**: Vector store for GenAI; use for RAG and knowledge-base-style querying in custom chatbots.
- **Models**: Trained models inside a project (multiple configs per project).
- **Deployments**: Production model endpoints (API access).

For **knowledge bases**: use Document Retrievers in GenAI/Custom Chatbot projects. Ingest documents via datasets/connectors; query via the project’s chat/completion API or the deployment endpoint with the retriever configured.

## Querying the API and knowledge bases

1. **List models/pricing**: Call `listRouteLLMModels` (see [reference](reference.md)) for up-to-date models and pricing.
2. **Projects/datasets**: Use the REST API for projects and datasets (see [Abacus API Reference](https://abacus.ai/help/api/ref)).
3. **Knowledge-base behavior**: Ensure the project uses a Document Retriever and the deployment/chat is configured to use it; then send user messages as usual — the retriever runs server-side and augments context.
4. **Errors**: 400 (invalid request), 401 (bad/missing API key), 429 (rate limit), 500 (server). Response body has `error.message`, `error.type`, `error.code`.

### Efficient API usage

- **Structured responses**: Use `response_format: { type: "json_schema", json_schema: { name, schema } }` with `strict: true` when parsing responses in code.
- **Tool calling**: Define tools once; include the same `tools` array in every follow-up request when continuing a tool-calling conversation.
- **Streaming**: Use `stream: true` for long answers; parse SSE and aggregate `delta.content` (and tool-call `arguments` by index).
- **Knowledge-base queries**: No special request shape — use normal chat `messages`; the project’s Document Retriever is applied by the deployment. Include enough context in the user message for the retriever to match.

## Where to look next

- Full RouteLLM parameters, image config table, and code samples: [reference.md](reference.md).
- Official docs: [Abacus.AI API](https://abacus.ai/help/api/), [RouteLLM API](https://abacus.ai/help/developer-platform/route-llm/api), [Developer Platform](https://abacus.ai/help/developer-platform/introduction).
