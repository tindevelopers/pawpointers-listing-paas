import type { ChatCompletionRequest, ChatCompletionResult, ChatProvider } from './types';

const DEFAULT_BASE_URL = 'https://routellm.abacus.ai/v1';
const DEFAULT_MODEL = 'route-llm';

type RouteLLMResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<Record<string, unknown>>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function resolveMessages(
  messages: ChatCompletionRequest['messages'],
  systemPrompt?: string
) {
  const hasSystem = messages.some((message) => message.role === 'system');
  if (!systemPrompt || hasSystem) {
    return messages;
  }

  return [{ role: 'system', content: systemPrompt }, ...messages];
}

function getContentText(
  content: RouteLLMResponse['choices'][number]['message']['content']
): string {
  if (typeof content === 'string') return content;
  if (!content) return '';
  return JSON.stringify(content);
}

export function createRouteLLMProvider(): ChatProvider {
  return {
    async complete({
      messages,
      systemPrompt,
      temperature,
      maxTokens,
    }: ChatCompletionRequest): Promise<ChatCompletionResult> {
      const apiKey = process.env.ABACUS_AI_API_KEY;
      if (!apiKey) {
        throw new Error('Abacus RouteLLM configuration missing: set ABACUS_AI_API_KEY.');
      }

      const baseUrl = (process.env.ABACUS_AI_BASE_URL || DEFAULT_BASE_URL).replace(
        /\/$/,
        ''
      );
      const model = process.env.ABACUS_AI_MODEL || DEFAULT_MODEL;
      const finalMessages = resolveMessages(messages, systemPrompt);

      const body: Record<string, unknown> = {
        model,
        messages: finalMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };

      if (typeof temperature === 'number') {
        body.temperature = temperature;
      }

      if (typeof maxTokens === 'number') {
        body.max_tokens = maxTokens;
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(
          `RouteLLM chat request failed (${response.status}): ${payload}`
        );
      }

      const data = (await response.json()) as RouteLLMResponse;
      if (data.error?.message) {
        throw new Error(data.error.message);
      }

      const content = getContentText(data.choices?.[0]?.message?.content);

      return {
        text: content,
      };
    },
  };
}
