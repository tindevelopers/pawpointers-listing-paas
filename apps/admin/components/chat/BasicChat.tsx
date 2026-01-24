"use client";

import { FormEvent, useState } from "react";
import { useChat } from "ai/react";

/**
 * Basic Chat Component
 * 
 * Simple chat interface that uses the /api/chat endpoint.
 * Works with streaming responses for real-time chat experience.
 */
export function BasicChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    streamProtocol: "data",
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit(event);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Basic AI Chat
        </h2>
        {isLoading && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Thinking...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            Start a conversation by typing a message below.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-indigo-50 text-gray-900 dark:bg-indigo-900/20 dark:text-white ml-auto max-w-[80%]"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 mr-auto max-w-[80%]"
              }`}
            >
              <div className="text-xs font-medium mb-1 opacity-70">
                {message.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {typeof message.content === "string"
                  ? message.content
                  : message.content
                      .map((part) => ("text" in part ? part.text : ""))
                      .join("")}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
          {error.message || "Something went wrong. Please try again."}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/50"
          rows={2}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

