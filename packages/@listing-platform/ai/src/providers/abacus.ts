import type { ChatCompletionRequest, ChatCompletionResult, ChatProvider } from './types';

const BASE_URL = process.env.ABACUS_API_BASE_URL?.replace(/\/$/, '') ?? 'https://api.abacus.ai';
const apiKeyHeader = process.env.ABACUS_API_KEY;
const CONVERSATION_BASE_URL =
  process.env.ABACUS_CONVERSATION_BASE_URL?.replace(/\/$/, '') ??
  (process.env.ABACUS_WORKSPACE
    ? `https://${process.env.ABACUS_WORKSPACE}.abacus.ai`
    : BASE_URL);

export function createAbacusProvider(): ChatProvider {
  let lastConversationId: string | null = null;

  const completeRequest = async ({
    messages,
    systemPrompt,
    temperature,
    maxTokens,
  }: ChatCompletionRequest) => {
    const deploymentToken = process.env.ABACUS_DEPLOYMENT_TOKEN;
    const deploymentId = process.env.ABACUS_DEPLOYMENT_ID;

    if (!deploymentToken || !deploymentId) {
      throw new Error(
        'Abacus configuration missing: set ABACUS_DEPLOYMENT_TOKEN and ABACUS_DEPLOYMENT_ID in your environment.'
      );
    }

    const url = new URL(`${BASE_URL}/api/v0/getChatResponse`);
    url.searchParams.set('deploymentToken', deploymentToken);
    url.searchParams.set('deploymentId', deploymentId);

    const body: Record<string, unknown> = {
      messages: messages.map((message) => ({
        is_user: message.role === 'user',
        text: message.content,
      })),
    };

    if (systemPrompt) {
      body.systemMessage = systemPrompt;
    }

    if (typeof temperature === 'number') {
      body.temperature = temperature;
    }

    if (typeof maxTokens === 'number') {
      body.numCompletionTokens = maxTokens;
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
  };

  return {
    complete: completeRequest,

    async *stream({
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      conversationId,
    }: ChatCompletionRequest): AsyncGenerator<string> {
      const deploymentToken = process.env.ABACUS_DEPLOYMENT_TOKEN;
      const deploymentId = process.env.ABACUS_DEPLOYMENT_ID;

      if (!deploymentToken || !deploymentId) {
        throw new Error(
          'Abacus configuration missing: set ABACUS_DEPLOYMENT_TOKEN and ABACUS_DEPLOYMENT_ID in your environment.'
        );
      }

      const lastUserMessage =
        [...messages].reverse().find((message) => message.role === 'user')
          ?.content ?? '';
      const systemMessage = messages.find((message) => message.role === 'system')
        ?.content;
      const promptMessage = systemMessage
        ? `${systemMessage}\n\n${lastUserMessage}`
        : lastUserMessage;

      try {
        let activeConversationId = conversationId;

        if (!activeConversationId) {
          const createResponse = await fetch(
            `${CONVERSATION_BASE_URL}/v1/deployments/${deploymentId}/conversations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${deploymentToken}`,
              },
              body: JSON.stringify({ message: promptMessage }),
            }
          );

          if (!createResponse.ok) {
            const payload = await createResponse.text();
            throw new Error(
              `Abacus conversation create failed (${createResponse.status}): ${payload}`
            );
          }

          const createData = (await createResponse.json()) as any;
          activeConversationId = createData?.conversationId;
        }

        if (!activeConversationId) {
          throw new Error('Abacus conversation ID missing from response.');
        }

        lastConversationId = activeConversationId;

        const streamUrl = new URL(
          `${CONVERSATION_BASE_URL}/v1/deployments/${deploymentId}/conversations/${activeConversationId}/stream`
        );
        streamUrl.searchParams.set('message', promptMessage);

        const response = await fetch(streamUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${deploymentToken}`,
            Accept: 'text/event-stream',
          },
        });

        if (!response.ok || !response.body) {
          const payload = await response.text();
          throw new Error(
            `Abacus streaming request failed (${response.status}): ${payload}`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let isDone = false;

        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex = buffer.indexOf('\n\n');
          while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex).trim();
            buffer = buffer.slice(boundaryIndex + 2);
            boundaryIndex = buffer.indexOf('\n\n');

            if (!rawEvent) continue;

            let dataPayload = '';
            const lines = rawEvent.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:')) {
                dataPayload += line.slice(5).trim();
              }
            }

            if (!dataPayload) continue;
            if (dataPayload === '[DONE]') {
              isDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(dataPayload);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (typeof content === 'string' && content.length > 0) {
                yield content;
              }
            } catch {
              // Ignore malformed SSE payloads
            }
          }
        }
      } catch (error) {
        console.warn('Abacus streaming failed, falling back to complete()', error);
        const completion = await completeRequest({
          messages,
          systemPrompt,
          temperature,
          maxTokens,
        });
        yield completion.text || '';
      }
    },

    getStreamingConversationId() {
      return lastConversationId;
    },
  };
}

