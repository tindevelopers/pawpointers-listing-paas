import type { ChatCompletionRequest, ChatCompletionResult, ChatProvider } from './types';

export function createGhlProvider(): ChatProvider {
  return {
    async complete(): Promise<ChatCompletionResult> {
      throw new Error('GHL chat provider is not implemented yet.');
    },
  };
}

