"use client";

import { useState } from "react";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  providerImage?: string;
}

interface Message {
  id: string;
  sender: "user" | "provider";
  text: string;
  timestamp: Date;
}

export function ChatModal({ isOpen, onClose, providerName, providerImage }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "provider",
      text: "Hi! Thanks for reaching out. How can I help you today?",
      timestamp: new Date(Date.now() - 5 * 60000),
    },
  ]);
  const [messageText, setMessageText] = useState("");

  if (!isOpen) return null;

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: messageText,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setMessageText("");

    // Simulate provider response after a delay
    setTimeout(() => {
      const responses = [
        "That's great! I can definitely help with that.",
        "Let me check my availability for you.",
        "I'd be happy to discuss this further!",
        "What time works best for you?",
        "I have some availability this week.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const providerMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "provider",
        text: randomResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, providerMessage]);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              {providerImage ? (
                <img
                  src={providerImage}
                  alt={providerName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center font-bold">
                  {providerName.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="font-bold">{providerName}</h2>
                <p className="text-xs text-blue-100">Online</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "user"
                        ? "text-blue-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>
    </>
  );
}
