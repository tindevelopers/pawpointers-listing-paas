'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Floating Chat Widget
 *
 * A floating chat bubble that opens a chat interface for AI-powered assistance.
 *
 * CUSTOMIZE: Update the styling and behavior for your platform's branding.
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  /** Position of the chat button */
  position?: 'bottom-right' | 'bottom-left';
  /** Primary color for the button */
  primaryColor?: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Welcome message */
  welcomeMessage?: string;
  /** Title for the chat window */
  title?: string;
}

export function ChatWidget({
  position = 'bottom-right',
  primaryColor = '#3b82f6',
  placeholder = 'Ask a question...',
  welcomeMessage = 'Hi! How can I help you today?',
  title = 'Chat with us',
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldSpeakRef = useRef(false);
  const createMessageId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0 && welcomeMessage) {
      setMessages([
        {
          id: createMessageId(),
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, welcomeMessage]);

  const sendMessage = async (messageOverride?: string) => {
    const userMessage = (messageOverride ?? input).trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setIsLoading(true);

    const assistantMessageId = createMessageId();
    // Add user + placeholder assistant message
    const newUserMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    const newAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage, newAssistantMessage]);

    const updateAssistant = (nextContent: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: nextContent }
            : msg
        )
      );
    };

    try {
      // #region agent log
      console.log('[chat-pipeline] frontend request sent', { url: '/api/chat', messageLen: userMessage?.length });
      // #endregion
      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          conversationId,
          stream: true,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      // #region agent log
      console.log('[chat-pipeline] frontend response', { status: response.status, ok: response.ok, contentType });
      // #endregion

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg =
          (data?.message || data?.error) ?? 'Failed to send message';
        throw new Error(typeof msg === 'string' ? msg : 'Failed to send message');
      }

      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let receivedChunk = false;

        const handleEvent = (eventBlock: string) => {
          const lines = eventBlock.split('\n');
          let eventType = 'message';
          const dataLines: string[] = [];

          for (const line of lines) {
            if (!line || line.startsWith(':')) continue;
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
              continue;
            }
            if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trimStart());
            }
          }

          if (dataLines.length === 0) return;
          const data = dataLines.join('\n');

          if (eventType === 'done') {
            let payload: any = {};
            try {
              payload = JSON.parse(data || '{}');
            } catch {
              payload = {};
            }
            if (payload.sessionId && !sessionId) {
              setSessionId(payload.sessionId);
            }
            if (payload.conversationId) {
              setConversationId(payload.conversationId);
            }
            if (shouldSpeakRef.current && fullResponse) {
              speakText(fullResponse);
              shouldSpeakRef.current = false;
            }
            setIsLoading(false);
            return;
          }

          if (eventType === 'error') {
            let payload: any = {};
            try {
              payload = JSON.parse(data || '{}');
            } catch {
              payload = {};
            }
            throw new Error(payload?.message || 'Streaming failed');
          }

          if (data === '[DONE]') {
            setIsLoading(false);
            return;
          }

          let payload: any;
          try {
            payload = JSON.parse(data || '{}');
          } catch {
            payload = null;
          }
          const text = payload?.text;
          if (typeof text === 'string' && text.length > 0) {
            receivedChunk = true;
            fullResponse += text;
            updateAssistant(fullResponse);
            if (receivedChunk) {
              setIsLoading(false);
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, '\n');
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            handleEvent(part);
          }
        }

        if (shouldSpeakRef.current && fullResponse) {
          speakText(fullResponse);
          shouldSpeakRef.current = false;
        }

        return;
      }

      const data = await response.json().catch(() => ({}));

      updateAssistant(data.message);
      setIsLoading(false);

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      if (shouldSpeakRef.current) {
        speakText(data.message);
        shouldSpeakRef.current = false;
      }
    } catch (error) {
      console.error('Chat error:', error);
      const message =
        error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.';
      updateAssistant(message.startsWith('Sorry,') ? message : `Sorry, ${message}`);
      shouldSpeakRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
      sendMessage(transcript);
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

  const positionClasses =
    position === 'bottom-right' ? 'right-4 bottom-4' : 'left-4 bottom-4';

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed ${positionClasses} z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2`}
        style={{ backgroundColor: primaryColor }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed ${positionClasses} z-40 mb-20 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col`}
          style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div
            className="p-4 text-white font-semibold flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <span>{title}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close chat"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
<div
                className={`px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'max-w-[85%] bg-blue-500 text-white'
                    : 'w-full max-w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-blue-200'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
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
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 text-sm"
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
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: primaryColor }}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
