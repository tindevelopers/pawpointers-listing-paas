import { generateText, streamText } from 'ai';
import type { ChatCompletionRequest, ChatProvider, ChatCompletionResult } from './types';
import { getAIClient } from '../gateway';

export function createAiSdkProvider(): ChatProvider {
  return {
    async complete({ messages, systemPrompt, temperature, maxTokens }: ChatCompletionRequest) {
      const { chatModel, resolvedConfig } = getAIClient();

      const completion = await generateText({
        model: chatModel as any,
        system: systemPrompt,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: temperature ?? resolvedConfig.temperature,
        maxOutputTokens: maxTokens ?? resolvedConfig.maxTokens,
      });

      return {
        text: completion.text || '',
      } satisfies ChatCompletionResult;
    },

    async *stream({ messages, systemPrompt, temperature, maxTokens }: ChatCompletionRequest) {
      const { chatModel, resolvedConfig } = getAIClient();

      const streamResult = await streamText({
        model: chatModel as any,
        system: systemPrompt,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: temperature ?? resolvedConfig.temperature,
        maxOutputTokens: maxTokens ?? resolvedConfig.maxTokens,
      });

      for await (const chunk of streamResult.textStream) {
        yield chunk;
      }
    },
  };
}

