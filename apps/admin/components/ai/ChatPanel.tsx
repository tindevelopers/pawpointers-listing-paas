"use client";

import { FormEvent } from "react";
import { Message, useChat } from "ai/react";
import clsx from "clsx";

type ToolInvocation = {
  toolName?: string;
  state?: string;
  result?: unknown;
};

function renderContent(message: Message) {
  if (typeof message.content === "string") return message.content;

  return message.content
    .map((part) => ("text" in part ? part.text : ""))
    .join(" ");
}

function renderToolResults(toolInvocations?: ToolInvocation[]) {
  if (!toolInvocations?.length) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200">
      <p className="font-medium text-gray-900 dark:text-white">Citations</p>
      {toolInvocations.map((invocation, idx) => {
        const result = invocation.result as
          | { title?: string; snippet?: string; url?: string; source?: string }[]
          | undefined;
        if (!Array.isArray(result) || result.length === 0) return null;

        return (
          <div key={idx} className="space-y-2">
            {result.map((item, innerIdx) => (
              <div
                key={`${item.title}-${innerIdx}`}
                className="rounded-md border border-gray-200 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-900/70"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {item.title || "Result"}
                </p>
                {item.snippet ? (
                  <p className="text-gray-600 dark:text-gray-300">
                    {item.snippet}
                  </p>
                ) : null}
                <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span>{item.source || "kb"}</span>
                  {item.url ? (
                    <a
                      href={item.url}
                      className="underline decoration-dashed decoration-gray-400 hover:text-indigo-600"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setInput } =
    useChat({
      api: "/api/ai",
      streamProtocol: "data",
    });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit(event);
  };

  const quickPrompts = [
    "Summarize the CRM features in this workspace.",
    "How do I add a new contact and attach a company?",
    "Where do I find billing and subscription settings?",
    "Explain how to add knowledge base content for AI grounding.",
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              AI Assistant
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Grounded answers from your Knowledge Base + Gateway models
            </p>
          </div>
          <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100">
            Streaming
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="rounded-xl border border-gray-200 bg-white p-3 text-left text-sm text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-700/60 dark:hover:bg-gray-800"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                "rounded-2xl border p-3 text-sm shadow-xs dark:border-gray-800",
                message.role === "user"
                  ? "border-indigo-200 bg-indigo-50/60 text-gray-900 dark:border-indigo-800/50 dark:bg-indigo-900/20 dark:text-white"
                  : "border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {message.role === "user" ? "You" : "Assistant"}
              </div>
              <p className="leading-relaxed">{renderContent(message)}</p>
              {renderToolResults((message as any).toolInvocations)}
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
          {error.message || "Something went wrong. Please try again."}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
      >
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about the platform, CRM, billing, or your knowledge base..."
          className="h-24 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Uses AI Gateway; cites knowledge base when relevant.
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {isLoading ? "Generating..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}


