'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/search';

/**
 * AI Chat Interface
 *
 * A prominent chat interface on the home page that allows users to
 * either use classical search or AI-powered chat to find services.
 * Similar to ChatGPT's interface.
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  placeholder?: string;
  welcomeMessage?: string;
  onSearch?: (query: string) => void;
}

export function AIChat({
  placeholder = "Search services, ask a question, or describe what you need...",
  welcomeMessage = "Hi! I can help you find the perfect service provider. You can search directly or describe what you need.",
}: AIChatProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'search' | 'chat'>('search');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldSpeakRef = useRef(false);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize with welcome message for chat mode
  useEffect(() => {
    if (mode === 'chat' && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [mode, messages.length, welcomeMessage]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const query = input.trim();
    setInput('');

    if (mode === 'search') {
      // Perform classical search
      router.push(`/listings?q=${encodeURIComponent(query)}`);
    } else {
      // Send to AI chat
      await sendChatMessage(query);
    }
  };

  const sendChatMessage = async (messageContent: string) => {
    setIsLoading(true);

    // Add user message
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          sessionId,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg =
          (data?.message || data?.error) ?? 'Failed to send message';
        throw new Error(typeof msg === 'string' ? msg : 'Failed to send message');
      }

      // Store session ID for conversation continuity
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        },
      ]);

      if (shouldSpeakRef.current) {
        speakText(data.message);
        shouldSpeakRef.current = false;
      }
    } catch (error) {
      console.error('Chat error:', error);
      const message =
        error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: message.startsWith('Sorry,') ? message : `Sorry, ${message}`,
          timestamp: new Date(),
        },
      ]);
      shouldSpeakRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'search') {
        handleSearch(e as any);
      } else {
        sendChatMessage(input.trim());
        setInput('');
      }
    }
  };

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleMicClick = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setInput('');
      shouldSpeakRef.current = true;
      sendChatMessage(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Mode Selector */}
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => {
              setMode('search');
              setMessages([]);
            }}
            className={`flex-1 py-4 px-6 font-medium transition-colors text-center ${
              mode === 'search'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </div>
          </button>
          <button
            onClick={() => {
              setMode('chat');
              setMessages([
                {
                  role: 'assistant',
                  content: welcomeMessage,
                  timestamp: new Date(),
                },
              ]);
            }}
            className={`flex-1 py-4 px-6 font-medium transition-colors text-center ${
              mode === 'chat'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              AI Chat
            </div>
          </button>
        </div>

        {/* Content Area */}
        {mode === 'search' ? (
          // Search Mode - Full SearchBar
          <div className="p-6">
            <SearchBar
              placeholder="Search services, professions, or providers..."
              showFiltersButton={false}
              className="bg-transparent"
            />
          </div>
        ) : (
          // Chat Mode
          <div className="flex flex-col h-96">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'max-w-[85%] bg-gradient-to-r from-orange-500 to-orange-400 text-white'
                        : 'w-full max-w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start w-full">
                  <div className="w-full max-w-full bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t dark:border-gray-700 p-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 text-sm disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={!isSpeechSupported || isLoading || isSpeaking}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                    isListening
                      ? 'border-red-500 text-red-500'
                      : 'border-gray-300 text-gray-600 hover:text-gray-900'
                  } disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300`}
                  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                  title={
                    isSpeechSupported
                      ? isListening
                        ? 'Stop listening'
                        : 'Start voice input'
                      : 'Voice input not supported in this browser'
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3zm5 10a5 5 0 01-10 0M12 19v4m-4 0h8"
                    />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIChat;
