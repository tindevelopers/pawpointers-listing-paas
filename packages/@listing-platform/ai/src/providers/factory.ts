import type { ChatProvider, ChatProviderId } from './types';
import { createAbacusProvider } from './abacus';
import { createAiSdkProvider } from './ai-sdk';
import { createGhlProvider } from './ghl';

const sdkProvider = createAiSdkProvider();

export function getChatProvider(): ChatProvider {
  const providerEnv = (
    process.env.AI_CHAT_PROVIDER ||
    'gateway'
  ).toLowerCase() as ChatProviderId;

  switch (providerEnv) {
    case 'abacus':
      return createAbacusProvider();
    case 'ghl':
      return createGhlProvider();
    case 'openai':
    case 'gateway':
    default:
      return sdkProvider;
  }
}

