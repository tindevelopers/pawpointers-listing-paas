import type { ChatProvider, ChatProviderId } from './types';
import { createAbacusProvider } from './abacus';
import { createAiSdkProvider } from './ai-sdk';
import { createGhlProvider } from './ghl';
import { createRouteLLMProvider } from './routellm';

const sdkProvider = createAiSdkProvider();

export function getChatProvider(): ChatProvider {
  const providerEnv = (
    process.env.AI_CHAT_PROVIDER ||
    'gateway'
  ).toLowerCase() as ChatProviderId;

  // #region agent log
  console.log('[chat-pipeline] H3 getChatProvider', { providerEnv });
  // #endregion

  switch (providerEnv) {
    case 'abacus':
      return createAbacusProvider();
    case 'routellm':
      return createRouteLLMProvider();
    case 'ghl':
      return createGhlProvider();
    case 'openai':
    case 'gateway':
    default:
      return sdkProvider;
  }
}

