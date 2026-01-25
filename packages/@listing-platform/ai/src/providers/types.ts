export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  text: string;
  messages?: ChatMessage[];
}

export interface ChatProvider {
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
  stream?(request: ChatCompletionRequest): AsyncGenerator<string>;
}

export type ChatProviderId = 'abacus' | 'gateway' | 'openai' | 'ghl';

