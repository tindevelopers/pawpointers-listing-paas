import type { ChatCompletionRequest, ChatCompletionResult, ChatProvider } from './types';

const BASE_URL = process.env.ABACUS_API_BASE_URL?.replace(/\/$/, '') ?? 'https://apps.abacus.ai';
const CHAT_PATH = process.env.ABACUS_CHAT_PATH ?? '/api/getChatResponse';
const apiKeyHeader = process.env.ABACUS_API_KEY;
const CONVERSATION_BASE_URL = process.env.ABACUS_CONVERSATION_BASE_URL?.replace(/\/$/, '');
const ABACUS_WORKSPACE = process.env.ABACUS_WORKSPACE;

function resolveConversationBaseUrl(): string | null {
  if (CONVERSATION_BASE_URL) return CONVERSATION_BASE_URL;
  if (ABACUS_WORKSPACE) return `https://${ABACUS_WORKSPACE}.abacus.ai`;

  if (process.env.ABACUS_API_BASE_URL) {
    try {
      const base = new URL(process.env.ABACUS_API_BASE_URL);
      if (!base.hostname.startsWith('apps.')) {
        return base.origin;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getLastUserMessage(messages: ChatCompletionRequest['messages']): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') {
      return messages[i].content;
    }
  }
  return '';
}

function getConversationHeaders(deploymentToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${deploymentToken}`,
  };

  if (apiKeyHeader) {
    headers.apiKey = apiKeyHeader;
  }

  return headers;
}

async function createConversation(
  deploymentId: string,
  deploymentToken: string,
  message: string
): Promise<{ conversationId?: string; initialText?: string }> {
  const baseUrl = resolveConversationBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'Abacus conversation streaming not configured: set ABACUS_CONVERSATION_BASE_URL or ABACUS_WORKSPACE.'
    );
  }

  const url = new URL(`${baseUrl}/v1/deployments/${deploymentId}/conversations`);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      ...getConversationHeaders(deploymentToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `Abacus conversation create failed (${response.status}): ${payload}`
    );
  }

  const data = (await response.json().catch(() => ({}))) as any;
  const conversationId = data?.conversationId ?? data?.conversation_id;

  let initialText: string | undefined;
  if (typeof data?.message === 'string') {
    initialText = data.message;
  } else if (typeof data?.response === 'string') {
    initialText = data.response;
  } else if (typeof data?.result?.response === 'string') {
    initialText = data.result.response;
  } else if (Array.isArray(data?.result?.messages)) {
    const assistantMessages = data.result.messages.filter((msg: any) => !msg.is_user);
    const lastAssistant = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
    if (lastAssistant?.text) {
      initialText = lastAssistant.text;
    }
  }

  return { conversationId, initialText };
}

async function* streamConversation(
  deploymentId: string,
  deploymentToken: string,
  conversationId: string,
  message: string
): AsyncGenerator<string> {
  const baseUrl = resolveConversationBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'Abacus conversation streaming not configured: set ABACUS_CONVERSATION_BASE_URL or ABACUS_WORKSPACE.'
    );
  }

  const url = new URL(
    `${baseUrl}/v1/deployments/${deploymentId}/conversations/${conversationId}/stream`
  );
  url.searchParams.set('message', message);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...getConversationHeaders(deploymentToken),
      Accept: 'text/event-stream',
    },
  });

  if (!response.ok || !response.body) {
    const payload = await response.text();
    throw new Error(
      `Abacus conversation stream failed (${response.status}): ${payload}`
    );
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      const dataLines: string[] = [];

      for (const line of lines) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (dataLines.length === 0) continue;
      const data = dataLines.join('\n');

      if (data === '[DONE]') {
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      const text = parsed?.choices?.[0]?.delta?.content;
      if (typeof text === 'string' && text.length > 0) {
        yield text;
      }
    }
  }
}

async function completeAbacus(
  request: ChatCompletionRequest
): Promise<ChatCompletionResult> {
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
    messages: request.messages.map((message) => ({
      is_user: message.role === 'user',
      text: message.content,
    })),
  };

  if (request.systemPrompt) {
    body.systemMessage = request.systemPrompt;
  }

  if (typeof request.temperature === 'number') {
    body.temperature = request.temperature;
  }

  if (typeof request.maxTokens === 'number') {
    body.numCompletionTokens = request.maxTokens;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKeyHeader) {
    headers.apiKey = apiKeyHeader;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `Abacus chat request failed (${response.status}): ${payload}`
    );
  }

  const data = (await response.json()) as any;

  if (!data.success) {
    throw new Error(data.error || 'Abacus AI reported an error');
  }

  const rawMessages = Array.isArray(data.result?.messages)
    ? data.result.messages
    : [];

  const assistantMessages = rawMessages.filter((msg: any) => !msg.is_user);
  const lastAssistantMessage =
    assistantMessages.length > 0
      ? assistantMessages[assistantMessages.length - 1]
      : null;

  const text = lastAssistantMessage?.text ?? '';

  const formattedMessages = rawMessages.map((msg: any) => ({
    role: msg.is_user ? 'user' : 'assistant',
    content: msg.text,
  }));

  return {
    text,
    messages: formattedMessages,
  } as ChatCompletionResult;
}

export function createAbacusProvider(): ChatProvider {
  return {
    async complete(request: ChatCompletionRequest) {
      return completeAbacus(request);
    },

    async *stream(request: ChatCompletionRequest) {
      const deploymentToken = process.env.ABACUS_DEPLOYMENT_TOKEN;
      const deploymentId = process.env.ABACUS_DEPLOYMENT_ID;

      if (!deploymentToken || !deploymentId) {
        throw new Error(
          'Abacus configuration missing: set ABACUS_DEPLOYMENT_TOKEN and ABACUS_DEPLOYMENT_ID in your environment.'
        );
      }

      const message = getLastUserMessage(request.messages);

      try {
        let conversationId = request.conversationId;

        if (!conversationId) {
          const created = await createConversation(
            deploymentId,
            deploymentToken,
            message
          );
          conversationId = created.conversationId;
          if (conversationId) {
            request.conversationId = conversationId;
          }

          if (created.initialText) {
            yield created.initialText;
            return;
          }
        }

        if (!conversationId) {
          throw new Error('Abacus conversation creation did not return an ID.');
        }

        for await (const chunk of streamConversation(
          deploymentId,
          deploymentToken,
          conversationId,
          message
        )) {
          yield chunk;
        }
      } catch (error) {
        console.warn('Abacus streaming failed, falling back to complete()', error);
        const completion = await completeAbacus(request);
        if (completion.text) {
          yield completion.text;
        }
      }
    },
  };
}
