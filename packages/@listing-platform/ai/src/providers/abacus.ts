import type { ChatCompletionRequest, ChatCompletionResult, ChatProvider } from './types';

// #region agent log
const _dbg = (marker: string, kv: Record<string, unknown>) => {
  console.log(`[API_CHAT] ABACUS_${marker} ${Object.entries(kv).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')}`);
  fetch('http://127.0.0.1:7313/ingest/c4576c6e-5723-4e78-b6cf-665e307df2d0', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '81c538' },
    body: JSON.stringify({ sessionId: '81c538', location: 'abacus.ts', message: `ABACUS_${marker}`, data: kv, timestamp: Date.now() }),
  }).catch(() => {});
};
// #endregion

const BASE_URL = process.env.ABACUS_API_BASE_URL?.replace(/\/$/, '') ?? 'https://apps.abacus.ai';
const CHAT_PATH = process.env.ABACUS_CHAT_PATH ?? '/api/getChatResponse';
const apiKeyHeader = process.env.ABACUS_API_KEY;

export function createAbacusProvider(): ChatProvider {
  return {
    async complete({
      messages,
      systemPrompt,
      temperature,
      maxTokens,
    }: ChatCompletionRequest) {
      // #region agent log
      _dbg('COMPLETE_ENTER', { hasToken: !!process.env.ABACUS_DEPLOYMENT_TOKEN, hasId: !!process.env.ABACUS_DEPLOYMENT_ID, messageCount: messages?.length });
      // #endregion
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

      // #region agent log
      _dbg('FETCH_START', { urlHost: url.hostname, urlPath: url.pathname, messageCount: messages?.length });
      // #endregion
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      // #region agent log
      _dbg('FETCH_DONE', { status: response.status, ok: response.ok });
      // #endregion

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

