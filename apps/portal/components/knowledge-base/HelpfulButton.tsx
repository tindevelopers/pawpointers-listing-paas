"use client";

import { useState } from "react";
import { HandThumbUpIcon } from "@heroicons/react/24/outline";
import { markDocumentHelpful } from "@/lib/knowledge-base";

interface HelpfulButtonProps {
  documentId: string;
}

export function HelpfulButton({ documentId }: HelpfulButtonProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (submitted || loading) return;

    setLoading(true);
    try {
      await markDocumentHelpful(documentId);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to mark as helpful:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={submitted || loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        submitted
          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <HandThumbUpIcon className="h-5 w-5" />
      {submitted ? "Thank you!" : "Was this helpful?"}
    </button>
  );
}

