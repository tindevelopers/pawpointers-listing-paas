import type { ChatCompletionRequest, ChatCompletionResult, ChatProvider } from './types';

const BASE_URL = process.env.ABACUS_API_BASE_URL?.replace(/\/$/, '') ?? 'https://api.abacus.ai';
const apiKeyHeader = process.env.ABACUS_API_KEY;

export function createAbacusProvider(): ChatProvider {
  return {
    async complete({
      messages,
      systemPrompt,
      temperature,
      maxTokens,
    }: ChatCompletionRequest) {
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
    },
  };
}

