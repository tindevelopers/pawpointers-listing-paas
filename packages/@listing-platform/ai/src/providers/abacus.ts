import type { ChatCompletionRequest, ChatCompletionResult, ChatProvider } from './types';

const BASE_URL = process.env.ABACUS_API_BASE_URL?.replace(/\/$/, '') ?? 'https://apps.abacus.ai';
const CHAT_PATH = process.env.ABACUS_CHAT_PATH ?? '/api/getChatResponse';
const STREAMING_CHAT_PATH = process.env.ABACUS_STREAMING_CHAT_PATH ?? '/api/getStreamingChatResponse';
const apiKeyHeader = process.env.ABACUS_API_KEY;

function getLastUserMessage(messages: ChatCompletionRequest['messages']): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

/**
 * Stream chat using apps.abacus.ai getStreamingChatResponse API.
 * POST with deploymentToken/deploymentId in query; response is NDJSON (incremental JSON chunks).
 * Chunks: heartbeat {"ping": true} (ignored) and text {"success": true, "response_type": "text", "text": "<chunk>"}.
 */
async function* streamAppChatResponse(request: ChatCompletionRequest): AsyncGenerator<string> {
  const deploymentToken = process.env.ABACUS_DEPLOYMENT_TOKEN;
  const deploymentId = process.env.ABACUS_DEPLOYMENT_ID;
  if (!deploymentToken || !deploymentId) {
    throw new Error(
      'Abacus configuration missing: set ABACUS_DEPLOYMENT_TOKEN and ABACUS_DEPLOYMENT_ID in your environment.'
    );
  }
  const path = STREAMING_CHAT_PATH.startsWith('/') ? STREAMING_CHAT_PATH : `/${STREAMING_CHAT_PATH}`;
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('deploymentToken', deploymentToken);
  url.searchParams.set('deploymentId', deploymentId);

  const body: Record<string, unknown> = {
    messages: request.messages.map((m) => ({ is_user: m.role === 'user', text: m.content })),
    temperature: 0.0,
    ignoreDocuments: false,
    includeSearchResults: false,
  };
  if (request.systemPrompt) body.systemMessage = request.systemPrompt;
  if (typeof request.temperature === 'number') body.temperature = request.temperature;
  if (typeof request.maxTokens === 'number') body.numCompletionTokens = request.maxTokens;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKeyHeader) headers.apiKey = apiKeyHeader;

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text();
    throw new Error(`Abacus streaming chat failed (${res.status}): ${text}`);
  }

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = '';

  const yieldTextFromParsed = (parsed: Record<string, unknown> | null): string | null => {
    if (!parsed || parsed.ping === true) return null;
    const text =
      (parsed.response_type === 'text' && typeof parsed.text === 'string' ? parsed.text : null) ??
      (parsed as any)?.choices?.[0]?.delta?.content ??
      (typeof (parsed as any)?.text === 'string' ? (parsed as any).text : null) ??
      (parsed as any)?.result?.output ??
      (parsed as any)?.output;
    return typeof text === 'string' && text.length > 0 ? text : null;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        const text = yieldTextFromParsed(parsed);
        if (text) yield text;
      } catch {
        // skip malformed or non-JSON lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer) as Record<string, unknown>;
      const text = yieldTextFromParsed(parsed);
      if (text) yield text;
    } catch {
      // ignore
    }
  }
}

async function completeAbacus(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const deploymentToken = process.env.ABACUS_DEPLOYMENT_TOKEN;
  const deploymentId = process.env.ABACUS_DEPLOYMENT_ID;
  if (!deploymentToken || !deploymentId) {
    throw new Error(
      'Abacus configuration missing: set ABACUS_DEPLOYMENT_TOKEN and ABACUS_DEPLOYMENT_ID in your environment.'
    );
  }
  const path = CHAT_PATH.startsWith('/') ? CHAT_PATH : `/${CHAT_PATH}`;
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('deploymentToken', deploymentToken);
  url.searchParams.set('deploymentId', deploymentId);
  const body: Record<string, unknown> = {
    messages: request.messages.map((m) => ({ is_user: m.role === 'user', text: m.content })),
  };
  if (request.systemPrompt) body.systemMessage = request.systemPrompt;
  if (typeof request.temperature === 'number') body.temperature = request.temperature;
  if (typeof request.maxTokens === 'number') body.numCompletionTokens = request.maxTokens;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKeyHeader) headers.apiKey = apiKeyHeader;
  const response = await fetch(url.toString(), { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Abacus chat request failed (${response.status}): ${payload}`);
  }
  const data = (await response.json()) as any;
  if (!data.success) throw new Error(data.error || 'Abacus AI reported an error');
  const rawMessages = Array.isArray(data.result?.messages) ? data.result.messages : [];
  const assistantMessages = rawMessages.filter((msg: any) => !msg.is_user);
  const lastAssistant = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
  const text = lastAssistant?.text ?? '';
  const formattedMessages = rawMessages.map((msg: any) => ({
    role: msg.is_user ? 'user' : 'assistant',
    content: msg.text,
  }));
  return { text, messages: formattedMessages } as ChatCompletionResult;
}

export function createAbacusProvider(): ChatProvider {
  return {
    async complete(request: ChatCompletionRequest) {
      return completeAbacus(request);
    },

    async *stream(request: ChatCompletionRequest) {
      try {
        for await (const chunk of streamAppChatResponse(request)) {
          yield chunk;
        }
      } catch (error) {
        console.warn('Abacus getStreamingChatResponse failed, falling back to complete()', error);
        const completion = await completeAbacus(request);
        if (completion.text) {
          const chunkSize = 20;
          for (let i = 0; i < completion.text.length; i += chunkSize) {
            yield completion.text.slice(i, i + chunkSize);
          }
        }
      }
    },
  };
}
