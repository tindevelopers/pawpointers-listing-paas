# Abacus.AI API Reference (detail)

## RouteLLM base URL and auth

- Self-serve: `https://routellm.abacus.ai/v1`
- Enterprise: `https://<workspace>.abacus.ai/v1`
- Header: `Authorization: Bearer <api_key>`

## Chat completions

**Endpoint**: `POST /chat/completions` (relative to base URL above).

### Request body (summary)

| Parameter | Type | Required | Notes |
|-----------|------|----------|--------|
| messages | array | Yes | `{ role, content }`; content string or array (multimodal) |
| model | string | No | Default `route-llm` |
| max_tokens | integer | No | Model-dependent default |
| temperature | number | No | 0–2, default 1 |
| top_p | number | No | 0–1, default 1 |
| stream | boolean | No | Default false |
| stop | string/array | No | Up to 4 stop sequences |
| tools | array | No | OpenAI-style tools |
| tool_choice | string/object | No | `"auto"` \| `"none"` \| `{ type: "function", function: { name } }` |
| response_format | object | No | `{ type: "json_object" }` or `{ type: "json_schema", json_schema }` |
| modalities | array | No | `["text"]` (default) or `["image"]` for image gen |
| image_config | object | No | For image gen: e.g. `num_images`, `aspect_ratio` |

### Response (non-streaming)

- `choices[].message`: `role`, `content`, optional `tool_calls` (array of `{ id, type: "function", function: { name, arguments } }`).
- `choices[].finish_reason`: `stop` \| `length` \| `content_filter` \| `tool_calls`.
- `usage`: `prompt_tokens`, `completion_tokens`, `total_tokens`.

### Tool-call follow-up

Append to `messages`: (1) the assistant message that contains `tool_calls`, (2) for each call, a message `{ role: "tool", tool_call_id, content }`. Resend the same `tools` (and optional `tool_choice`).

## Image generation

- Set `modalities: ["image"]` and optional `image_config`.
- **image_config** (common): `num_images` (1–4), `aspect_ratio` (e.g. `1:1`, `2:3`, `9:16`). Model-specific: `quality`, `resolution`, `image_size` (OpenAI/Gemini).
- Response: `message.content` can include items with `type: "image_url"` and `image_url.url`.

## PDF and multimodal input

- **PDF**: In `content` array, use `{ type: "file", file: { filename, file_data } }`. `file_data`: HTTPS URL or base64.
- **Image**: `{ type: "image_url", image_url: { url } }` (URL or data URI). Formats: PNG, JPEG, WebP, GIF.

## Platform APIs (REST)

- **List RouteLLM models (and pricing)**: Use the `listRouteLLMModels` endpoint (see [API Reference](https://abacus.ai/help/api/ref)) to get current models and pricing.
- **Projects**: e.g. list projects — see [API Reference](https://abacus.ai/help/api/ref) and [listProjects](https://abacus.ai/help/api/ref/project/listProjects).
- **Datasets / Document retrievers**: Created and managed via platform or REST; document retrievers are the knowledge-base backend for GenAI projects.

## Error response

```json
{
  "error": {
    "message": "Human-readable message",
    "type": "ValidationError",
    "code": "invalid_request_error"
  }
}
```

HTTP: 400 (bad request), 401 (unauthorized), 429 (rate limit), 500 (server error).

## Links

- [RouteLLM API](https://abacus.ai/help/developer-platform/route-llm/api)
- [API Reference](https://abacus.ai/help/api/ref)
- [Developer Platform intro](https://abacus.ai/help/developer-platform/introduction)
